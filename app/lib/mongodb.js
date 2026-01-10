// app/lib/mongodb.js
import { MongoClient } from 'mongodb'

if (!process.env.MONGODB_URI) {
  throw new Error('Defina a variável de ambiente MONGODB_URI')
}

const uri = process.env.MONGODB_URI
const options = {}

let client
let clientPromise

if (!global._mongoClientPromise) {
  client = new MongoClient(uri, options)
  global._mongoClientPromise = client.connect()
}

clientPromise = global._mongoClientPromise

export async function getDb() {
  const client = await clientPromise
  // Permite configurar a DB via env (fallback para o nome antigo)
  const dbName = process.env.MONGODB_DB || 'educational_platform'
  return client.db(dbName)
}
