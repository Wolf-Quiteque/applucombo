// POST /api/trabalhos/upload  { tamanho }
// Devolve um link assinado para o aluno enviar o PDF directamente para o R2.
// Depois do envio, o aluno regista o trabalho em POST /api/trabalhos com a `key`.

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import { MAX_PDF_BYTES, newPdfKey, presignUpload } from '@/app/lib/trabalhos/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  const { session, error } = await requireSession('aluno')
  if (error) return error

  try {
    const body = await request.json().catch(() => ({}))
    const tamanho = Number(body?.tamanho)
    if (!tamanho || tamanho <= 0) return jsonError('Ficheiro vazio.')
    if (tamanho > MAX_PDF_BYTES) return jsonError('O PDF é maior que 50 MB.')

    const key = newPdfKey(session.id)
    const url = await presignUpload(key)
    return NextResponse.json({ key, url })
  } catch (err) {
    console.error('Erro ao preparar envio:', err)
    return jsonError('Não foi possível preparar o envio.', 500)
  }
}
