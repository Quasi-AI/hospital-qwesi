import http from 'http';
import { URL } from 'url';
import { config } from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws';
import { RealtimeEvent, verifyRealtimeToken } from '../lib/realtime';

config({ path: '.env.local' });
config();

type Client = {
  socket: WebSocket;
  subjects: Set<string>;
  isAlive: boolean;
};

let realtimeServer: http.Server | null = null;
let heartbeat: NodeJS.Timeout | null = null;
const clients = new Set<Client>();

function getSecret() {
  return process.env.REALTIME_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-here';
}

function sendJson(socket: WebSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function matchesTarget(client: Client, targets: string[]) {
  if (!targets.length) return false;
  if (targets.includes('all')) return true;
  return targets.some((target) => client.subjects.has(target));
}

function broadcast(event: RealtimeEvent) {
  let delivered = 0;

  for (const client of clients) {
    if (matchesTarget(client, event.targets)) {
      sendJson(client.socket, event);
      delivered++;
    }
  }

  return delivered;
}

function readRequestBody(request: http.IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error('Payload too large'));
        request.destroy();
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

export async function startRealtimeServer() {
  if (realtimeServer) return realtimeServer;

  const port = Number(process.env.REALTIME_PORT || 3001);
  const server = http.createServer(async (request, response) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);

    if (request.method === 'GET' && requestUrl.pathname === '/health') {
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ ok: true, clients: clients.size }));
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/emit') {
      if (request.headers['x-realtime-secret'] !== getSecret()) {
        response.writeHead(401, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }

      try {
        const body = await readRequestBody(request);
        const event = JSON.parse(body) as RealtimeEvent;
        if (!event.type || !Array.isArray(event.targets)) {
          response.writeHead(400, { 'Content-Type': 'application/json' });
          response.end(JSON.stringify({ error: 'Invalid realtime event' }));
          return;
        }

        const delivered = broadcast(event);
        response.writeHead(202, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ delivered }));
      } catch (error) {
        response.writeHead(400, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid payload' }));
      }
      return;
    }

    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: 'Not found' }));
  });

  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket, request) => {
    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const payload = verifyRealtimeToken(requestUrl.searchParams.get('token'));

    if (!payload) {
      socket.close(1008, 'Invalid token');
      return;
    }

    const client: Client = {
      socket,
      subjects: new Set(payload.subjects),
      isAlive: true,
    };
    clients.add(client);
    sendJson(socket, {
      type: 'connection.ready',
      subjects: payload.subjects,
      createdAt: new Date().toISOString(),
    });

    socket.on('pong', () => {
      client.isAlive = true;
    });

    socket.on('close', () => {
      clients.delete(client);
    });
  });

  heartbeat = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        client.socket.terminate();
        clients.delete(client);
        continue;
      }
      client.isAlive = false;
      client.socket.ping();
    }
  }, 30_000);

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve();
    });
  });

  realtimeServer = server;
  console.log(`[Realtime] WebSocket server listening on ws://localhost:${port}/ws`);
  return server;
}

export async function stopRealtimeServer(server = realtimeServer) {
  if (heartbeat) clearInterval(heartbeat);
  heartbeat = null;

  for (const client of clients) {
    client.socket.close(1001, 'Server shutting down');
  }
  clients.clear();

  await new Promise<void>((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });

  if (server === realtimeServer) realtimeServer = null;
}

if (require.main === module) {
  startRealtimeServer().catch((error) => {
    console.error('[Realtime] Failed to start:', error);
    process.exit(1);
  });

  const stop = async () => {
    await stopRealtimeServer();
    process.exit(0);
  };

  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
