// app/api/mentoring/programas/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { concluido, notas, comentarioProfessor } = body

    const db = await getDb()
    const programas = db.collection('programas')

    const existente = await programas.findOne({ _id: new ObjectId(id) })
    if (!existente) {
      return NextResponse.json(
        { error: 'Registo não encontrado.' },
        { status: 404 }
      )
    }

    const updateFields = {
      updatedAt: new Date()
    }

    // Validação do concluído (tanto para aluno como professor)
    if (typeof concluido === 'boolean') {
      if (concluido && existente.deadline) {
        const hoje = new Date()
        hoje.setHours(0, 0, 0, 0)

        const deadlineDate = new Date(existente.deadline)
        if (!isNaN(deadlineDate)) {
          deadlineDate.setHours(0, 0, 0, 0)

          if (deadlineDate > hoje) {
            return NextResponse.json(
              {
                error:
                  'Só pode marcar esta tarefa como concluída na data do deadline ou depois.'
              },
              { status: 400 }
            )
          }
        }
      }
      updateFields.concluido = concluido
    }

    if (typeof notas === 'string') {
      updateFields.notas = notas
    }

    if (typeof comentarioProfessor === 'string') {
      updateFields.comentarioProfessor = comentarioProfessor
    }

    const result = await programas.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    if (!result.value) {
      return NextResponse.json(
        { error: 'Registo não encontrado.' },
        { status: 404 }
      )
    }

    const p = result.value
    return NextResponse.json(
      {
        message: 'Programa actualizado.',
        programa: {
          ...p,
          id: p._id.toString(),
          _id: undefined
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao actualizar programa:', error)
    return NextResponse.json(
      { error: 'Erro ao actualizar o programa.' },
      { status: 500 }
    )
  }
}