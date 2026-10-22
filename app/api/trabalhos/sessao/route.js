// GET    /api/trabalhos/sessao  -> quem está ligado
// POST   /api/trabalhos/sessao  -> entrar { tipo: 'aluno' | 'professor', telefone, senha }
// DELETE /api/trabalhos/sessao  -> sair

import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getCollections } from '@/app/lib/trabalhos/db'
import {
  getSession,
  setSessionCookie,
  clearSessionCookie,
  jsonError,
  safeEqual
} from '@/app/lib/trabalhos/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const onlyDigits = v => (v || '').toString().replace(/\D/g, '')

export async function GET() {
  return NextResponse.json({ sessao: await getSession() })
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}))
    const tipo = body?.tipo === 'professor' ? 'professor' : 'aluno'
    const utilizador = (body?.telefone || '').toString().trim()
    const telefone = onlyDigits(utilizador)
    const senha = (body?.senha || '').toString()

    if (!utilizador || !senha) return jsonError('Preencha todos os campos.')

    let session

    if (tipo === 'professor') {
      // TEACHER_PHONE pode ser um telefone ou um email.
      const normalizar = v => (v.includes('@') ? v.trim().toLowerCase() : onlyDigits(v))
      const esperado = normalizar(process.env.TEACHER_PHONE || '')
      const pass = process.env.TEACHER_PASSWORD || ''
      if (!esperado || !pass) return jsonError('Login do professor não configurado no servidor.', 500)
      const dado = normalizar(utilizador)
      if (!dado || !safeEqual(dado, esperado) || !safeEqual(senha, pass)) {
        return jsonError('Email/telefone ou palavra-passe incorrectos.', 401)
      }
      session = { role: 'professor', nome: 'Professor' }
    } else {
      if (!telefone) return jsonError('Escreva o seu número de telefone.')
      // Mesma conta usada na Mentoria (colecção `alunos`). Aceita o número com ou sem 244.
      const { alunos } = await getCollections()
      const candidatos = [telefone]
      if (telefone.startsWith('244') && telefone.length > 9) candidatos.push(telefone.slice(3))
      const aluno = await alunos.findOne({ telefone: { $in: candidatos } })

      const ok = aluno?.senhaHash ? await bcrypt.compare(senha, aluno.senhaHash) : false
      if (!ok) return jsonError('Telefone ou palavra-passe incorrectos.', 401)

      session = {
        role: 'aluno',
        id: aluno._id.toString(),
        nome: aluno.nomeCompleto || 'Aluno',
        telefone: aluno.telefone || '',
        curso: aluno.curso || ''
      }
    }

    const res = NextResponse.json({ sessao: session })
    setSessionCookie(res, session)
    return res
  } catch (err) {
    console.error('Erro no login (trabalhos):', err)
    return jsonError('Não foi possível entrar. Tente novamente.', 500)
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  clearSessionCookie(res)
  return res
}
