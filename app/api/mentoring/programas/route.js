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
    const programas = db.collection('programas')

    const docs = await programas
      .find({ alunoId: new ObjectId(alunoId) })
      .sort({ createdAt: -1 })
      .toArray()

    const result = docs.map(p => ({
      ...p,
      id: p._id.toString(),
      _id: undefined
    }))

    return NextResponse.json({ programas: result }, { status: 200 })
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
    const programas = db.collection('programas')

    const now = new Date()
    const doc = {
      alunoId: new ObjectId(alunoId),
      tema,
      descricao,
      deadline, // pode ser string "2025-12-31"
      notas: notas || '',
      concluido: false,
      createdAt: now,
      updatedAt: now
    }

    const result = await programas.insertOne(doc)

    return NextResponse.json(
      {
        message: 'Entrada adicionada ao programa.',
        programa: {
          ...doc,
          id: result.insertedId.toString()
        }
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