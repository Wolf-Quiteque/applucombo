// GET  /api/trabalhos
//   aluno:     os seus trabalhos
//   professor: todos, com filtros ?q=texto&estado=pendente|corrigido&alunoId=...
// POST /api/trabalhos  (aluno)
//   JSON      { key, titulo, mensagem, nomeFicheiro }  depois do envio directo para o R2
//   multipart { file, titulo, mensagem }                alternativa pelo servidor

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import {
  getCollections,
  toObjectId,
  escapeRegex,
  serializeTrabalho
} from '@/app/lib/trabalhos/db'
import {
  MAX_PDF_BYTES,
  newPdfKey,
  putPdf,
  headObject,
  startsWithPdfSignature,
  deleteObject
} from '@/app/lib/trabalhos/storage'

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
      // Por corrigir: os mais antigos primeiro (fila). Restantes: mais recentes primeiro.
      trabalhos
        .find(filter)
        .sort(estado === 'pendente' ? { criadoEm: 1 } : { criadoEm: -1 })
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

function cleanText(value, max) {
  return (value || '').toString().trim().slice(0, max)
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

    let key, nomeFicheiro, tamanho, titulo, mensagem
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('multipart/form-data')) {
      // Envio pelo servidor (usado quando o envio directo falha).
      const form = await request.formData()
      const file = form.get('file')
      if (!file || typeof file === 'string') return jsonError('Escolha um ficheiro PDF.')
      if (file.size > MAX_PDF_BYTES) return jsonError('O PDF é maior que 50 MB.')

      const buffer = Buffer.from(await file.arrayBuffer())
      if (!buffer.subarray(0, 5).toString('latin1').startsWith('%PDF')) {
        return jsonError('O ficheiro não é um PDF válido.')
      }

      key = newPdfKey(session.id)
      await putPdf(key, buffer)
      nomeFicheiro = file.name
      tamanho = file.size
      titulo = form.get('titulo')
      mensagem = form.get('mensagem')
    } else {
      // O browser já enviou o PDF para o R2; confirmamos que existe e é PDF.
      const body = await request.json().catch(() => ({}))
      key = (body?.key || '').toString()
      if (!key.startsWith(`trabalhos/${session.id}/`) || !key.endsWith('.pdf')) {
        return jsonError('Envio inválido.')
      }

      const head = await headObject(key)
      if (!head) return jsonError('O ficheiro não chegou ao servidor. Tente enviar outra vez.')
      if (head.ContentLength > MAX_PDF_BYTES) {
        await deleteObject(key)
        return jsonError('O PDF é maior que 50 MB.')
      }
      if (!(await startsWithPdfSignature(key))) {
        await deleteObject(key)
        return jsonError('O ficheiro não é um PDF válido.')
      }

      nomeFicheiro = body?.nomeFicheiro
      tamanho = head.ContentLength
      titulo = body?.titulo
      mensagem = body?.mensagem
    }

    nomeFicheiro = cleanText(nomeFicheiro, 200) || 'trabalho.pdf'
    const now = new Date()
    const doc = {
      alunoId,
      alunoNome: aluno.nomeCompleto || session.nome,
      alunoTelefone: aluno.telefone || '',
      alunoCurso: aluno.curso || '',
      titulo: cleanText(titulo, 200) || tituloFromFilename(nomeFicheiro),
      mensagem: cleanText(mensagem, 2000),
      ficheiro: { key, nome: nomeFicheiro, tamanho },
      paginas: null,
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
