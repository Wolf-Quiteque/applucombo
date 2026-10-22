// PATCH  /api/trabalhos/:id/comentarios/:cid   (professor)
//   { pagina, texto }      editar um comentário da versão actual
//   { confirmado: bool }   marcar que o aluno fez a correcção (comentários de versões anteriores)
// DELETE /api/trabalhos/:id/comentarios/:cid   (professor, só versão actual)
//
// Os comentários de versões anteriores ficam como estão: só se podem confirmar.

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import {
  getCollections,
  findTrabalhoFor,
  serializeTrabalho,
  toObjectId,
  parseComentario,
  versaoDe
} from '@/app/lib/trabalhos/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BLOQUEADO = 'Os comentários de versões anteriores ficam como estão. Pode apenas confirmar a correcção.'

async function load(params) {
  const { session, error } = await requireSession('professor')
  if (error) return { error }

  const { id, cid } = await params
  const t = await findTrabalhoFor(session, id)
  const commentId = toObjectId(cid)
  const comentario = commentId && t?.comentarios?.find(c => c._id.equals(commentId))
  if (!comentario) return { error: jsonError('Comentário não encontrado.', 404) }

  const anterior = versaoDe(comentario) < (t.versao || 1)
  return { t, commentId, anterior }
}

export async function PATCH(request, { params }) {
  try {
    const { t, commentId, anterior, error } = await load(params)
    if (error) return error

    const body = await request.json().catch(() => ({}))
    const now = new Date()
    let $set

    if (typeof body?.confirmado === 'boolean' && body?.texto === undefined) {
      if (!anterior) {
        return jsonError('Pode confirmar as correcções depois de o aluno enviar uma versão nova.', 409)
      }
      $set = {
        'comentarios.$.confirmado': body.confirmado,
        'comentarios.$.confirmadoEm': body.confirmado ? now : null,
        actualizadoEm: now
      }
    } else {
      if (anterior) return jsonError(BLOQUEADO, 409)
      const parsed = parseComentario(body, t)
      if (parsed.error) return jsonError(parsed.error)
      $set = {
        'comentarios.$.texto': parsed.value.texto,
        'comentarios.$.pagina': parsed.value.pagina,
        'comentarios.$.actualizadoEm': now,
        actualizadoEm: now
      }
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
    return jsonError('Não foi possível actualizar o comentário.', 500)
  }
}

export async function DELETE(request, { params }) {
  try {
    const { t, commentId, anterior, error } = await load(params)
    if (error) return error
    if (anterior) return jsonError(BLOQUEADO, 409)

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
