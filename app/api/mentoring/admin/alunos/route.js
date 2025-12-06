// app/api/mentoring/admin/alunos/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'

export async function GET() {
  try {
    const db = await getDb()
    const alunosCol = db.collection('alunos')

    const docs = await alunosCol
      .find({})
      .sort({ createdAt: -1 })
      .toArray()

    const alunos = docs.map(a => ({
      id: a._id.toString(),
      nomeCompleto: a.nomeCompleto,
      telefone: a.telefone,
      curso: a.curso,
      createdAt: a.createdAt
    }))

    return NextResponse.json({ alunos }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar alunos (admin):', error)
    return NextResponse.json(
      { error: 'Erro ao carregar lista de alunos.' },
      { status: 500 }
    )
  }
}