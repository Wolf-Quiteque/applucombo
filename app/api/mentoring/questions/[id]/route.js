// app/api/mentoring/questions/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request, { params }) {
  try {
    // FIX 1: Await params (Required for Next.js 15+)
    const { id } = await params 
    
    // Debugging: Check if ID is being captured correctly
    console.log("Updating Question ID:", id)

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

    // Check existence
    const existente = await perguntasCol.findOne(filtro)
    if (!existente) {
      console.log("Question not found in initial search")
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
      updateFields.respondida = resposta.trim().length > 0
      updateFields.respondidaEm = resposta.trim().length > 0 ? agora : null
    }

    if (typeof respondida === 'boolean') {
      updateFields.respondida = respondida
      updateFields.respondidaEm = respondida ? agora : null
    }

    // FIX 2: Handle findOneAndUpdate return value
    // In newer MongoDB drivers, this returns the document directly, not { value: doc }
    // We explicitly set includeResultMetadata: false to get just the doc (default in v5/v6)
    const result = await perguntasCol.findOneAndUpdate(
      filtro,
      { $set: updateFields },
      { returnDocument: 'after' } 
    )

    // In MongoDB Driver v5+, 'result' IS the document (or null if not found)
    // If you are on an older driver (v4), keep using result.value. 
    // This checks both to be safe:
    const q = result.value || result

    if (!q) {
      console.log("Update failed or document missing after update")
      return NextResponse.json(
        { error: 'Pergunta não encontrada.' },
        { status: 404 }
      )
    }

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
