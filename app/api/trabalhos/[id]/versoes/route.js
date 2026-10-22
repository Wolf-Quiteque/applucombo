// POST /api/trabalhos/:id/versoes   (aluno) — enviar a versão corrigida
//   JSON      { key, mensagem, nomeFicheiro }  depois do envio directo para o R2
//   multipart { file, mensagem }                alternativa pelo servidor
//
// A versão actual passa para `versoesAnteriores` com os seus comentários intactos,
// e o trabalho volta a "Por corrigir" para o professor confirmar as correcções.

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import { getCollections, findTrabalhoFor, serializeTrabalho } from '@/app/lib/trabalhos/db'
import { receberPdf, limpar } from '@/app/lib/trabalhos/upload'
import { deleteObject } from '@/app/lib/trabalhos/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SO_DEPOIS = 'Só pode enviar uma versão nova depois de o professor enviar a correcção.'

export async function POST(request, { params }) {
  const { session, error } = await requireSession('aluno')
  if (error) return error

  try {
    const { id } = await params
    const t = await findTrabalhoFor(session, id)
    if (!t) return jsonError('Trabalho não encontrado.', 404)
    if (t.status !== 'corrigido') return jsonError(SO_DEPOIS, 409)

    const pdf = await receberPdf(request, session)
    if (pdf.error) return jsonError(pdf.error)

    const versaoAnterior = t.versao || 1
    const now = new Date()
    const anterior = {
      numero: versaoAnterior,
      ficheiro: t.ficheiro,
      paginas: t.paginas || null,
      mensagem: t.mensagem || '',
      enviadoEm: t.versaoEm || t.criadoEm,
      corrigidoEm: t.corrigidoEm || null
    }

    const { trabalhos } = await getCollections()
    // O filtro com status/versão evita duas versões novas em simultâneo.
    const updated = await trabalhos.findOneAndUpdate(
      { _id: t._id, status: 'corrigido', versao: t.versao ?? null },
      {
        $push: { versoesAnteriores: anterior },
        $set: {
          versao: versaoAnterior + 1,
          versaoEm: now,
          ficheiro: { key: pdf.key, nome: pdf.nomeFicheiro, tamanho: pdf.tamanho },
          paginas: null,
          mensagem: limpar(pdf.campos.mensagem, 2000),
          status: 'pendente',
          corrigidoEm: null,
          novoParaProfessor: true,
          novoParaAluno: false,
          actualizadoEm: now
        }
      },
      { returnDocument: 'after' }
    )

    if (!updated) {
      await deleteObject(pdf.key)
      return jsonError(SO_DEPOIS, 409)
    }

    return NextResponse.json({ trabalho: serializeTrabalho(updated, 'aluno') }, { status: 201 })
  } catch (err) {
    console.error('Erro ao enviar versão corrigida:', err)
    return jsonError('Não foi possível enviar a versão corrigida.', 500)
  }
}
