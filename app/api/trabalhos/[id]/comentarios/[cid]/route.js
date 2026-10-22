// PATCH  /api/trabalhos/:id/comentarios/:cid  { pagina, texto }   (professor)
// DELETE /api/trabalhos/:id/comentarios/:cid                      (professor)

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import {
  getCollections,
  findTrabalhoFor,
  serializeTrabalho,
  toObjectId,
  parseComentario
} from '@/app/lib/trabalhos/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function load(params) {
  const { session, error } = await requireSession('professor')
  if (error) return { error }

  const { id, cid } = await params
  const t = await findTrabalhoFor(session, id)
  const commentId = toObjectId(cid)
  if (!t || !commentId || !t.comentarios?.some(c => c._id.equals(commentId))) {
    return { error: jsonError('Comentário não encontrado.', 404) }
  }
  return { t, commentId }
}

export async function PATCH(request, { params }) {
  try {
    const { t, commentId, error } = await load(params)
    if (error) return error

    const parsed = parseComentario(await request.json().catch(() => ({})), t)
    if (parsed.error) return jsonError(parsed.error)

    const now = new Date()
    const $set = {
      'comentarios.$.texto': parsed.value.texto,
      'comentarios.$.pagina': parsed.value.pagina,
      'comentarios.$.actualizadoEm': now,
      actualizadoEm: now
    }
    if (t.status === 'corrigido') $set.novoParaAluno = true

    const { trabalhos } = await getCollections()
    const updated = await trabalhos.findOneAndUpdate(
      { _id: t._id, 'comentarios._id': commentId },
      { $set },
      { returnDocument: 'after' }
    )
    return NextResponse.json({ trabalho: serializeTrabalho(updated, 'professor') })
  } catch (err) {
    console.error('Erro ao editar comentário:', err)
    return jsonError('Não foi possível editar o comentário.', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { t, commentId, error } = await load(params)
    if (error) return error

    const { trabalhos } = await getCollections()
    const updated = await trabalhos.findOneAndUpdate(
      { _id: t._id },
      { $pull: { comentarios: { _id: commentId } }, $set: { actualizadoEm: new Date() } },
      { returnDocument: 'after' }
    )
    return NextResponse.json({ trabalho: serializeTrabalho(updated, 'professor') })
  } catch (err) {
    console.error('Erro ao apagar comentário:', err)
    return jsonError('Não foi possível apagar o comentário.', 500)
  }
}
