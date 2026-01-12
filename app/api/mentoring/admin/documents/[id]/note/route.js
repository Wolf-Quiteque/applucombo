// app/api/mentoring/admin/documents/[id]/note/route.js
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
    const { id } = params
    const body = await request.json()
    const teacherNote = (body?.teacherNote || '').toString()

    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const now = new Date()
    const result = await col.findOneAndUpdate(
      buildFilterById(id),
      {
        $set: {
          teacherNote,
          teacherNoteUpdatedAt: now,
          updatedAt: now,
          // quando o professor adiciona feedback, o aluno deve ser notificado
          studentUnread: true
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
        message: 'Nota do professor actualizada.',
        document: {
          id: doc._id.toString(),
          teacherNote: doc.teacherNote || '',
          updatedAt: doc.updatedAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao actualizar nota do professor:', error)
    return NextResponse.json(
      { error: 'Erro ao guardar a nota do professor.' },
      { status: 500 }
    )
  }
}
