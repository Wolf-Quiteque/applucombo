export function fmtData(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDataHora(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const rtf = typeof Intl !== 'undefined' ? new Intl.RelativeTimeFormat('pt', { numeric: 'auto' }) : null

export function tempoRelativo(value) {
  if (!value || !rtf) return fmtData(value)
  const diff = (new Date(value).getTime() - Date.now()) / 1000
  const abs = Math.abs(diff)
  if (abs < 60) return 'agora mesmo'
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour')
  if (abs < 86400 * 7) return rtf.format(Math.round(diff / 86400), 'day')
  return fmtData(value)
}

export function fmtTamanho(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

export function iniciais(nome) {
  const parts = (nome || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return (first + last).toUpperCase()
}

export const labelPagina = p => (p === 0 ? 'Geral' : `Página ${p}`)
export const labelPaginaCurta = p => (p === 0 ? 'Geral' : `Pág. ${p}`)

export function plural(n, um, varios) {
  return `${n} ${n === 1 ? um : varios}`
}

// [{ pagina, itens: [...] }] com "Geral" primeiro e depois por página.
export function agruparComentarios(comentarios = []) {
  const map = new Map()
  for (const c of comentarios) {
    if (!map.has(c.pagina)) map.set(c.pagina, [])
    map.get(c.pagina).push(c)
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pagina, itens]) => ({ pagina, itens }))
}

export function comentariosEmTexto(t) {
  const linhas = [
    `Trabalho: ${t.titulo}`,
    `Aluno: ${t.aluno?.nome || ''}${t.aluno?.curso ? ` (${t.aluno.curso})` : ''}`,
    `Ficheiro: ${t.ficheiro?.nome || ''}`,
    `Enviado em: ${fmtDataHora(t.criadoEm)}`
  ]
  if (t.corrigidoEm) linhas.push(`Corrigido em: ${fmtDataHora(t.corrigidoEm)}`)
  linhas.push('', `Comentários do professor (${t.comentarios.length})`, '='.repeat(40), '')

  if (!t.comentarios.length) linhas.push('Sem comentários.')
  for (const g of agruparComentarios(t.comentarios)) {
    linhas.push(`${labelPagina(g.pagina)}:`)
    for (const c of g.itens) {
      const texto = c.texto.split('\n').join('\n  ')
      linhas.push(`- ${texto}`)
    }
    linhas.push('')
  }
  return linhas.join('\r\n')
}

function slug(text) {
  return (text || 'trabalho')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60)
}

export function descarregarComentarios(t) {
  // BOM para os acentos aparecerem bem no Bloco de Notas do Windows.
  const blob = new Blob(['﻿' + comentariosEmTexto(t)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `comentarios-${slug(t.titulo)}.txt`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
