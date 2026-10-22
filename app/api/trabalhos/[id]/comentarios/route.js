// POST /api/trabalhos/:id/comentarios  { pagina, texto }   (professor)
// pagina 0 = comentário geral (não ligado a uma página).

import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import {
  getCollections,
  findTrabalhoFor,
  serializeTrabalho,
  parseComentario
} from '@/app/lib/trabalhos/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request, { params }) {
  const { session, error } = await requireSession('professor')
  if (error) return error

  try {
    const { id } = await params
    const t = await findTrabalhoFor(session, id)
    if (!t) return jsonError('Trabalho não encontrado.', 404)

    const parsed = parseComentario(await request.json().catch(() => ({})), t)
    if (parsed.error) return jsonError(parsed.error)

    const now = new Date()
    const comentario = { _id: new ObjectId(), ...parsed.value, criadoEm: now, actualizadoEm: now }

    const $set = { actualizadoEm: now }
    // Se já foi corrigido, o aluno é avisado de que há novidades.
    if (t.status === 'corrigido') $set.novoParaAluno = true

    const { trabalhos } = await getCollections()
    const updated = await trabalhos.findOneAndUpdate(
      { _id: t._id },
      { $push: { comentarios: comentario }, $set },
      { returnDocument: 'after' }
    )

    return NextResponse.json(
      { trabalho: serializeTrabalho(updated, 'professor'), comentarioId: comentario._id.toString() },
      { status: 201 }
    )
  } catch (err) {
    console.error('Erro ao adicionar comentário:', err)
    return jsonError('Não foi possível guardar o comentário.', 500)
  }
}
