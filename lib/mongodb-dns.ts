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

function resolveSrv(hostname: string) {
  return new Promise<dns.SrvRecord[]>((resolve, reject) => {
    dns.resolveSrv(hostname, (error, addresses) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(addresses);
    });
  });
}

function resolveTxt(hostname: string) {
  return new Promise<string[][]>((resolve, reject) => {
    dns.resolveTxt(hostname, (error, records) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(records);
    });
  });
}

export async function resolveMongoSrvUri(uri: string) {
  if (!uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  configureMongoSrvDns(uri);

  const parsed = new URL(uri);
  const srvRecords = await resolveSrv(`_mongodb._tcp.${parsed.hostname}`);
  const seeds = srvRecords
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((record) => `${record.name}:${record.port}`)
    .join(',');

  const params = new URLSearchParams();

  try {
    const txtRecords = await resolveTxt(parsed.hostname);
    for (const record of txtRecords) {
      const txtParams = new URLSearchParams(record.join(''));
      txtParams.forEach((value, key) => params.set(key, value));
    }
  } catch (error: any) {
    if (error?.code !== 'ENODATA' && error?.code !== 'ENOTFOUND') {
      throw error;
    }
  }

  parsed.searchParams.forEach((value, key) => params.set(key, value));
  if (!params.has('tls') && !params.has('ssl')) {
    params.set('tls', 'true');
  }

  const auth = parsed.username
    ? `${parsed.username}${parsed.password ? `:${parsed.password}` : ''}@`
    : '';
  const path = parsed.pathname || '/';
  const query = params.toString();

  return `mongodb://${auth}${seeds}${path}${query ? `?${query}` : ''}`;
}
