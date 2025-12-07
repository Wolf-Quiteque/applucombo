// app/api/mentoring/programas/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request, { params }) import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

function buildFilterById(id) {
  if (ObjectId.isValid(id)) {
    return { _id: new ObjectId(id) }
  }
  return { _id: id }
}

export async function PUT(request, { params }) {
  try {
    // ⚠️ FIX 1: Aguardar (await) 'params' para garantir que o ID seja capturado
    const { id } = await params 
    
    const body = await request.json()
    const {
      concluido,
      notas,
      comentarioProfessor,
      tema,
      descricao,
      deadline
    } = body

    const db = await getDb()
    const programasCol = db.collection('programas')

    const filtro = buildFilterById(id)
    const existente = await programasCol.findOne(filtro)
    if (!existente) {
      return NextResponse.json(
        { error: 'Registo não encontrado.' },
        { status: 404 }
      )
    }

    const updateFields = {
      updatedAt: new Date()
    }

    // validação de concluído (lógica preservada)
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
    if (typeof tema === 'string') {
      updateFields.tema = tema
    }
    if (typeof descricao === 'string') {
      updateFields.descricao = descricao
    }
    if (typeof deadline === 'string') {
      updateFields.deadline = deadline
    }

    const result = await programasCol.findOneAndUpdate(
      filtro,
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    // ⚠️ FIX 2: Usar 'result.value' OU 'result' para compatibilidade com driver MongoDB v5+
    const p = result.value || result 

    if (!p) {
      return NextResponse.json(
        { error: 'Registo não encontrado.' },
        { status: 404 }
      )
    }

    const programa = {
      id: p._id.toString(),
      alunoId: p.alunoId.toString(),
      tema: p.tema,
      descricao: p.descricao,
      deadline: p.deadline,
      notas: p.notas || '',
      concluido: !!p.concluido,
      comentarioProfessor: p.comentarioProfessor || '',
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }

    return NextResponse.json(
      { message: 'Programa actualizado.', programa },
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

// ----------------------------------------------------------------------

export async function DELETE(request, { params }) {
  try {
    // ⚠️ FIX 1: Aguardar (await) 'params' para garantir que o ID seja capturado
    const { id } = await params 
    
    const db = await getDb()
    const programasCol = db.collection('programas')

    const filtro = buildFilterById(id)
    const result = await programasCol.deleteOne(filtro)

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Registo não encontrado.' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { message: 'Programa removido.' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao apagar programa:', error)
    return NextResponse.json(
      { error: 'Erro ao apagar o programa.' },
      { status: 500 }
    )
  }
}

