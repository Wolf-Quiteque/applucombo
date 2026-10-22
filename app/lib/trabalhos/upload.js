// Recebe o PDF de um aluno, de uma de duas formas:
//   JSON      { key, nomeFicheiro, ...campos }  o browser já enviou o PDF para o R2
//   multipart { file, ...campos }                envio pelo servidor (alternativa)
// Devolve { key, nomeFicheiro, tamanho, campos } ou { error }.

import {
  MAX_PDF_BYTES,
  newPdfKey,
  putPdf,
  headObject,
  startsWithPdfSignature,
  deleteObject
} from './storage'

const MAIOR = 'O PDF é maior que 50 MB.'
const INVALIDO = 'O ficheiro não é um PDF válido.'

export async function receberPdf(request, session) {
  const contentType = request.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') return { error: 'Escolha um ficheiro PDF.' }
    if (file.size > MAX_PDF_BYTES) return { error: MAIOR }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!buffer.subarray(0, 5).toString('latin1').startsWith('%PDF')) return { error: INVALIDO }

    const key = newPdfKey(session.id)
    await putPdf(key, buffer)
    return {
      key,
      nomeFicheiro: limpar(file.name, 200) || 'trabalho.pdf',
      tamanho: file.size,
      campos: { titulo: form.get('titulo'), mensagem: form.get('mensagem') }
    }
  }

  const body = await request.json().catch(() => ({}))
  const key = (body?.key || '').toString()
  if (!key.startsWith(`trabalhos/${session.id}/`) || !key.endsWith('.pdf')) {
    return { error: 'Envio inválido.' }
  }

  const head = await headObject(key)
  if (!head) return { error: 'O ficheiro não chegou ao servidor. Tente enviar outra vez.' }
  if (head.ContentLength > MAX_PDF_BYTES) {
    await deleteObject(key)
    return { error: MAIOR }
  }
  if (!(await startsWithPdfSignature(key))) {
    await deleteObject(key)
    return { error: INVALIDO }
  }

  return {
    key,
    nomeFicheiro: limpar(body?.nomeFicheiro, 200) || 'trabalho.pdf',
    tamanho: head.ContentLength,
    campos: { titulo: body?.titulo, mensagem: body?.mensagem }
  }
}

export function limpar(value, max) {
  return (value || '').toString().trim().slice(0, max)
}
