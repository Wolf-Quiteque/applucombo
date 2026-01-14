// app/api/mentoring/mentorships/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'
import { normalizeTipoKey } from '@/app/lib/mentoringConfig'

export const runtime = 'nodejs'

function oid(id) {
  if (!id) return null
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

// GET /api/mentoring/mentorships?alunoId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('alunoId')

    const alunoOid = oid(alunoId)
    if (!alunoOid) {
      return NextResponse.json(
        { error: 'alunoId inválido.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const col = db.collection('mentoring_mentorships')

    let mentorships = await col
      .find({ alunoId: alunoOid })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray()

    const out = mentorships.map(m => ({
      id: m._id.toString(),
      alunoId: m.alunoId?.toString(),
      email: m.email || '',
      tipoKey: normalizeTipoKey(m.tipoKey),
      anoInicioCurso: m.anoInicioCurso ?? null,
      anoInicioMentoria: m.anoInicioMentoria ?? null,
      titulo: m.titulo || '',
      teacherQueueStatus: m.teacherQueueStatus || 'pending',
      teacherQueueUpdatedAt: m.teacherQueueUpdatedAt || m.updatedAt || null,
      createdAt: m.createdAt || null,
      updatedAt: m.updatedAt || null
    }))

    return NextResponse.json({ mentorships: out }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar mentorias:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar mentorias.' },
      { status: 500 }
    )
  }
}

// POST /api/mentoring/mentorships
export async function POST(request) {
  try {
    const body = await request.json()
    const { alunoId, email, tipoKey, anoInicioCurso, anoInicioMentoria, titulo } = body || {}

    const alunoOid = oid(alunoId)
    if (!alunoOid) {
      return NextResponse.json({ error: 'alunoId inválido.' }, { status: 400 })
    }

    const tipo = normalizeTipoKey(tipoKey)

    const now = new Date()
    const doc = {
      alunoId: alunoOid,
      email: (email || '').toString().trim(),
      tipoKey: tipo,
      anoInicioCurso: anoInicioCurso ? Number(anoInicioCurso) : null,
      anoInicioMentoria: anoInicioMentoria ? Number(anoInicioMentoria) : null,
      titulo: (titulo || '').toString().trim(),
      teacherQueueStatus: 'pending',
      teacherQueueUpdatedAt: now,
      createdAt: now,
      updatedAt: now
    }

    const db = await getDb()
    const col = db.collection('mentoring_mentorships')
    const ins = await col.insertOne(doc)

    return NextResponse.json(
      {
        message: 'Mentoria criada.',
        mentorship: {
          id: ins.insertedId.toString(),
          ...doc,
          alunoId: alunoId
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar mentoria:', error)
    return NextResponse.json(
      { error: 'Erro ao criar mentoria.' },
      { status: 500 }
    )
  }
}
