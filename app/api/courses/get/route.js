import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

export async function GET(request) {
  try {
    await client.connect();
    const db = client.db('lucombo'); // Replace with your database name
    const courses = db.collection('Courses');

    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('schoolId');

    const query = schoolId ? { schoolId: schoolId } : {};

    const data = await courses.find(query).toArray();

    return Response.json({ success: true, data: data });
  } catch (e) {
    console.error(e);
    return Response.json({ success: false, error: e.message });
  } finally {
    await client.close();
  }
}
