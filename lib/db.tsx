import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import { ObjectId } from "mongodb";

export const collections: { chunks?: mongoDB.Collection } = {}

export class Chunk {
  constructor(public header: string, public chunk: string, public id?: ObjectId) { }
};


export async function connectToDatabase(document_name: string) {
  const DB_CONN_STRING = 'mongodb+srv://svott:Mongo1234@cluster0.v1wrvyg.mongodb.net/?retryWrites=true&w=majority';
  const COLLECTION_NAME = document_name;
  const DB_NAME = 'LavaLabDB';
  // const DB_CONN_STRING = process.env.DB_CONN_STRING;
  // const COLLECTION_NAME = process.env.COLLECTION_NAME;
  // const DB_NAME = process.env.DB_NAME;
  // dotenv.config();

  const client: mongoDB.MongoClient = new mongoDB.MongoClient(DB_CONN_STRING!);

  await client.connect();

  const db: mongoDB.Db = client.db(DB_NAME);

  const myCollection: mongoDB.Collection = db.collection(COLLECTION_NAME!);

  collections.chunks = myCollection;
  const docs = (await collections.chunks.find({}).toArray());
  let chunks = [];
  let headers = [];
  for (let i = 0; i < docs.length; ++i) {
    headers.push(docs[i].header);
    chunks.push(docs[i].chunk);
  }
  let prevHeader = "";
  let part = 1;
  for (let i = 0; i < headers.length; ++i) {
    if (prevHeader == headers[i]) {
      // insert part
      part++;
      headers[i] += " Part " + part.toString();
    } else {
      prevHeader = headers[i];
      part = 1;
    }
  }

  return [headers, chunks];
}
