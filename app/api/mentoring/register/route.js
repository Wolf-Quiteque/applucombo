// app/api/mentoring/register/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const body = await request.json()
    const { nomeCompleto, telefone, senha, curso } = body

    if (!nomeCompleto || !telefone || !senha || !curso) {
      return NextResponse.json(
        { error: 'Preencha todos os campos.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const alunos = db.collection('alunos')

    const telefoneLimpo = telefone.replace(/\D/g, '')

    const existente = await alunos.findOne({ telefone: telefoneLimpo })
    if (existente) {
      return NextResponse.json(
        { error: 'Este número já está registado.' },
        { status: 400 }
      )
    }

    const senhaHash = await bcrypt.hash(senha, 10)

    const result = await alunos.insertOne({
      nomeCompleto,
      telefone: telefoneLimpo,
      senhaHash,
      curso,
      createdAt: new Date()
    })

    return NextResponse.json(
      {
        message: 'Conta criada com sucesso.',
        user: {
          id: result.insertedId.toString(),
          nomeCompleto,
          telefone: telefoneLimpo,
          curso
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro no registo:', error)
    return NextResponse.json(
      { error: 'Erro ao criar conta.' },
      { status: 500 }
    )
  }
}