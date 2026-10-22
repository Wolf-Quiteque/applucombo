// Colecção `trabalhos` e conversão para JSON.
//
// Documento:
// {
//   alunoId, alunoNome, alunoTelefone, alunoCurso,
//   titulo,
//   versao, versaoEm,              // nº e data da versão actual (o aluno pode enviar versões corrigidas)
//   ficheiro: { key, nome, tamanho }, paginas, mensagem,   // da versão actual
//   versoesAnteriores: [{ numero, ficheiro, paginas, mensagem, enviadoEm, corrigidoEm }],
//   status: 'pendente' | 'corrigido',
//   comentarios: [{ _id, versao, pagina, texto, confirmado, confirmadoEm, criadoEm, actualizadoEm }],
//     // pagina 0 = geral; os comentários de versões anteriores ficam como estão,
//     // o professor só os marca como "confirmado" (o aluno fez a correcção)
//   rascunho: { pagina, texto, actualizadoEm },  // comentário a meio (só o professor vê)
//   novoParaProfessor,             // ainda não aberto pelo professor
//   novoParaAluno,                 // correcção nova/alterada que o aluno ainda não viu
//   criadoEm, actualizadoEm, corrigidoEm
// }
// Trabalhos antigos sem `versao` contam como versão 1.

import { ObjectId } from 'mongodb'
import { getDb } from '@/app/lib/mongodb'

let indexesReady = null

export async function getCollections() {
  const db = await getDb()
  const trabalhos = db.collection('trabalhos')

  if (!indexesReady) {
    indexesReady = Promise.all([
      trabalhos.createIndex({ alunoId: 1, criadoEm: -1 }),
      trabalhos.createIndex({ status: 1, criadoEm: -1 })
    ]).catch(err => {
      indexesReady = null
      console.error('Falha ao criar índices de trabalhos:', err?.message)
    })
  }

  return { db, trabalhos, alunos: db.collection('alunos') }
}

export function toObjectId(id) {
  return typeof id === 'string' && /^[a-f\d]{24}$/i.test(id) ? new ObjectId(id) : null
}

export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Carrega um trabalho verificando se a sessão lhe pode aceder.
export async function findTrabalhoFor(session, id) {
  const _id = toObjectId(id)
  if (!_id) return null
  const { trabalhos } = await getCollections()
  const filter = { _id }
  if (session.role === 'aluno') filter.alunoId = toObjectId(session.id)
  return trabalhos.findOne(filter)
}

export const versaoDe = c => c.versao || 1

// Ficheiro de uma versão (a actual se `numero` não for indicado).
export function ficheiroDaVersao(t, numero) {
  const actual = t.versao || 1
  if (!numero || numero === actual) return t.ficheiro
  return (t.versoesAnteriores || []).find(v => v.numero === numero)?.ficheiro || null
}

export function todosOsFicheiros(t) {
  return [t.ficheiro, ...(t.versoesAnteriores || []).map(v => v.ficheiro)].filter(f => f?.key)
}

export function serializeTrabalho(t, role) {
  const versaoActual = t.versao || 1
  // O aluno vê sempre os comentários de versões anteriores (já lhe foram enviados);
  // os da versão actual só depois de o professor enviar a correcção.
  const visivel = c => role === 'professor' || versaoDe(c) < versaoActual || t.status === 'corrigido'
  const comentarios = (t.comentarios || [])
    .filter(visivel)
    .sort(
      (a, b) =>
        versaoDe(a) - versaoDe(b) || a.pagina - b.pagina || new Date(a.criadoEm) - new Date(b.criadoEm)
    )
    .map(c => ({
      id: c._id.toString(),
      versao: versaoDe(c),
      pagina: c.pagina,
      texto: c.texto,
      confirmado: !!c.confirmado,
      confirmadoEm: c.confirmadoEm || null,
      criadoEm: c.criadoEm,
      actualizadoEm: c.actualizadoEm
    }))

  const versoes = [
    ...(t.versoesAnteriores || []).map(v => ({
      numero: v.numero,
      nome: v.ficheiro?.nome || 'trabalho.pdf',
      tamanho: v.ficheiro?.tamanho || 0,
      paginas: v.paginas || null,
      mensagem: v.mensagem || '',
      enviadoEm: v.enviadoEm || null
    })),
    {
      numero: versaoActual,
      nome: t.ficheiro?.nome || 'trabalho.pdf',
      tamanho: t.ficheiro?.tamanho || 0,
      paginas: t.paginas || null,
      mensagem: t.mensagem || '',
      enviadoEm: t.versaoEm || t.criadoEm
    }
  ]

  return {
    id: t._id.toString(),
    alunoId: t.alunoId?.toString(),
    aluno: {
      nome: t.alunoNome || 'Aluno',
      telefone: t.alunoTelefone || '',
      curso: t.alunoCurso || ''
    },
    titulo: t.titulo,
    mensagem: t.mensagem || '',
    ficheiro: { nome: t.ficheiro?.nome || 'trabalho.pdf', tamanho: t.ficheiro?.tamanho || 0 },
    paginas: t.paginas || null,
    versao: versaoActual,
    versaoEm: t.versaoEm || t.criadoEm,
    versoes,
    status: t.status,
    comentarios,
    rascunho:
      role === 'professor' && t.rascunho?.texto
        ? { pagina: t.rascunho.pagina, texto: t.rascunho.texto, actualizadoEm: t.rascunho.actualizadoEm }
        : null,
    novoParaProfessor: !!t.novoParaProfessor,
    novoParaAluno: !!t.novoParaAluno,
    criadoEm: t.criadoEm,
    actualizadoEm: t.actualizadoEm,
    corrigidoEm: t.corrigidoEm || null
  }
}

// Valida { pagina, texto } de um comentário.
export function parseComentario(body, trabalho) {
  const texto = (body?.texto || '').toString().trim()
  if (!texto) return { error: 'Escreva o comentário.' }
  if (texto.length > 5000) return { error: 'O comentário é demasiado longo (máx. 5000 caracteres).' }

  const pagina = Number(body?.pagina)
  if (!Number.isInteger(pagina) || pagina < 0) return { error: 'Página inválida.' }
  if (trabalho.paginas && pagina > trabalho.paginas) {
    return { error: `O PDF só tem ${trabalho.paginas} páginas.` }
  }

  return { value: { pagina, texto } }
}
