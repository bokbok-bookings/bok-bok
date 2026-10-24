import dns from 'dns'
import { MongoClient, MongoClientOptions } from 'mongodb'

// Ensure Node's DNS resolver can query MongoDB Atlas records if needed
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
} catch (_e) {
  // Ignore if not supported in runtime
}

const uri = process.env.MONGODB_URI

const options: MongoClientOptions = {
  maxPoolSize: 10,
  minPoolSize: 1,
  serverSelectionTimeoutMS: 20000,
  connectTimeoutMS: 20000,
  socketTimeoutMS: 45000,
  retryWrites: true,
  retryReads: true,
}

let client: MongoClient
let clientPromise: Promise<MongoClient> | null = null

let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>
}

export function getMongoClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not set in environment')
  }

  if (globalWithMongo._mongoClientPromise) {
    return globalWithMongo._mongoClientPromise
  }

  client = new MongoClient(process.env.MONGODB_URI, options)
  globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
    globalWithMongo._mongoClientPromise = undefined
    throw err
  })

  return globalWithMongo._mongoClientPromise
}

export default getMongoClientPromise
