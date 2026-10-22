// PUT /api/trabalhos/:id/rascunho  { pagina, texto }   (professor)
// Guarda automaticamente o comentário que o professor está a escrever,
// para não se perder se sair sem clicar em "Adicionar". Texto vazio apaga-o.
// O aluno nunca vê o rascunho.

import { NextResponse } from 'next/server'
import { requireSession, jsonError } from '@/app/lib/trabalhos/auth'
import { getCollections, findTrabalhoFor } from '@/app/lib/trabalhos/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(request, { params }) {
  const { session, error } = await requireSession('professor')
  if (error) return error

  try {
    const { id } = await params
    const t = await findTrabalhoFor(session, id)
    if (!t) return jsonError('Trabalho não encontrado.', 404)

    const body = await request.json().catch(() => ({}))
    const texto = (body?.texto || '').toString().slice(0, 5000)
    let pagina = Number(body?.pagina)
    if (!Number.isInteger(pagina) || pagina < 0) pagina = 0
    if (t.paginas && pagina > t.paginas) pagina = t.paginas

    const { trabalhos } = await getCollections()
    const update = texto.trim()
      ? { $set: { rascunho: { pagina, texto, actualizadoEm: new Date() } } }
      : { $unset: { rascunho: '' } }
    await trabalhos.updateOne({ _id: t._id }, update)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erro ao guardar rascunho:', err)
    return jsonError('Não foi possível guardar o rascunho.', 500)
  }
}
