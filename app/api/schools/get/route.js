import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request) {
  try {
    await client.connect();
    const db = client.db('lucombo'); // Replace with your database name
    const schools = db.collection('Schools');

    const data = await schools.find().toArray();

    return Response.json({ success: true, data: data });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: e.message });
  } finally {
    await client.close();
  }
}
