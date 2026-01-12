// app/api/mentoring/mentorships/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'
import { normalizeTipoKey } from '@/app/lib/mentoringConfig'

export const runtime = 'nodejs'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) return { _id: new ObjectId(id) }
  return { _id: id }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()

    const updates = {}
    if (body?.email !== undefined) updates.email = (body.email || '').toString().trim()
    if (body?.tipoKey !== undefined) updates.tipoKey = normalizeTipoKey(body.tipoKey)
    if (body?.anoInicioCurso !== undefined) {
      updates.anoInicioCurso = body.anoInicioCurso ? Number(body.anoInicioCurso) : null
    }
    if (body?.anoInicioMentoria !== undefined) {
      updates.anoInicioMentoria = body.anoInicioMentoria ? Number(body.anoInicioMentoria) : null
    }
    if (body?.titulo !== undefined) updates.titulo = (body.titulo || '').toString().trim()

    // Controlo de fila do professor (pending/done)
    let queueStatusChanged = false
    if (body?.teacherQueueStatus !== undefined) {
      const s = (body.teacherQueueStatus || '').toString()
      if (s === 'pending' || s === 'done') {
        updates.teacherQueueStatus = s
        queueStatusChanged = true
      }
    }

    const now = new Date()
    updates.updatedAt = now
    if (queueStatusChanged) updates.teacherQueueUpdatedAt = now

    const db = await getDb()
    const col = db.collection('mentoring_mentorships')

    const result = await col.findOneAndUpdate(
      buildFilterById(id),
      { $set: updates },
      { returnDocument: 'after' }
    )

    const m = result.value || result
    if (!m) {
      return NextResponse.json({ error: 'Mentoria não encontrada.' }, { status: 404 })
    }

    return NextResponse.json(
      {
        message: 'Mentoria actualizada.',
        mentorship: {
          id: m._id.toString(),
          alunoId: m.alunoId?.toString(),
          email: m.email || '',
          tipoKey: normalizeTipoKey(m.tipoKey),
          anoInicioCurso: m.anoInicioCurso ?? null,
          anoInicioMentoria: m.anoInicioMentoria ?? null,
          titulo: m.titulo || '',
          teacherQueueStatus: m.teacherQueueStatus || 'pending',
          teacherQueueUpdatedAt: m.teacherQueueUpdatedAt || null,
          createdAt: m.createdAt || null,
          updatedAt: m.updatedAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao actualizar mentoria:', error)
    return NextResponse.json(
      { error: 'Erro ao actualizar mentoria.' },
      { status: 500 }
    )
  }
}
