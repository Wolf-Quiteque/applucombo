// app/api/mentoring/questions/[id]/route.js
// Actualiza resposta e flags de notificações.

import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) return { _id: new ObjectId(id) }
  return { _id: id }
}

async function updateQuestion(request, params) {
  const { id } = params
  const body = await request.json()

  const action = (body?.action || '').toString() // markTeacherRead|markStudentRead|''
  const resposta = body?.resposta

  const db = await getDb()
  const col = db.collection('perguntas')

  const existing = await col.findOne(buildFilterById(id))
  if (!existing) {
    return NextResponse.json({ error: 'Pergunta não encontrada.' }, { status: 404 })
  }

  const now = new Date()
  const $set = { updatedAt: now }

  if (action === 'markTeacherRead') {
    $set.teacherUnread = false
  } else if (action === 'markStudentRead') {
    $set.studentUnread = false
  } else if (typeof resposta === 'string') {
    const text = resposta.toString()
    $set.resposta = text
    const answered = text.trim().length > 0
    $set.respondida = answered
    $set.respondidaEm = answered ? now : null

    // professor respondeu -> aluno deve ser notificado
    $set.teacherUnread = false
    $set.studentUnread = answered
  } else {
    return NextResponse.json({ error: 'Nada para actualizar.' }, { status: 400 })
  }

  const result = await col.findOneAndUpdate(buildFilterById(id), { $set }, { returnDocument: 'after' })
  const q = result.value || result

  return NextResponse.json(
    {
      message: 'Pergunta actualizada.',
      pergunta: {
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
      }
    },
    { status: 200 }
  )
}

export async function PATCH(request, { params }) {
  try {
    return await updateQuestion(request, params)
  } catch (error) {
    console.error('Erro ao actualizar pergunta:', error)
    return NextResponse.json({ error: 'Erro ao actualizar a pergunta.' }, { status: 500 })
  }
}

// Compatibilidade (algum código antigo usa PUT)
export async function PUT(request, { params }) {
  return PATCH(request, { params })
}
