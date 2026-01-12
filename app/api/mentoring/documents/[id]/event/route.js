// app/api/mentoring/documents/[id]/event/route.js
// Regista eventos de visualização/download (aluno/professor) e marca como lido.

import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) return { _id: new ObjectId(id) }
  return { _id: id }
}

// PATCH /api/mentoring/documents/[id]/event
// body: { role: 'student'|'teacher', action: 'view'|'download'|'markRead' }
export async function PATCH(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const role = (body?.role || 'student').toString()
    const action = (body?.action || 'view').toString()

    if (!['student', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'role inválido.' }, { status: 400 })
    }
    if (!['view', 'download', 'markRead'].includes(action)) {
      return NextResponse.json({ error: 'action inválida.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const existing = await col.findOne(buildFilterById(id))
    if (!existing) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
    }

    const now = new Date()
    const $set = { updatedAt: now }

    // Helper: quando alguém abre/baixa, isso também marca como lido.
    const shouldMarkRead = action === 'markRead' || action === 'view' || action === 'download'

    if (role === 'teacher') {
      if (action === 'view') $set.teacherViewedAt = now
      if (action === 'download') $set.teacherDownloadedAt = now
      if (shouldMarkRead) {
        $set.teacherUnread = false
        $set.teacherLastOpenedAt = now
      }
    } else {
      if (action === 'view') $set.studentViewedAt = now
      if (action === 'download') $set.studentDownloadedAt = now
      if (shouldMarkRead) {
        // Só faz sentido marcar como lido o que veio do professor (recursos/correções/feedback)
        // mas para simplificar, marcamos qualquer doc como lido se estiver studentUnread.
        $set.studentUnread = false
      }
    }

    const result = await col.findOneAndUpdate(buildFilterById(id), { $set }, { returnDocument: 'after' })
    const doc = result.value || result

    return NextResponse.json(
      {
        message: 'Evento registado.',
        document: {
          id: doc._id.toString(),
          teacherUnread: !!doc.teacherUnread,
          studentUnread: !!doc.studentUnread,
          teacherViewedAt: doc.teacherViewedAt || null,
          teacherDownloadedAt: doc.teacherDownloadedAt || null,
          studentViewedAt: doc.studentViewedAt || null,
          studentDownloadedAt: doc.studentDownloadedAt || null,
          updatedAt: doc.updatedAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao registar evento do documento:', error)
    return NextResponse.json({ error: 'Erro ao registar evento.' }, { status: 500 })
  }
}
