import dns from 'dns';

let configured = false;

export function configureMongoSrvDns(uri: string) {
  if (configured || !uri.startsWith('mongodb+srv://')) {
    return;
  }

  const servers = (process.env.MONGODB_DNS_SERVERS || '8.8.8.8,1.1.1.1')
    .split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
    configured = true;
  }
}
