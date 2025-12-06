// app/api/mentoring/programas/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request, { params }) {
  try {
    const { id } = params
    const body = await request.json()
    const { concluido, notas } = body

    const db = await getDb()
    const programas = db.collection('programas')

    const update = {
      $set: {
        updatedAt: new Date()
      }
    }

    if (typeof concluido === 'boolean') {
      update.$set.concluido = concluido
    }
    if (typeof notas === 'string') {
      update.$set.notas = notas
    }

    const result = await programas.findOneAndUpdate(
      { _id: new ObjectId(id) },
      update,
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