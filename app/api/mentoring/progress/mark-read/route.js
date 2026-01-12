// app/api/mentoring/progress/mark-read/route.js
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

// PATCH /api/mentoring/progress/mark-read
// body: { mentorshipId }
export async function PATCH(request) {
  try {
    const body = await request.json()
    const mentorshipId = body?.mentorshipId
    const mentorshipOid = oid(mentorshipId)
    if (!mentorshipOid) {
      return NextResponse.json({ error: 'mentorshipId inválido.' }, { status: 400 })
    }

    const db = await getDb()
    const col = db.collection('mentoring_progress')

    await col.updateMany(
      { mentorshipId: mentorshipOid, studentUnread: true },
      { $set: { studentUnread: false } }
    )

    return NextResponse.json({ message: 'Progresso marcado como lido.' }, { status: 200 })
  } catch (error) {
    console.error('Erro ao marcar progresso como lido:', error)
    return NextResponse.json({ error: 'Erro ao marcar como lido.' }, { status: 500 })
  }
}
