// app/api/mentoring/admin/mentorships/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'

export const runtime = 'nodejs'

function normalizeQueueStatus(value) {
  const v = (value || '').toString().trim().toLowerCase()
  if (!v) return 'pending'
  if (['pending', 'pendente', 'por_fazer', 'por-fazer', 'aberto', 'open'].includes(v)) return 'pending'
  if (
    [
      'done',
      'concluida',
      'concluída',
      'concluidas',
      'concluídas',
      'concluido',
      'concluído',
      'completed',
      'finalizada',
      'finalizado',
      'closed'
    ].includes(v)
  )
    return 'done'
  return v === 'all' ? 'pending' : 'pending'
}

// GET /api/mentoring/admin/mentorships
// Lista mentorias com dados do aluno e contagens de pendências.
export async function GET() {
  try {
    const db = await getDb()
    const mentorshipsCol = db.collection('mentoring_mentorships')

    const mentorships = await mentorshipsCol
      .aggregate([
        {
          $lookup: {
            from: 'alunos',
            localField: 'alunoId',
            foreignField: '_id',
            as: 'aluno'
          }
        },
        { $unwind: { path: '$aluno', preserveNullAndEmptyArrays: true } },
        { $sort: { teacherQueueUpdatedAt: -1, updatedAt: -1, createdAt: -1 } }
      ])
      .toArray()

    const docsCol = db.collection('mentoring_documents')
    const qCol = db.collection('perguntas')
    const mCol = db.collection('mentoring_meetings')

    const out = []

    for (const ms of mentorships) {
      const mentorshipId = ms._id

      const [unreadDocs, unreadQuestions, unreadMeetings] = await Promise.all([
        docsCol.countDocuments({ mentorshipId, teacherUnread: true }),
        qCol.countDocuments({ mentorshipId, teacherUnread: true }),
        mCol.countDocuments({ mentorshipId, teacherUnread: true })
      ])

      out.push({
        id: ms._id.toString(),
        alunoId: ms.alunoId?.toString(),
        email: ms.email || '',
        tipoKey: ms.tipoKey || 'licenciatura',
        anoInicioCurso: ms.anoInicioCurso ?? null,
        anoInicioMentoria: ms.anoInicioMentoria ?? null,
        titulo: ms.titulo || '',
        teacherQueueStatus: normalizeQueueStatus(ms.teacherQueueStatus),
        teacherQueueUpdatedAt: ms.teacherQueueUpdatedAt || ms.updatedAt || null,
        createdAt: ms.createdAt || null,
        updatedAt: ms.updatedAt || null,
        pendingCounts: {
          documents: unreadDocs,
          questions: unreadQuestions,
          meetings: unreadMeetings,
          total: unreadDocs + unreadQuestions + unreadMeetings
        },
        aluno: ms.aluno
          ? {
              id: ms.aluno._id.toString(),
              nomeCompleto: ms.aluno.nomeCompleto,
              telefone: ms.aluno.telefone,
              curso: ms.aluno.curso
            }
          : null
      })
    }

    return NextResponse.json({ mentorships: out }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar mentorias (admin):', error)
    return NextResponse.json({ error: 'Erro ao carregar mentorias.' }, { status: 500 })
  }
}
