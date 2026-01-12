// app/api/mentoring/meetings/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'

function oid(id) {
  if (!id) return null
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

// GET /api/mentoring/meetings?mentorshipId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorshipId = searchParams.get('mentorshipId')

    const mentorshipOid = oid(mentorshipId)
    if (!mentorshipOid) {
      return NextResponse.json({ error: 'mentorshipId inválido.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('mentoring_meetings')

    const docs = await col
      .find({ mentorshipId: mentorshipOid })
      .sort({ datetime: -1, createdAt: -1 })
      .toArray()

    const meetings = docs.map(m => ({
      id: m._id.toString(),
      mentorshipId: m.mentorshipId?.toString(),
      alunoId: m.alunoId?.toString(),
      requestedBy: m.requestedBy || 'student',
      datetime: m.datetime || null,
      topic: m.topic || '',
      status: m.status || 'pending',
      teacherUnread: !!m.teacherUnread,
      studentUnread: !!m.studentUnread,
      createdAt: m.createdAt || null,
      updatedAt: m.updatedAt || null,
      acceptedAt: m.acceptedAt || null,
      rejectedAt: m.rejectedAt || null,
      cancelledAt: m.cancelledAt || null
    }))

    return NextResponse.json({ meetings }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar reuniões:', error)
    return NextResponse.json({ error: 'Erro ao carregar reuniões.' }, { status: 500 })
  }
}

// POST /api/mentoring/meetings
// body: { mentorshipId, alunoId, requestedBy: 'student'|'teacher', datetime, topic, allMentorships? }
export async function POST(request) {
  try {
    const body = await request.json()
    const { mentorshipId, alunoId, requestedBy, datetime, topic, allMentorships } = body || {}

    const db = await getDb()

    const now = new Date()
    const reqBy = requestedBy === 'teacher' ? 'teacher' : 'student'

    // Criar para TODOS (opção do professor)
    if (allMentorships) {
      const mentorships = await db
        .collection('mentoring_mentorships')
        .find({})
        .project({ _id: 1, alunoId: 1 })
        .toArray()

      const docs = mentorships.map(ms => ({
        mentorshipId: ms._id,
        alunoId: ms.alunoId,
        requestedBy: 'teacher',
        datetime: datetime ? new Date(datetime) : null,
        topic: (topic || '').toString().trim(),
        status: 'pending',
        teacherUnread: false,
        studentUnread: true,
        createdAt: now,
        updatedAt: now
      }))

      if (docs.length) {
        await db.collection('mentoring_meetings').insertMany(docs)
      }

      return NextResponse.json(
        { message: 'Reuniões criadas para todos os alunos.', count: docs.length },
        { status: 201 }
      )
    }

    const mentorshipOid = oid(mentorshipId)
    const alunoOid = oid(alunoId)
    if (!mentorshipOid || !alunoOid) {
      return NextResponse.json({ error: 'mentorshipId/alunoId inválido.' }, { status: 400 })
    }

    const doc = {
      mentorshipId: mentorshipOid,
      alunoId: alunoOid,
      requestedBy: reqBy,
      datetime: datetime ? new Date(datetime) : null,
      topic: (topic || '').toString().trim(),
      status: 'pending',
      teacherUnread: reqBy === 'student',
      studentUnread: reqBy === 'teacher',
      createdAt: now,
      updatedAt: now
    }

    const ins = await db.collection('mentoring_meetings').insertOne(doc)

    // mexeu em reunião -> colocar na fila do professor (pendente)
    await db.collection('mentoring_mentorships').updateOne(
      { _id: mentorshipOid },
      {
        $set: {
          teacherQueueStatus: 'pending',
          teacherQueueUpdatedAt: now,
          updatedAt: now
        }
      }
    )

    return NextResponse.json(
      {
        message: 'Reunião criada.',
        meeting: {
          id: ins.insertedId.toString(),
          mentorshipId,
          alunoId,
          requestedBy: doc.requestedBy,
          datetime: doc.datetime,
          topic: doc.topic,
          status: doc.status,
          createdAt: doc.createdAt
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar reunião:', error)
    return NextResponse.json({ error: 'Erro ao criar reunião.' }, { status: 500 })
  }
}
