// app/api/mentoring/meetings/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export const runtime = 'nodejs'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) return { _id: new ObjectId(id) }
  return { _id: id }
}

// PATCH /api/mentoring/meetings/[id]
// body: { action: 'accept'|'reject'|'cancel'|'markTeacherRead'|'markStudentRead' }
export async function PATCH(request, { params }) {
  try {
    const { id } = await params
    const body = await request.json()
    const action = (body?.action || '').toString()

    const db = await getDb()
    const col = db.collection('mentoring_meetings')

    const existing = await col.findOne(buildFilterById(id))
    if (!existing) {
      return NextResponse.json({ error: 'Reunião não encontrada.' }, { status: 404 })
    }

    const now = new Date()
    const $set = { updatedAt: now }

    if (action === 'accept') {
      $set.status = 'accepted'
      $set.acceptedAt = now
      $set.teacherUnread = false
      $set.studentUnread = true
    } else if (action === 'reject') {
      $set.status = 'rejected'
      $set.rejectedAt = now
      $set.teacherUnread = false
      $set.studentUnread = true
    } else if (action === 'cancel') {
      $set.status = 'cancelled'
      $set.cancelledAt = now
      // quem cancelou? por simplicidade marcamos os 2 como notificados
      $set.teacherUnread = true
      $set.studentUnread = true
    } else if (action === 'markTeacherRead') {
      $set.teacherUnread = false
    } else if (action === 'markStudentRead') {
      $set.studentUnread = false
    } else {
      return NextResponse.json({ error: 'Acção inválida.' }, { status: 400 })
    }

    const result = await col.findOneAndUpdate(
      buildFilterById(id),
      { $set },
      { returnDocument: 'after' }
    )

    const m = result.value || result

    return NextResponse.json(
      {
        message: 'Reunião actualizada.',
        meeting: {
          id: m._id.toString(),
          mentorshipId: m.mentorshipId?.toString(),
          alunoId: m.alunoId?.toString(),
          requestedBy: m.requestedBy || 'student',
          datetime: m.datetime || null,
          topic: m.topic || '',
          description: m.description || '',
          status: m.status || 'pending',
          teacherUnread: !!m.teacherUnread,
          studentUnread: !!m.studentUnread,
          createdAt: m.createdAt || null,
          updatedAt: m.updatedAt || null,
          acceptedAt: m.acceptedAt || null,
          rejectedAt: m.rejectedAt || null,
          cancelledAt: m.cancelledAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao actualizar reunião:', error)
    return NextResponse.json({ error: 'Erro ao actualizar reunião.' }, { status: 500 })
  }
}
