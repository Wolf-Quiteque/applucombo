// GET  /api/trabalhos
//   aluno:     os seus trabalhos
//   professor: todos, com filtros ?q=texto&estado=pendente|corrigido&alunoId=...
// POST /api/trabalhos  (aluno) — novo trabalho
//   JSON      { key, titulo, mensagem, nomeFicheiro }  depois do envio directo para o R2
//   multipart { file, titulo, mensagem }                alternativa pelo servidor
//   (versões corrigidas: POST /api/trabalhos/:id/versoes)

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import {
  getCollections,
  toObjectId,
  escapeRegex,
  serializeTrabalho
} from '@/app/lib/trabalhos/db'
import { receberPdf, limpar } from '@/app/lib/trabalhos/upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { session, error } = await requireSession()
  if (error) return error

  try {
    const { trabalhos } = await getCollections()

    if (session.role === 'aluno') {
      const docs = await trabalhos
        .find({ alunoId: toObjectId(session.id) })
        .sort({ criadoEm: -1 })
        .toArray()
      return NextResponse.json({ trabalhos: docs.map(t => serializeTrabalho(t, 'aluno')) })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim().slice(0, 100)
    const estado = searchParams.get('estado')
    const alunoId = toObjectId(searchParams.get('alunoId'))

    const base = {}
    if (alunoId) base.alunoId = alunoId
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i')
      base.$or = [{ titulo: rx }, { alunoNome: rx }, { alunoTelefone: rx }, { alunoCurso: rx }]
    }

    const filter = { ...base }
    if (estado === 'pendente' || estado === 'corrigido') filter.status = estado

    const [docs, pendente, corrigido] = await Promise.all([
      // Por corrigir: fila pela data da versão actual (mais antiga primeiro).
      // Restantes: mais recentes primeiro.
      trabalhos
        .find(filter)
        .sort(estado === 'pendente' ? { versaoEm: 1, criadoEm: 1 } : { criadoEm: -1 })
        .limit(300)
        .toArray(),
      trabalhos.countDocuments({ ...base, status: 'pendente' }),
      trabalhos.countDocuments({ ...base, status: 'corrigido' })
    ])

    return NextResponse.json({
      trabalhos: docs.map(t => serializeTrabalho(t, 'professor')),
      contagens: { pendente, corrigido, total: pendente + corrigido }
    })
  } catch (err) {
    console.error('Erro ao listar trabalhos:', err)
    return jsonError('Não foi possível carregar os trabalhos.', 500)
  }
}

function tituloFromFilename(name) {
  return (name || 'Trabalho').replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim() || 'Trabalho'
}

export async function POST(request) {
  const { session, error } = await requireSession('aluno')
  if (error) return error

  try {
    const { trabalhos, alunos } = await getCollections()
    const alunoId = toObjectId(session.id)
    const aluno = await alunos.findOne({ _id: alunoId })
    if (!aluno) return jsonError('Conta de aluno não encontrada.', 401)

    const pdf = await receberPdf(request, session)
    if (pdf.error) return jsonError(pdf.error)

    const now = new Date()
    const doc = {
      alunoId,
      alunoNome: aluno.nomeCompleto || session.nome,
      alunoTelefone: aluno.telefone || '',
      alunoCurso: aluno.curso || '',
      titulo: limpar(pdf.campos.titulo, 200) || tituloFromFilename(pdf.nomeFicheiro),
      mensagem: limpar(pdf.campos.mensagem, 2000),
      ficheiro: { key: pdf.key, nome: pdf.nomeFicheiro, tamanho: pdf.tamanho },
      paginas: null,
      versao: 1,
      versaoEm: now,
      status: 'pendente',
      comentarios: [],
      novoParaProfessor: true,
      novoParaAluno: false,
      criadoEm: now,
      actualizadoEm: now,
      corrigidoEm: null
    }

    const result = await trabalhos.insertOne(doc)
    return NextResponse.json(
      { trabalho: serializeTrabalho({ ...doc, _id: result.insertedId }, 'aluno') },
      { status: 201 }
    )
  } catch (err) {
    console.error('Erro ao registar trabalho:', err)
    return jsonError('Não foi possível enviar o trabalho.', 500)
  }
}
