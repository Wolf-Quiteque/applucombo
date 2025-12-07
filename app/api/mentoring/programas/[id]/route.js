// app/api/mentoring/programas/[id]/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import { ObjectId } from 'mongodb'

export async function PUT(request, { params }) {
  try {
    // FIX 1: Await params (Required for Next.js 15+)
    const { id } = await params
    
    const body = await request.json()
    const { concluido, notas, comentarioProfessor } = body

    const db = await getDb()
    const programasCol = db.collection('programas')

    // 🔑 Filtro robusto: tenta ObjectId, se não der, usa string
    let filtro
    try {
      filtro = { _id: new ObjectId(id) }
    } catch (e) {
      filtro = { _id: id }
    }

    // Check existing document first
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

    // ✅ Validação do concluído (só na data ou depois)
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

    // FIX 2: Handle findOneAndUpdate return value
    const result = await programasCol.findOneAndUpdate(
      filtro,
      { $set: updateFields },
      { returnDocument: 'after' }
    )

    // Handle both old driver (returns { value: doc }) and new driver (returns doc directly)
    const p = result.value || result

    if (!p) {
      return NextResponse.json(
        { error: 'Registo não encontrado.' },
        { status: 404 }
      )
    }

    const programa = {
      id: p._id.toString(),
      alunoId: p.alunoId?.toString?.() || p.alunoId,
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
      {
        message: 'Programa atualizado.',
        programa
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
