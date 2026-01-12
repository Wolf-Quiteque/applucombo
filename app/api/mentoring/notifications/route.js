// app/api/mentoring/notifications/route.js
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

// GET /api/mentoring/notifications?role=student|teacher&alunoId=...&mentorshipId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = (searchParams.get('role') || 'student').toString()
    const alunoId = searchParams.get('alunoId')
    const mentorshipId = searchParams.get('mentorshipId')

    const db = await getDb()

    const mentorshipOid = mentorshipId ? oid(mentorshipId) : null
    const alunoOid = alunoId ? oid(alunoId) : null

    const items = []

    if (role === 'teacher') {
      // Documentos do aluno (novos/actualizados)
      const docFilter = {
        teacherUnread: true,
        ...(mentorshipOid ? { mentorshipId: mentorshipOid } : {})
      }

      const unreadDocs = await db
        .collection('mentoring_documents')
        .find(docFilter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .toArray()

      unreadDocs.forEach(d => {
        items.push({
          type: 'document',
          mentorshipId: d.mentorshipId?.toString(),
          alunoId: d.alunoId?.toString(),
          title: 'Novo documento/nota',
          message: `${(d.type || '').toString().toUpperCase()} – ${d.original?.filename || 'Documento'}`,
          createdAt: d.updatedAt || d.createdAt || null,
          refId: d._id.toString()
        })
      })

      const qFilter = {
        teacherUnread: true,
        ...(mentorshipOid ? { mentorshipId: mentorshipOid } : {})
      }
      const unreadQuestions = await db
        .collection('perguntas')
        .find(qFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()

      unreadQuestions.forEach(q => {
        items.push({
          type: 'question',
          mentorshipId: q.mentorshipId?.toString(),
          alunoId: q.alunoId?.toString(),
          title: 'Nova pergunta',
          message: q.pergunta || 'Pergunta',
          createdAt: q.createdAt || null,
          refId: q._id.toString()
        })
      })

      const mFilter = {
        teacherUnread: true,
        ...(mentorshipOid ? { mentorshipId: mentorshipOid } : {})
      }
      const unreadMeetings = await db
        .collection('mentoring_meetings')
        .find(mFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .toArray()

      unreadMeetings.forEach(m => {
        items.push({
          type: 'meeting',
          mentorshipId: m.mentorshipId?.toString(),
          alunoId: m.alunoId?.toString(),
          title: 'Reunião pendente',
          message: m.topic || 'Reunião',
          createdAt: m.createdAt || null,
          refId: m._id.toString()
        })
      })

      const count = await Promise.all([
        db.collection('mentoring_documents').countDocuments(docFilter),
        db.collection('perguntas').countDocuments(qFilter),
        db.collection('mentoring_meetings').countDocuments(mFilter)
      ]).then(vals => vals.reduce((a, b) => a + b, 0))

      return NextResponse.json({ count, items }, { status: 200 })
    }

    // student
    if (!alunoOid) {
      return NextResponse.json({ error: 'alunoId inválido.' }, { status: 400 })
    }

    const docFilter = {
      alunoId: alunoOid,
      studentUnread: true,
      ...(mentorshipOid ? { mentorshipId: mentorshipOid } : {})
    }
    const unreadDocs = await db
      .collection('mentoring_documents')
      .find(docFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .toArray()

    unreadDocs.forEach(d => {
      items.push({
        type: 'document',
        mentorshipId: d.mentorshipId?.toString(),
        title: 'Novo feedback/recurso',
        message: `${(d.kind || 'documento').toString().toUpperCase()} – ${d.original?.filename || 'Ficheiro'}`,
        createdAt: d.updatedAt || d.createdAt || null,
        refId: d._id.toString()
      })
    })

    const qFilter = {
      alunoId: alunoOid,
      studentUnread: true,
      ...(mentorshipOid ? { mentorshipId: mentorshipOid } : {})
    }
    const unreadQuestions = await db
      .collection('perguntas')
      .find(qFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .toArray()

    unreadQuestions.forEach(q => {
      items.push({
        type: 'question',
        mentorshipId: q.mentorshipId?.toString(),
        title: 'Resposta do professor',
        message: q.pergunta || 'Pergunta',
        createdAt: q.updatedAt || q.respondidaEm || q.createdAt || null,
        refId: q._id.toString()
      })
    })

    const mFilter = {
      alunoId: alunoOid,
      studentUnread: true,
      ...(mentorshipOid ? { mentorshipId: mentorshipOid } : {})
    }
    const unreadMeetings = await db
      .collection('mentoring_meetings')
      .find(mFilter)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(10)
      .toArray()

    unreadMeetings.forEach(m => {
      items.push({
        type: 'meeting',
        mentorshipId: m.mentorshipId?.toString(),
        title: 'Actualização de reunião',
        message: `${m.topic || 'Reunião'} – ${m.status || 'pending'}`,
        createdAt: m.updatedAt || m.createdAt || null,
        refId: m._id.toString()
      })
    })

    const pFilter = {
      mentorshipId: mentorshipOid,
      studentUnread: true
    }

    const unreadProgress = mentorshipOid
      ? await db
          .collection('mentoring_progress')
          .find(pFilter)
          .sort({ createdAt: -1 })
          .limit(10)
          .toArray()
      : []

    unreadProgress.forEach(p => {
      items.push({
        type: 'progress',
        mentorshipId: p.mentorshipId?.toString(),
        title: 'Nota de progresso',
        message: (p.note || '').toString().slice(0, 140),
        createdAt: p.createdAt || null,
        refId: p._id.toString()
      })
    })

    const countParts = await Promise.all([
      db.collection('mentoring_documents').countDocuments(docFilter),
      db.collection('perguntas').countDocuments(qFilter),
      db.collection('mentoring_meetings').countDocuments(mFilter),
      mentorshipOid ? db.collection('mentoring_progress').countDocuments(pFilter) : Promise.resolve(0)
    ])

    const count = countParts.reduce((a, b) => a + b, 0)

    // ordena itens por data desc
    items.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const dbt = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return dbt - da
    })

    return NextResponse.json({ count, items: items.slice(0, 15) }, { status: 200 })
  } catch (error) {
    console.error('Erro ao carregar notificações:', error)
    return NextResponse.json({ error: 'Erro ao carregar notificações.' }, { status: 500 })
  }
}
