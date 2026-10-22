// GET /api/trabalhos/alunos?q=texto   (professor)
// Sem `q`: alunos que já enviaram trabalhos (mais recentes primeiro).
// Com `q`: procura em todos os alunos por nome, telefone ou curso.

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import { getCollections, escapeRegex } from '@/app/lib/trabalhos/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function countsFor(trabalhos, match) {
  const rows = await trabalhos
    .aggregate([
      { $match: match },
      { $sort: { criadoEm: -1 } },
      {
        $group: {
          _id: '$alunoId',
          nome: { $first: '$alunoNome' },
          telefone: { $first: '$alunoTelefone' },
          curso: { $first: '$alunoCurso' },
          total: { $sum: 1 },
          pendentes: { $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] } },
          ultimo: { $first: '$criadoEm' }
        }
      },
      { $sort: { ultimo: -1 } },
      { $limit: 200 }
    ])
    .toArray()
  return rows
}

export async function GET(request) {
  const { error } = await requireSession('professor')
  if (error) return error

  try {
    const { trabalhos, alunos } = await getCollections()
    const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 100)

    if (!q) {
      const rows = await countsFor(trabalhos, {})
      return NextResponse.json({
        alunos: rows.map(r => ({
          id: r._id.toString(),
          nome: r.nome || 'Aluno',
          telefone: r.telefone || '',
          curso: r.curso || '',
          total: r.total,
          pendentes: r.pendentes,
          ultimo: r.ultimo
        }))
      })
    }

    const rx = new RegExp(escapeRegex(q), 'i')
    const found = await alunos
      .find(
        { $or: [{ nomeCompleto: rx }, { telefone: rx }, { curso: rx }] },
        { projection: { nomeCompleto: 1, telefone: 1, curso: 1 } }
      )
      .sort({ nomeCompleto: 1 })
      .limit(60)
      .toArray()

    const counts = await countsFor(trabalhos, { alunoId: { $in: found.map(a => a._id) } })
    const byId = new Map(counts.map(c => [c._id.toString(), c]))

    return NextResponse.json({
      alunos: found.map(a => {
        const c = byId.get(a._id.toString())
        return {
          id: a._id.toString(),
          nome: a.nomeCompleto || 'Aluno',
          telefone: a.telefone || '',
          curso: a.curso || '',
          total: c?.total || 0,
          pendentes: c?.pendentes || 0,
          ultimo: c?.ultimo || null
        }
      })
    })
  } catch (err) {
    console.error('Erro ao procurar alunos:', err)
    return jsonError('Não foi possível carregar os alunos.', 500)
  }
}
