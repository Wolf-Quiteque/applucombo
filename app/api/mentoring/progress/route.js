// app/api/mentoring/progress/route.js
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

// GET /api/mentoring/progress?mentorshipId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorshipId = searchParams.get('mentorshipId')

    const mentorshipOid = oid(mentorshipId)
    if (!mentorshipOid) {
      return NextResponse.json({ error: 'mentorshipId inválido.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('mentoring_progress')

    const docs = await col
      .find({ mentorshipId: mentorshipOid })
      .sort({ createdAt: -1 })
      .toArray()

    const progress = docs.map(p => ({
      id: p._id.toString(),
      mentorshipId: p.mentorshipId?.toString(),
      alunoId: p.alunoId?.toString(),
      note: p.note || '',
      createdAt: p.createdAt || null,
      studentUnread: !!p.studentUnread
    }))

    return NextResponse.json({ progress }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar progresso:', error)
    return NextResponse.json({ error: 'Erro ao carregar progresso.' }, { status: 500 })
  }
}

// POST /api/mentoring/progress
// body: { mentorshipId, alunoId, note }
export async function POST(request) {
  try {
    const body = await request.json()
    const { mentorshipId, alunoId, note } = body || {}

    const mentorshipOid = oid(mentorshipId)
    const alunoOid = oid(alunoId)
    if (!mentorshipOid || !alunoOid) {
      return NextResponse.json({ error: 'mentorshipId/alunoId inválido.' }, { status: 400 })
    }

    if (!note || !note.toString().trim()) {
      return NextResponse.json({ error: 'A nota é obrigatória.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('mentoring_progress')

    const now = new Date()
    const doc = {
      mentorshipId: mentorshipOid,
      alunoId: alunoOid,
      note: note.toString().trim(),
      createdAt: now,
      studentUnread: true
    }

    const ins = await col.insertOne(doc)

    // actualiza fila do professor, mas sem marcar como pendente; é actividade do professor.
    await db.collection('mentoring_mentorships').updateOne(
      { _id: mentorshipOid },
      { $set: { updatedAt: now } }
    )

    return NextResponse.json(
      {
        message: 'Nota de progresso adicionada.',
        progress: {
          id: ins.insertedId.toString(),
          mentorshipId,
          alunoId,
          note: doc.note,
          createdAt: doc.createdAt,
          studentUnread: true
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar progresso:', error)
    return NextResponse.json({ error: 'Erro ao criar nota de progresso.' }, { status: 500 })
  }
}
