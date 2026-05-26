import { MongoClient } from 'mongodb';
import { configureMongoSrvDns } from './mongodb-dns';

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-doc';
const options = {};

configureMongoSrvDns(uri);

let clientPromise: Promise<MongoClient> | undefined;

function getMongoClient() {
  if (process.env.NODE_ENV === 'development') {
    // Preserve the connection across HMR, but create it lazily to avoid
    // unhandled startup rejections when DNS or the network is not ready.
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri, options).connect();
    }
    return global._mongoClientPromise;
  }

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, options).connect();
  }
  return clientPromise;
}

export default getMongoClient;
