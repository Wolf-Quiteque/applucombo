// app/api/mentoring/admin/login/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { telefone, senha } = body

    const envPhone = process.env.TEACHER_PHONE || ''
    const envPassword = process.env.TEACHER_PASSWORD || ''

    if (!envPhone || !envPassword) {
      return NextResponse.json(
        { error: 'Credenciais do professor não estão configuradas no servidor.' },
        { status: 500 }
      )
    }

    const telefoneLimpo = (telefone || '').replace(/\D/g, '')
    const envTelefoneLimpo = envPhone.replace(/\D/g, '')

    if (telefoneLimpo !== envTelefoneLimpo || senha !== envPassword) {
      return NextResponse.json(
        { error: 'Telefone ou palavra-passe inválidos.' },
        { status: 401 }
      )
    }

    // Como é só um professor, não precisamos de muito mais
    return NextResponse.json(
      {
        message: 'Login de professor efectuado com sucesso.',
        teacher: {
          telefone: envTelefoneLimpo
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro no login do professor:', error)
    return NextResponse.json(
      { error: 'Erro ao iniciar sessão como professor.' },
      { status: 500 }
    )
  }
}