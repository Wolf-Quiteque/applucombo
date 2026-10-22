// Colecção `trabalhos` e conversão para JSON.
//
// Documento:
// {
//   alunoId, alunoNome, alunoTelefone, alunoCurso,
//   titulo, mensagem,
//   ficheiro: { key, nome, tamanho },
//   paginas,                       // nº de páginas (preenchido ao abrir o PDF)
//   status: 'pendente' | 'corrigido',
//   comentarios: [{ _id, pagina, texto, criadoEm, actualizadoEm }],  // pagina 0 = geral
//   novoParaProfessor,             // ainda não aberto pelo professor
//   novoParaAluno,                 // correcção nova/alterada que o aluno ainda não viu
//   criadoEm, actualizadoEm, corrigidoEm
// }

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

export function serializeTrabalho(t, role) {
  // O aluno só vê os comentários depois de o professor enviar a correcção.
  const mostrarComentarios = role === 'professor' || t.status === 'corrigido'
  const comentarios = mostrarComentarios
    ? [...(t.comentarios || [])]
        .sort((a, b) => a.pagina - b.pagina || new Date(a.criadoEm) - new Date(b.criadoEm))
        .map(c => ({
          id: c._id.toString(),
          pagina: c.pagina,
          texto: c.texto,
          criadoEm: c.criadoEm,
          actualizadoEm: c.actualizadoEm
        }))
    : []

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
    status: t.status,
    comentarios,
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
