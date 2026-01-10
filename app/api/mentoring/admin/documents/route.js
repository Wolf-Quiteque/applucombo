// app/api/mentoring/admin/documents/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'

export const runtime = 'nodejs'

// GET /api/mentoring/admin/documents
// Lista documentos (programa/monografia) de todos os alunos, com info do aluno
export async function GET() {
  try {
    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const docs = await col
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
        { $sort: { teacherUnread: -1, updatedAt: -1 } }
      ])
      .toArray()

    const documents = docs.map(d => ({
      id: d._id.toString(),
      alunoId: d.alunoId?.toString(),
      type: d.type,
      version: d.version || 1,
      original: d.original || null,
      pdf: d.pdf || null,
      pdfConversionError: d.pdfConversionError || null,
      studentNote: d.studentNote || '',
      teacherNote: d.teacherNote || '',
      teacherUnread: !!d.teacherUnread,
      teacherLastOpenedAt: d.teacherLastOpenedAt || null,
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null,
      aluno: d.aluno
        ? {
            id: d.aluno._id.toString(),
            nomeCompleto: d.aluno.nomeCompleto,
            telefone: d.aluno.telefone,
            curso: d.aluno.curso
          }
        : null
    }))

    const unreadCount = documents.filter(d => d.teacherUnread).length

    return NextResponse.json({ documents, unreadCount }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar documentos (admin):', error)
    return NextResponse.json(
      { error: 'Erro ao carregar documentos.' },
      { status: 500 }
    )
  }
}
