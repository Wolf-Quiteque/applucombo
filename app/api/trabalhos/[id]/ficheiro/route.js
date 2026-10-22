// GET /api/trabalhos/:id/ficheiro
//   Sem parâmetros: devolve o PDF (com suporte a Range) para a pré-visualização.
//   ?download=1:    redirecciona para um link temporário de download.
//   ?versao=N:      uma versão anterior (por omissão, a actual).

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import { findTrabalhoFor, ficheiroDaVersao } from '@/app/lib/trabalhos/db'
import { getObject, presignDownload } from '@/app/lib/trabalhos/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const t = await findTrabalhoFor(session, id)
  const ficheiro = t && ficheiroDaVersao(t, Number(searchParams.get('versao')) || null)
  if (!ficheiro?.key) return jsonError('Ficheiro não encontrado.', 404)

  if (searchParams.get('download')) {
    const url = await presignDownload(ficheiro.key, ficheiro.nome || 'trabalho.pdf')
    return NextResponse.redirect(url, 302)
  }

  const range = request.headers.get('range') || undefined
  try {
    const obj = await getObject(ficheiro.key, range)
    const headers = {
      'Content-Type': 'application/pdf',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': 'inline'
    }
    if (obj.ContentLength != null) headers['Content-Length'] = String(obj.ContentLength)
    if (obj.ContentRange) headers['Content-Range'] = obj.ContentRange

    return new Response(obj.Body.transformToWebStream(), {
      status: range && obj.ContentRange ? 206 : 200,
      headers
    })
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 416) {
      return new Response(null, { status: 416 })
    }
    console.error('Erro ao ler PDF:', err)
    return jsonError('Não foi possível abrir o PDF.', 500)
  }
}
