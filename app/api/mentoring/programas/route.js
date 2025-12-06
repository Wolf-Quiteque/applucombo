// app/api/mentoring/programas/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/mentoring/programas?alunoId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('alunoId')

    if (!alunoId) {
      return NextResponse.json(
        { error: 'alunoId é obrigatório.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const programasCol = db.collection('programas')

    const docs = await programasCol
      .find({ alunoId: new ObjectId(alunoId) })
      .sort({ createdAt: -1 })
      .toArray()

    const programas = docs.map(p => ({
      id: p._id.toString(),      // <- MUITO IMPORTANTE
      alunoId: p.alunoId.toString(),
      tema: p.tema,
      descricao: p.descricao,
      deadline: p.deadline,
      notas: p.notas || '',
      concluido: !!p.concluido,
      comentarioProfessor: p.comentarioProfessor || '',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))

    return NextResponse.json({ programas }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar programas:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar o programa do aluno.' },
      { status: 500 }
    )
  }
}

// POST /api/mentoring/programas
export async function POST(request) {
  try {
    const body = await request.json()
    const { alunoId, tema, descricao, deadline, notas } = body

    if (!alunoId || !tema || !descricao || !deadline) {
      return NextResponse.json(
        { error: 'Preencha pelo menos tema, descrição e deadline.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const programasCol = db.collection('programas')

    const now = new Date()
    const doc = {
      alunoId: new ObjectId(alunoId),
      tema,
      descricao,
      deadline,       // string yyyy-mm-dd
      notas: notas || '',
      concluido: false,
      comentarioProfessor: '',
      createdAt: now,
      updatedAt: now
    }

    const result = await programasCol.insertOne(doc)

    const programa = {
      id: result.insertedId.toString(),
      alunoId,
      tema: doc.tema,
      descricao: doc.descricao,
      deadline: doc.deadline,
      notas: doc.notas,
      concluido: doc.concluido,
      comentarioProfessor: doc.comentarioProfessor,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    }

    return NextResponse.json(
      {
        message: 'Entrada adicionada ao programa.',
        programa
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar programa:', error)
    return NextResponse.json(
      { error: 'Erro ao criar entrada no programa.' },
      { status: 500 }
    )
  }
}