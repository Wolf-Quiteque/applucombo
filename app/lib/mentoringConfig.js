// app/lib/mentoringConfig.js

// Configuração central de tipos de mentoria e documentos.
// Usamos chaves sem acentos para simplificar queries e URLs.

export const MENTORIA_TYPES = [
  {
    key: 'doutoramento',
    label: 'Doutoramento',
    secondaryType: 'tez',
    secondaryLabel: 'Tese'
  },
  {
    key: 'licenciatura',
    label: 'Licenciatura',
    secondaryType: 'monografia',
    secondaryLabel: 'Monografia'
  },
  {
    key: 'mestrado',
    label: 'Mestrado',
    secondaryType: 'dissertacao',
    secondaryLabel: 'Dissertação'
  },
  {
    key: 'pesquisa',
    label: 'Pesquisa',
    secondaryType: 'pesquisa',
    secondaryLabel: 'Pesquisa'
  },
  {
    key: 'outros',
    label: 'Outros',
    secondaryType: 'outras_pesquisa',
    secondaryLabel: 'Outras Pesquisas'
  }
]

export const DOCUMENT_LABELS = {
  programa: 'Programa',
  tez: 'Tese',
  monografia: 'Monografia',
  dissertacao: 'Dissertação',
  pesquisa: 'Pesquisa',
  outras_pesquisa: 'Outras Pesquisas'
}

export function normalizeTipoKey(tipoKey) {
  const t = (tipoKey || '').toString().trim().toLowerCase()
  if (!t) return 'licenciatura'
  if (t === 'doutorado' || t === 'phd') return 'doutoramento'
  if (t === 'licenciatura') return 'licenciatura'
  if (t === 'mestrado') return 'mestrado'
  if (t === 'pesquisa') return 'pesquisa'
  if (t === 'outro' || t === 'outros') return 'outros'
  return t
}

export function getMentoriaConfig(tipoKey) {
  const key = normalizeTipoKey(tipoKey)
  return (
    MENTORIA_TYPES.find(t => t.key === key) ||
    MENTORIA_TYPES.find(t => t.key === 'licenciatura')
  )
}

export function getDocTypesForMentoria(tipoKey) {
  const cfg = getMentoriaConfig(tipoKey)
  return ['programa', cfg.secondaryType]
}

export function getSecondaryType(tipoKey) {
  return getMentoriaConfig(tipoKey).secondaryType
}

export function getSecondaryLabel(tipoKey) {
  return getMentoriaConfig(tipoKey).secondaryLabel
}

export function getDocLabel(type, tipoKey) {
  if (type === 'programa') return 'Programa'

  const cfg = getMentoriaConfig(tipoKey)
  if (type === cfg.secondaryType) return cfg.secondaryLabel

  return DOCUMENT_LABELS[type] || type
}
