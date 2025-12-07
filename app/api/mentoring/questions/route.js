// app/api/mentoring/questions/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

// GET /api/mentoring/questions?alunoId=...
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
    const perguntasCol = db.collection('perguntas')

    // Respondidas primeiro, depois mais recentes
    const docs = await perguntasCol
      .find({ alunoId: new ObjectId(alunoId) })
      .sort({ respondida: -1, createdAt: -1 })
      .toArray()

    const perguntas = docs.map(q => ({
      id: q._id.toString(),
      alunoId: q.alunoId.toString(),
      pergunta: q.pergunta,
      detalhe: q.detalhe || '',
      resposta: q.resposta || '',
      respondida: !!q.respondida,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      respondidaEm: q.respondidaEm || null
    }))

    return NextResponse.json({ perguntas }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar perguntas:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar perguntas do aluno.' },
      { status: 500 }
    )
  }
}

// POST /api/mentoring/questions
export async function POST(request) {
  try {
    const body = await request.json()
    const { alunoId, pergunta, detalhe } = body

    if (!alunoId || !pergunta) {
      return NextResponse.json(
        { error: 'Preencha pelo menos a pergunta.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const perguntasCol = db.collection('perguntas')

    const now = new Date()
    const doc = {
      alunoId: new ObjectId(alunoId),
      pergunta,
      detalhe: detalhe || '',
      resposta: '',
      respondida: false,
      createdAt: now,
      updatedAt: now,
      respondidaEm: null
    }

    const result = await perguntasCol.insertOne(doc)

    const perguntaOut = {
      id: result.insertedId.toString(),
      alunoId,
      pergunta: doc.pergunta,
      detalhe: doc.detalhe,
      resposta: doc.resposta,
      respondida: doc.respondida,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      respondidaEm: doc.respondidaEm
    }

    return NextResponse.json(
      { message: 'Pergunta enviada ao professor.', pergunta: perguntaOut },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao criar pergunta:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar a pergunta.' },
      { status: 500 }
    )
  }
}