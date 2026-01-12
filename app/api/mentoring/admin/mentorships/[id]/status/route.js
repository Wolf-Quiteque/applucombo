// app/api/mentoring/admin/mentorships/[id]/status/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) return { _id: new ObjectId(id) }
  return { _id: id }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const status = (body?.teacherQueueStatus || '').toString()
    if (status !== 'pending' && status !== 'done') {
      return NextResponse.json({ error: 'teacherQueueStatus inválido.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('mentoring_mentorships')

    const now = new Date()
    const result = await col.findOneAndUpdate(
      buildFilterById(id),
      {
        $set: {
          teacherQueueStatus: status,
          updatedAt: now,
          ...(status === 'done' ? { teacherLastReviewedAt: now } : {})
        }
      },
      { returnDocument: 'after' }
    )

    const ms = result.value || result
    if (!ms) {
      return NextResponse.json({ error: 'Mentoria não encontrada.' }, { status: 404 })
    }

    return NextResponse.json(
      {
        message: 'Estado actualizado.',
        mentorship: {
          id: ms._id.toString(),
          teacherQueueStatus: ms.teacherQueueStatus || status,
          updatedAt: ms.updatedAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao actualizar estado (admin):', error)
    return NextResponse.json({ error: 'Erro ao actualizar estado.' }, { status: 500 })
  }
}
