// app/api/mentoring/admin/documents/[id]/opened/route.js
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/app/lib/mongodb'

export const runtime = 'nodejs'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) return { _id: new ObjectId(id) }
  return { _id: id }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const now = new Date()
    const result = await col.findOneAndUpdate(
      buildFilterById(id),
      {
        $set: {
          teacherUnread: false,
          teacherLastOpenedAt: now,
          updatedAt: now
        }
      },
      { returnDocument: 'after' }
    )

    const doc = result.value || result
    if (!doc) {
      return NextResponse.json(
        { error: 'Documento não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        message: 'Marcado como aberto.',
        document: {
          id: doc._id.toString(),
          teacherUnread: !!doc.teacherUnread,
          teacherLastOpenedAt: doc.teacherLastOpenedAt || null,
          updatedAt: doc.updatedAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao marcar como aberto:', error)
    return NextResponse.json(
      { error: 'Erro ao actualizar estado.' },
      { status: 500 }
    )
  }
}
