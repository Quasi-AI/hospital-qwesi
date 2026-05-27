import { MongoClient } from 'mongodb';
import { resolveMongoSrvUri } from './mongodb-dns';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';
const options = {};

let clientPromise: Promise<MongoClient> | undefined;

function getMongoClient() {
  if (process.env.NODE_ENV === 'development') {
    // Preserve the connection across HMR, but create it lazily to avoid
    // unhandled startup rejections when DNS or the network is not ready.
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = resolveMongoSrvUri(uri).then((resolvedUri) =>
        new MongoClient(resolvedUri, options).connect()
      );
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = resolveMongoSrvUri(uri).then((resolvedUri) =>
      new MongoClient(resolvedUri, options).connect()
    );
  }
  return clientPromise;
}

export default getMongoClient;
