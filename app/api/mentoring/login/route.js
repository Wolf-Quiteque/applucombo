// app/api/mentoring/login/route.js
import { NextResponse } from 'next/server'
import { getDb } from '@/app/lib/mongodb'
import bcrypt from 'bcryptjs'
import { ObjectId } from 'mongodb'

export async function POST(request) {
  try {
    const body = await request.json()
    const { telefone, senha } = body

    if (!telefone || !senha) {
      return NextResponse.json(
        { error: 'Informe telefone e palavra-passe.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const alunos = db.collection('alunos')

    const telefoneLimpo = telefone.replace(/\D/g, '')
    const aluno = await alunos.findOne({ telefone: telefoneLimpo })

    if (!aluno) {
      return NextResponse.json(
        { error: 'Aluno não encontrado.' },
        { status: 404 }
      )
    }

    const ok = await bcrypt.compare(senha, aluno.senhaHash)
    if (!ok) {
      return NextResponse.json(
        { error: 'Palavra-passe incorrecta.' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      {
        message: 'Login efectuado com sucesso.',
        user: {
          id: aluno._id.toString(),
          nomeCompleto: aluno.nomeCompleto,
          telefone: aluno.telefone,
          curso: aluno.curso
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro no login:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar sessão.' },
      { status: 500 }
    )
  }
}