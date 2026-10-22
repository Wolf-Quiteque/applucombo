// GET    /api/trabalhos/:id
// PATCH  /api/trabalhos/:id
//   { accao: 'aberto' }                          marca como visto (aluno ou professor)
//   { paginas: 12 }                              guarda o nº de páginas
//   { estado: 'corrigido' | 'pendente' }         só professor
// DELETE /api/trabalhos/:id
//   aluno: só enquanto o professor ainda não comentou; professor: sempre

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import { getCollections, findTrabalhoFor, serializeTrabalho } from '@/app/lib/trabalhos/db'
import { deleteObject } from '@/app/lib/trabalhos/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOT_FOUND = 'Trabalho não encontrado.'

export async function GET(request, { params }) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const t = await findTrabalhoFor(session, id)
  if (!t) return jsonError(NOT_FOUND, 404)
  return NextResponse.json({ trabalho: serializeTrabalho(t, session.role) })
}

export async function PATCH(request, { params }) {
  const { session, error } = await requireSession()
  if (error) return error

  try {
    const { id } = await params
    const t = await findTrabalhoFor(session, id)
    if (!t) return jsonError(NOT_FOUND, 404)

    const body = await request.json().catch(() => ({}))
    const now = new Date()
    const $set = {}

    if (body?.accao === 'aberto') {
      if (session.role === 'professor') $set.novoParaProfessor = false
      else $set.novoParaAluno = false
    }

    const paginas = Number(body?.paginas)
    if (Number.isInteger(paginas) && paginas > 0 && paginas < 10000 && !t.paginas) {
      $set.paginas = paginas
    }

    if (body?.estado !== undefined) {
      if (session.role !== 'professor') return jsonError('Sem permissão para esta acção.', 403)
      if (body.estado === 'corrigido') {
        Object.assign($set, {
          status: 'corrigido',
          corrigidoEm: now,
          novoParaAluno: true,
          novoParaProfessor: false,
          actualizadoEm: now
        })
      } else if (body.estado === 'pendente') {
        Object.assign($set, { status: 'pendente', corrigidoEm: null, novoParaAluno: false, actualizadoEm: now })
      } else {
        return jsonError('Estado inválido.')
      }
    }

    if (!Object.keys($set).length) return jsonError('Nada para actualizar.')

    const { trabalhos } = await getCollections()
    const updated = await trabalhos.findOneAndUpdate(
      { _id: t._id },
      { $set },
      { returnDocument: 'after' }
    )
    return NextResponse.json({ trabalho: serializeTrabalho(updated, session.role) })
  } catch (err) {
    console.error('Erro ao actualizar trabalho:', err)
    return jsonError('Não foi possível actualizar o trabalho.', 500)
  }
}

export async function DELETE(request, { params }) {
  const { session, error } = await requireSession()
  if (error) return error

  try {
    const { id } = await params
    const t = await findTrabalhoFor(session, id)
    if (!t) return jsonError(NOT_FOUND, 404)

    if (session.role === 'aluno' && (t.status !== 'pendente' || t.comentarios?.length)) {
      return jsonError('O professor já começou a corrigir este trabalho. Já não o pode apagar.', 409)
    }

    const { trabalhos } = await getCollections()
    await trabalhos.deleteOne({ _id: t._id })
    if (t.ficheiro?.key) await deleteObject(t.ficheiro.key)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro ao apagar trabalho:', err)
    return jsonError('Não foi possível apagar o trabalho.', 500)
  }
}
