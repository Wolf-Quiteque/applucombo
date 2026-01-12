// app/api/mentoring/questions/route.js
// Perguntas por mentoria (student/teacher unread + notificações)

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

// GET /api/mentoring/questions?alunoId=...&mentorshipId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('alunoId')
    const mentorshipId = searchParams.get('mentorshipId')

    const alunoOid = oid(alunoId)
    const mentorshipOid = oid(mentorshipId)

    if (!alunoOid) {
      return NextResponse.json({ error: 'alunoId é obrigatório e deve ser válido.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('perguntas')

    const filter = { alunoId: alunoOid }
    if (mentorshipId) {
      if (!mentorshipOid) return NextResponse.json({ error: 'mentorshipId inválido.' }, { status: 400 })
      filter.mentorshipId = mentorshipOid
    }

    const docs = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray()

    const perguntas = docs.map(q => ({
      id: q._id.toString(),
      alunoId: q.alunoId?.toString(),
      mentorshipId: q.mentorshipId?.toString() || null,
      pergunta: q.pergunta || '',
      detalhe: q.detalhe || '',
      resposta: q.resposta || '',
      respondida: !!q.respondida,
      teacherUnread: !!q.teacherUnread,
      studentUnread: !!q.studentUnread,
      createdAt: q.createdAt || null,
      updatedAt: q.updatedAt || null,
      respondidaEm: q.respondidaEm || null
    }))

    return NextResponse.json({ perguntas }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar perguntas:', error)
    return NextResponse.json({ error: 'Erro ao carregar perguntas.' }, { status: 500 })
  }
}

// POST /api/mentoring/questions
// body: { alunoId, mentorshipId?, pergunta, detalhe? }
export async function POST(request) {
  try {
    const body = await request.json()
    const { alunoId, mentorshipId, pergunta, detalhe } = body || {}

    const alunoOid = oid(alunoId)
    if (!alunoOid) {
      return NextResponse.json({ error: 'alunoId inválido.' }, { status: 400 })
    }

    if (!pergunta || !pergunta.toString().trim()) {
      return NextResponse.json({ error: 'Preencha pelo menos a pergunta.' }, { status: 400 })
    }

    const db = await getDb()

    // mentorshipId pode vir vazio (compatibilidade). Pegamos a mais recente do aluno.
    let mentorshipOid = oid(mentorshipId)
    if (!mentorshipOid) {
      const last = await db
        .collection('mentoring_mentorships')
        .find({ alunoId: alunoOid })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(1)
        .toArray()
        .then(arr => arr[0])

      if (last?._id) mentorshipOid = last._id
    }

    if (!mentorshipOid) {
      return NextResponse.json({ error: 'mentorshipId inválido (não foi possível inferir).' }, { status: 400 })
    }

    const col = db.collection('perguntas')
    const now = new Date()
    const doc = {
      alunoId: alunoOid,
      mentorshipId: mentorshipOid,
      pergunta: pergunta.toString().trim(),
      detalhe: (detalhe || '').toString(),
      resposta: '',
      respondida: false,
      teacherUnread: true,
      studentUnread: false,
      createdAt: now,
      updatedAt: now,
      respondidaEm: null
    }

    const result = await col.insertOne(doc)

    // Actividade do aluno -> mentoria fica pendente para o professor
    await db.collection('mentoring_mentorships').updateOne(
      { _id: mentorshipOid },
      { $set: { teacherQueueStatus: 'pending', teacherQueueUpdatedAt: now, updatedAt: now } }
    )

    return NextResponse.json(
      {
        message: 'Pergunta enviada ao professor.',
        pergunta: {
          id: result.insertedId.toString(),
          alunoId: alunoId,
          mentorshipId: mentorshipOid.toString(),
          pergunta: doc.pergunta,
          detalhe: doc.detalhe,
          resposta: doc.resposta,
          respondida: false,
          teacherUnread: true,
          studentUnread: false,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          respondidaEm: null
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar pergunta:', error)
    return NextResponse.json({ error: 'Erro ao enviar a pergunta.' }, { status: 500 })
  }
}
