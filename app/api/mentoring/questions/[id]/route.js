// app/api/mentoring/questions/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { resposta, respondida } = body

    const db = await getDb()
    const perguntasCol = db.collection('perguntas')

    let filtro
    try {
      filtro = { _id: new ObjectId(id) }
    } catch {
      filtro = { _id: id }
    }

    const existente = await perguntasCol.findOne(filtro)
    if (!existente) {
      return NextResponse.json(
        { error: 'Pergunta não encontrada.' },
        { status: 404 }
      )
    }

    const agora = new Date()
    const updateFields = {
      updatedAt: agora
    }

    if (typeof resposta === 'string') {
      updateFields.resposta = resposta
      // se escreveu algo, marcamos como respondida
      updateFields.respondida = resposta.trim().length > 0
      updateFields.respondidaEm =
        resposta.trim().length > 0 ? agora : null
    }

    if (typeof respondida === 'boolean') {
      updateFields.respondida = respondida
      updateFields.respondidaEm = respondida ? agora : null
    }

    const result = await perguntasCol.findOneAndUpdate(
      filtro,
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    if (!result.value) {
      return NextResponse.json(
        { error: 'Pergunta não encontrada.' },
        { status: 404 }
      )
    }

    const q = result.value
    const perguntaOut = {
      id: q._id.toString(),
      alunoId: q.alunoId.toString(),
      pergunta: q.pergunta,
      detalhe: q.detalhe || '',
      resposta: q.resposta || '',
      respondida: !!q.respondida,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
      respondidaEm: q.respondidaEm || null
    }

    return NextResponse.json(
      { message: 'Pergunta actualizada.', pergunta: perguntaOut },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao actualizar pergunta:', error)
    return NextResponse.json(
      { error: 'Erro ao actualizar a pergunta.' },
      { status: 500 }
    )
  }
}