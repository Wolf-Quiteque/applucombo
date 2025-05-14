import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function POST(request) {
  try {
    await client.connect();
    const db = client.db('lucombo'); // Replace with your database name
    const courses = db.collection('Courses');

    const data = await request.json();
    const result = await courses.insertOne(data);

    return Response.json({ success: true, data: result });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: e.message });
  } finally {
    await client.close();
  }
}
