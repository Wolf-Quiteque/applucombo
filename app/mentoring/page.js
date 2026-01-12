'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  X,
  Upload,
  History,
  MessageSquare,
  Calendar,
  TrendingUp,
  Bell,
  LogOut,
  Edit2,
  ChevronRight,
  File,
} from 'lucide-react'

/** -------------------- Constants / Helpers -------------------- */
const TIPO_OPCOES = [
  { key: 'doutoramento', label: 'Doutoramento', secondaryType: 'tez', secondaryLabel: 'Tese', titleLabel: 'Título da Tese' },
  { key: 'licenciatura', label: 'Licenciatura', secondaryType: 'monografia', secondaryLabel: 'Monografia', titleLabel: 'Título da Monografia' },
  { key: 'mestrado', label: 'Mestrado', secondaryType: 'dissertacao', secondaryLabel: 'Dissertação', titleLabel: 'Título da Dissertação' },
  { key: 'pesquisa', label: 'Pesquisa', secondaryType: 'pesquisa', secondaryLabel: 'Pesquisa', titleLabel: 'Título da Pesquisa' },
  { key: 'outros', label: 'Outros', secondaryType: 'outras_pesquisa', secondaryLabel: 'Outras Pesquisas', titleLabel: 'Título da Pesquisa' },
]

function tipoMeta(tipoKey) {
  return TIPO_OPCOES.find((t) => t.key === (tipoKey || 'licenciatura')) || TIPO_OPCOES[1]
}

function fmtDate(dt) {
  if (!dt) return ''
  try {
    return new Date(dt).toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

function truncate(str, max = 45) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

/**
 * Normaliza o doc do backend para a UI nova:
 * tenta usar doc.original.* / doc.pdf.* se existirem,
 * e cai para campos simples se o backend devolver diferente.
 */
function normalizeDoc(d) {
  if (!d) return null
  const original = d.original || {}
  const pdf = d.pdf || {}
  const contentType = pdf.contentType || original.contentType || d.contentType || ''
  const url = pdf.url || original.url || d.url || ''
  const filename = original.filename || d.filename || d.name || 'Documento'
  const uploadedAt = d.createdAt || d.updatedAt || d.uploadedAt || null

  return {
    ...d,
    filename,
    url,
    contentType,
    uploadedAt,
    studentNote: d.studentNote || d.note || '',
    teacherNote: d.teacherNote || '',
  }
}

/**
 * Bootstrap modal shell without Bootstrap JS (we control show/hide via React)
 */
function ModalShell({ title, icon: Icon, onClose, children, footer, size = 'modal-lg' }) {
  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} style={{ cursor: 'pointer' }} />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                {Icon ? <Icon size={20} className="text-primary" /> : null}
                <h5 className="modal-title mb-0">{title}</h5>
              </div>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer ? <div className="modal-footer">{footer}</div> : null}
          </div>
        </div>
      </div>
    </>
  )
}

/** -------------------- Page -------------------- */
export default function MentoringStudent() {
  /** -------- Auth -------- */
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [curso, setCurso] = useState('')

  /** -------- Data -------- */
  const [mentorships, setMentorships] = useState([])
  const [selectedMentorshipId, setSelectedMentorshipId] = useState('')
  const [documents, setDocuments] = useState([])

  /** -------- UI -------- */
  const [tab, setTab] = useState('mentoria')
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  /** -------- Notifications -------- */
  const [notifCount, setNotifCount] = useState(0)
  const [notifItems, setNotifItems] = useState([])
  const [showNotifModal, setShowNotifModal] = useState(false)

  /** -------- Modals -------- */
  const [selectedDoc, setSelectedDoc] = useState(null) // doc viewer
  const [showHistory, setShowHistory] = useState(null) // 'programa' | secondaryType
  const [showUpload, setShowUpload] = useState(null) // 'programa' | secondaryType

  /** -------- Upload form (modal) -------- */
  const uploadFileRef = useRef(null)
  const [uploadNote, setUploadNote] = useState('')

  /** -------- Derived -------- */
  const mentorship = useMemo(
    () => mentorships.find((m) => m.id === selectedMentorshipId) || null,
    [mentorships, selectedMentorshipId]
  )
  const meta = useMemo(() => tipoMeta(mentorship?.tipoKey), [mentorship?.tipoKey])

  const firstName = useMemo(() => {
    const n = (user?.nomeCompleto || '').toString().trim()
    return n ? n.split(/\s+/)[0] : 'Aluno'
  }, [user?.nomeCompleto])

  /** -------------------- Init from localStorage -------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('mentoringUser')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (parsed?.id) setUser(parsed)
    } catch {
      // ignore
    }
  }, [])

  /** -------------------- Load mentorships when user exists -------------------- */
  useEffect(() => {
    if (!user?.id) return
    carregarMentorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  /** -------------------- Persist selected mentorship -------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!selectedMentorshipId) return
    window.localStorage.setItem('mentoringSelectedMentorshipId', selectedMentorshipId)
  }, [selectedMentorshipId])

  /** -------------------- Load docs + notifications when mentorship changes -------------------- */
  useEffect(() => {
    if (!user?.id || !selectedMentorshipId) return

    carregarDocs()
    carregarNotificacoes()

    const t = setInterval(() => {
      carregarNotificacoes()
    }, 8000)

    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedMentorshipId])

  /** -------------------- API Calls (same endpoints as old) -------------------- */
  async function carregarMentorias() {
    try {
      const res = await axios.get(`/api/mentoring/mentorships?alunoId=${user.id}`)
      const list = res.data?.mentorships || []
      setMentorships(list)

      let chosen = ''
      if (typeof window !== 'undefined') {
        chosen = window.localStorage.getItem('mentoringSelectedMentorshipId') || ''
      }
      if (chosen && list.some((m) => m.id === chosen)) setSelectedMentorshipId(chosen)
      else setSelectedMentorshipId(list[0]?.id || '')
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarDocs() {
    try {
      const res = await axios.get(`/api/mentoring/documents?mentorshipId=${selectedMentorshipId}`)
      const list = (res.data?.documents || []).map(normalizeDoc)
      setDocuments(list)
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarNotificacoes() {
    try {
      const res = await axios.get(
        `/api/mentoring/notifications?role=student&alunoId=${user.id}&mentorshipId=${selectedMentorshipId}`
      )
      setNotifCount(res.data?.count || 0)
      setNotifItems(res.data?.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  /** -------------------- AUTH -------------------- */
  async function handleAuth(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setLoadingAuth(true)
    try {
      if (isSignup) {
        const res = await axios.post('/api/mentoring/register', {
          nomeCompleto,
          telefone,
          senha,
          curso,
        })
        const u = res.data?.user
        if (!u?.id) throw new Error('Resposta inválida.')
        setUser(u)
        if (typeof window !== 'undefined') window.localStorage.setItem('mentoringUser', JSON.stringify(u))
        setInfo('Conta criada. Bem-vindo!')
      } else {
        const res = await axios.post('/api/mentoring/login', { telefone, senha })
        const u = res.data?.user
        if (!u?.id) throw new Error('Resposta inválida.')
        setUser(u)
        if (typeof window !== 'undefined') window.localStorage.setItem('mentoringUser', JSON.stringify(u))
        setInfo('Login efectuado.')
      }
    } catch (err) {
      setErro(err?.response?.data?.error || err?.message || 'Erro de autenticação.')
    } finally {
      setLoadingAuth(false)
    }
  }

  function logout() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mentoringUser')
      window.localStorage.removeItem('mentoringSelectedMentorshipId')
    }
    setUser(null)
    setMentorships([])
    setSelectedMentorshipId('')
    setDocuments([])
    setNotifCount(0)
    setNotifItems([])
    setErro('')
    setInfo('')
  }

  /** -------------------- Documents logic -------------------- */
  const byType = useMemo(() => {
    const m = {
      programa: [],
      [meta.secondaryType]: [],
    }

    ;(documents || []).forEach((d) => {
      if (!d?.type) return
      if (!m[d.type]) m[d.type] = []
      m[d.type].push(d)
    })

    Object.keys(m).forEach((k) => {
      m[k].sort((a, b) => {
        const va = a.version || 0
        const vb = b.version || 0
        if (vb !== va) return vb - va
        const da = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
        const dbt = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
        return dbt - da
      })
    })

    return m
  }, [documents, meta.secondaryType])

  const submissions = useMemo(() => {
    return {
      programa: (byType.programa || []).filter((d) => (d.kind || 'submission') === 'submission'),
      secondary: (byType[meta.secondaryType] || []).filter((d) => (d.kind || 'submission') === 'submission'),
    }
  }, [byType, meta.secondaryType])

  const latestPrograma = submissions.programa?.[0] || null
  const latestSecondary = submissions.secondary?.[0] || null

  async function uploadDoc({ type }) {
    const file = uploadFileRef?.current?.files?.[0] || null
    const studentNote = (uploadNote || '').trim()

    if (!file && !studentNote) {
      setErro('Envie um ficheiro ou uma nota.')
      return
    }

    setErro('')
    setInfo('')
    setBusy(true)
    try {
      const form = new FormData()
      form.append('mentorshipId', selectedMentorshipId)
      form.append('alunoId', user.id)
      form.append('type', type)
      form.append('kind', 'submission')
      form.append('uploadedByRole', 'student')
      if (studentNote) form.append('note', studentNote)
      if (file) form.append('file', file)

      await axios.post('/api/mentoring/documents', form)

      setInfo('Documento enviado.')
      setShowUpload(null)
      setUploadNote('')
      if (uploadFileRef.current) uploadFileRef.current.value = ''

      await carregarDocs()
      await carregarNotificacoes()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao enviar documento.')
    } finally {
      setBusy(false)
    }
  }

  async function openDoc(doc) {
    if (!doc?.id) return
    setSelectedDoc(doc)
    try {
      await axios.patch(`/api/mentoring/documents/${doc.id}/event`, { role: 'student', action: 'view' })
      await carregarDocs()
      await carregarNotificacoes()
    } catch {
      // ignore
    }
  }

  async function trackDownload(doc) {
    if (!doc?.id) return
    try {
      await axios.patch(`/api/mentoring/documents/${doc.id}/event`, { role: 'student', action: 'download' })
      await carregarDocs()
    } catch {
      // ignore
    }
  }

  /** -------------------- DocCard (new UI but API data) -------------------- */
  function DocCard({ type, title, doc }) {
    const hasNew = !!doc?.studentUnread
    const isPdf = !!doc?.contentType?.toLowerCase()?.includes('pdf')
    const Icon = isPdf ? FileText : File

    return (
      <div className="card border-0 shadow-sm h-100">
        <div
          className="card-header border-0"
          style={{
            background: 'linear-gradient(90deg, rgba(13,110,253,.08), rgba(102,16,242,.08))',
          }}
        >
          <div className="d-flex align-items-start justify-content-between gap-3">
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white rounded-3 shadow-sm p-2 d-inline-flex align-items-center justify-content-center">
                <Icon size={20} />
              </div>

              <div className="min-w-0">
                <div className="fw-semibold">{title}</div>
                <div className="text-muted small">{doc ? `Versão ${doc.version || 1}` : 'Nenhum documento'}</div>
              </div>
            </div>

            {hasNew ? <span className="badge text-bg-danger align-self-start">Novo feedback</span> : null}
          </div>
        </div>

        <div className="card-body">
          {doc ? (
            <>
              <div className="p-3 bg-body-tertiary rounded-3 d-flex gap-3 align-items-start">
                <FileText size={18} className="text-muted mt-1 flex-shrink-0" />
                <div className="flex-grow-1 min-w-0">
                  <div className="fw-semibold text-truncate" title={doc.filename}>
                    {truncate(doc.filename, 45)}
                  </div>
                  <div className="text-muted small mt-1">
                    <Clock size={14} className="me-1" />
                    Enviado: {fmtDate(doc.uploadedAt)}
                  </div>
                </div>
              </div>

              <div className="row g-3 mt-1">
                <div className="col-12 col-md-6">
                  <div className="p-3 rounded-3 border" style={{ background: 'rgba(13,110,253,.07)' }}>
                    <div className="d-flex align-items-center gap-2 text-primary small fw-semibold mb-1">
                      <MessageSquare size={14} />
                      Sua nota
                    </div>
                    <div className="small text-body">
                      {doc.studentNote ? truncate(doc.studentNote, 160) : <span className="text-muted fst-italic">Sem nota</span>}
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="p-3 rounded-3 border" style={{ background: 'rgba(25,135,84,.07)' }}>
                    <div className="d-flex align-items-center gap-2 text-success small fw-semibold mb-1">
                      <MessageSquare size={14} />
                      Feedback professor
                    </div>
                    <div className="small text-body">
                      {doc.teacherNote ? truncate(doc.teacherNote, 160) : <span className="text-muted fst-italic">Aguardando</span>}
                    </div>
                  </div>
                </div>
              </div>

              {doc.teacherViewedAt ? (
                <div className="mt-3 p-2 bg-body-tertiary rounded-3 d-flex align-items-center gap-2 small text-muted">
                  <CheckCircle size={16} className="text-success" />
                  <span>Visto pelo professor em {fmtDate(doc.teacherViewedAt)}</span>
                </div>
              ) : null}

              <div className="d-flex gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                  onClick={() => openDoc(doc)}
                >
                  <Eye size={16} />
                  Visualizar
                </button>

                <a
                  className={`btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2 ${doc.url ? '' : 'disabled'}`}
                  href={doc.url || '#'}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => trackDownload(doc)}
                  aria-label="Download"
                >
                  <Download size={16} />
                </a>
              </div>

              <div className="d-flex gap-2 mt-2">
                <button
                  type="button"
                  className="btn btn-light d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                  onClick={() => setShowHistory(type)}
                >
                  <History size={16} />
                  Ver histórico
                </button>
                <button
                  type="button"
                  className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2 flex-grow-1"
                  onClick={() => {
                    setShowUpload(type)
                    setUploadNote('')
                    if (uploadFileRef.current) uploadFileRef.current.value = ''
                  }}
                >
                  <Upload size={16} />
                  Nova versão
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="rounded-circle bg-body-tertiary d-inline-flex align-items-center justify-content-center mb-3">
                <div style={{ width: 64, height: 64 }} className="d-flex align-items-center justify-content-center">
                  <Upload size={28} className="text-muted" />
                </div>
              </div>
              <div className="text-muted mb-3">Nenhum documento enviado</div>
              <button
                type="button"
                className="btn btn-primary d-inline-flex align-items-center gap-2"
                onClick={() => setShowUpload(type)}
              >
                <Upload size={16} />
                Enviar {title}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  /** -------------------- Login UI -------------------- */
  if (!user) {
    return (
      <div className="container py-5" style={{ maxWidth: 920 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h2 className="mb-1">Mentoria</h2>
            <div className="text-muted">Acesso do aluno</div>
          </div>
          <span className="badge text-bg-light">LMS</span>
        </div>

        {erro ? <div className="alert alert-danger">{erro}</div> : null}
        {info ? <div className="alert alert-success">{info}</div> : null}

        <div className="card border-0 shadow-sm p-4">
          <div className="d-flex gap-2 mb-3">
            <button
              className={`btn ${!isSignup ? 'btn-primary' : 'btn-outline-primary'}`}
              type="button"
              onClick={() => setIsSignup(false)}
            >
              Entrar
            </button>
            <button
              className={`btn ${isSignup ? 'btn-primary' : 'btn-outline-primary'}`}
              type="button"
              onClick={() => setIsSignup(true)}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleAuth}>
            {isSignup ? (
              <div className="row g-3">
                <div className="col-md-7">
                  <label className="form-label">Nome completo</label>
                  <input className="form-control" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
                </div>
                <div className="col-md-5">
                  <label className="form-label">Curso</label>
                  <input className="form-control" value={curso} onChange={(e) => setCurso(e.target.value)} />
                </div>
              </div>
            ) : null}

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <label className="form-label">Telefone</label>
                <input className="form-control" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Palavra-passe</label>
                <input className="form-control" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />
              </div>
            </div>

            <button className="btn btn-primary mt-3" disabled={loadingAuth}>
              {loadingAuth ? 'A processar...' : isSignup ? 'Criar conta' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  /** -------------------- Main UI (new dashboard) -------------------- */
  return (
    <div className="min-vh-100 bg-body-tertiary">
      {/* Top header */}
      <div className="bg-white border-bottom sticky-top">
        <div className="container py-2">
          <div className="d-flex align-items-center justify-content-between" style={{ minHeight: 56 }}>
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 text-white fw-bold d-flex align-items-center justify-content-center"
                style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #0d6efd, #6610f2)' }}
              >
                {firstName?.[0] || 'A'}
              </div>
              <div>
                <div className="fw-semibold">Olá, {firstName}</div>
                <div className="text-muted small">{user?.curso || ''}</div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* mentorship switch */}
              <div className="input-group d-none d-md-flex" style={{ minWidth: 360 }}>
                <span className="input-group-text">Mentoria</span>
                <select className="form-select" value={selectedMentorshipId} onChange={(e) => setSelectedMentorshipId(e.target.value)}>
                  {mentorships.map((m) => (
                    <option key={m.id} value={m.id}>
                      {tipoMeta(m.tipoKey).label} — {m.titulo ? m.titulo : 'Sem título'}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button" className="btn btn-light position-relative" onClick={() => setShowNotifModal(true)}>
                <Bell size={18} />
                {notifCount > 0 ? (
                  <span
                    className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
                    style={{ width: 10, height: 10 }}
                  />
                ) : null}
              </button>

              <button type="button" className="btn btn-light" onClick={logout}>
                <LogOut size={18} />
              </button>
            </div>
          </div>

          {/* mobile mentorship switch */}
          <div className="d-md-none mt-2">
            <select className="form-select" value={selectedMentorshipId} onChange={(e) => setSelectedMentorshipId(e.target.value)}>
              {mentorships.map((m) => (
                <option key={m.id} value={m.id}>
                  {tipoMeta(m.tipoKey).label} — {m.titulo ? m.titulo : 'Sem título'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="container py-4">
        {/* Alerts */}
        {erro ? <div className="alert alert-danger">{erro}</div> : null}
        {info ? <div className="alert alert-success">{info}</div> : null}

        {/* Mentorship card */}
        {mentorship ? (
          <div className="p-4 rounded-4 text-white mb-4 shadow-sm" style={{ background: 'linear-gradient(90deg, #0d6efd, #6610f2)' }}>
            <div className="d-flex align-items-start justify-content-between gap-3">
              <div className="flex-grow-1">
                <span className="badge text-bg-light text-dark mb-2">{meta.label}</span>

                <h5 className="fw-semibold mb-2" title={mentorship.titulo}>
                  {truncate(mentorship.titulo || 'Sem título', 100)}
                </h5>

                <div className="d-flex flex-wrap gap-3 small" style={{ color: 'rgba(255,255,255,.85)' }}>
                  <span>📧 {mentorship.email || '-'}</span>
                  <span>📅 Curso: {mentorship.anoInicioCurso || '-'}</span>
                  <span>🎯 Mentoria: {mentorship.anoInicioMentoria || '-'}</span>
                </div>
              </div>

              <button type="button" className="btn btn-outline-light btn-sm">
                <Edit2 size={18} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Welcome / Boas-vindas */}
<div className="card border-0 shadow-sm mb-4">
  <div
    className="card-body p-4 rounded-4"
    style={{
      background: 'linear-gradient(90deg, rgba(13,110,253,.08), rgba(102,16,242,.08))',
    }}
  >
    <div className="d-flex align-items-start gap-3">
      <div
        className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ width: 44, height: 44, background: 'rgba(13,110,253,.12)' }}
      >
        <TrendingUp size={20} className="text-primary" />
      </div>

      <div className="flex-grow-1">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h4 className="mb-0 fw-semibold">Bem-vindo(a), {firstName} 👋</h4>
          {mentorship?.anoInicioMentoria ? (
            <span className="badge text-bg-light border">
              Mentoria desde {mentorship.anoInicioMentoria}
            </span>
          ) : null}
        </div>

        <p className="text-muted mt-2 mb-3">
          Este é o teu espaço de acompanhamento académico. Aqui serás orientado(a) pelo
          <strong> Dr. Lucombo Luveia</strong>, com foco em clareza, rigor e evolução consistente — passo a passo.
        </p>

        <div className="row g-3">
          <div className="col-12 col-lg-4">
            <div className="p-3 bg-white rounded-4 border h-100">
              <div className="fw-semibold mb-1">📄 Submissões organizadas</div>
              <div className="text-muted small">
                Envia versões do teu <strong>Programa</strong> e da tua <strong>{meta.secondaryLabel}</strong>, sempre com nota do que mudou.
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="p-3 bg-white rounded-4 border h-100">
              <div className="fw-semibold mb-1">✅ Feedback e acompanhamento</div>
              <div className="text-muted small">
                Recebe comentários do professor, acompanha “visto” e mantém o teu progresso sempre claro.
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-4">
            <div className="p-3 bg-white rounded-4 border h-100">
              <div className="fw-semibold mb-1">🔔 Notificações em tempo real</div>
              <div className="text-muted small">
                Quando houver resposta, reunião ou atualização, vais ver aqui de forma rápida e simples.
              </div>
            </div>
          </div>
        </div>

        {!latestPrograma ? (
          <div className="alert alert-primary mt-3 mb-0">
            <strong>Dica para começar:</strong> envia o teu <strong>Programa</strong> (mesmo que seja uma versão inicial).
            O Dr. Lucombo Luveia vai orientar os próximos passos a partir daí.
          </div>
        ) : null}
      </div>
    </div>
  </div>
</div>


        {/* Tabs */}
        <ul className="nav nav-tabs bg-white rounded-top-4 px-2 border-bottom" style={{ overflowX: 'auto' }}>
          {[
            { id: 'mentoria', label: 'Mentoria', icon: FileText },
            { id: 'meetings', label: 'Reuniões', icon: Calendar },
            { id: 'questions', label: 'Perguntas', icon: MessageSquare },
            { id: 'progress', label: 'Progresso', icon: TrendingUp },
          ].map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <li className="nav-item" key={t.id}>
                <button type="button" className={`nav-link d-flex align-items-center gap-2 ${active ? 'active' : ''}`} onClick={() => setTab(t.id)}>
                  <Icon size={16} />
                  {t.label}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="bg-white rounded-bottom-4 p-3 border border-top-0">
          {tab === 'mentoria' ? (
            <div className="row g-3">
              <div className="col-12 col-lg-6">
                <DocCard type="programa" title="Programa" doc={latestPrograma} />
              </div>
              <div className="col-12 col-lg-6">
                <DocCard type={meta.secondaryType} title={meta.secondaryLabel} doc={latestSecondary} />
              </div>
            </div>
          ) : null}

          {tab !== 'mentoria' ? (
            <div className="text-center py-5 text-muted">
              <div className="mb-2">Esta tab continua igual à tua versão antiga.</div>
              <div className="small">Se quiseres, eu também converto Meetings/Questions/Progress para este layout novo.</div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Notifications Modal */}
      {showNotifModal ? (
        <ModalShell
          title="Notificações"
          icon={Bell}
          onClose={() => setShowNotifModal(false)}
          footer={<button className="btn btn-outline-secondary" onClick={() => setShowNotifModal(false)}>Fechar</button>}
          size="modal-md"
        >
          {notifItems?.length ? (
            <div className="d-flex flex-column gap-2">
              {notifItems.slice(0, 30).map((n, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="btn btn-light text-start"
                  onClick={() => {
                    // mapping like your old modal
                    if (n.type === 'document') setTab('mentoria')
                    if (n.type === 'meeting') setTab('meetings')
                    if (n.type === 'question') setTab('questions')
                    if (n.type === 'progress') setTab('progress')
                    setShowNotifModal(false)
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-semibold" style={{ fontSize: 14 }}>
                      {n.title}
                    </div>
                    <div className="text-muted small">{fmtDate(n.createdAt)}</div>
                  </div>
                  <div className="text-muted small">{n.message}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-muted">Sem novidades.</div>
          )}
        </ModalShell>
      ) : null}

      {/* Doc Viewer Modal */}
      {selectedDoc ? (
        <DocPreviewModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDownload={() => trackDownload(selectedDoc)}
        />
      ) : null}

      {/* History Modal */}
      {showHistory ? (
        <ModalShell
          title={`Histórico - ${showHistory === 'programa' ? 'Programa' : meta.secondaryLabel}`}
          icon={History}
          onClose={() => setShowHistory(null)}
          footer={<button className="btn btn-outline-secondary" onClick={() => setShowHistory(null)}>Fechar</button>}
        >
          <div className="list-group">
            {(byType[showHistory] || [])
              .filter((d) => (d.kind || 'submission') === 'submission')
              .map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                  onClick={() => openDoc(doc)}
                >
                  <div className="bg-white border rounded-3 p-2 d-inline-flex align-items-center justify-content-center">
                    {(doc.contentType || '').toLowerCase().includes('pdf') ? (
                      <FileText size={20} className="text-danger" />
                    ) : (
                      <File size={20} className="text-primary" />
                    )}
                  </div>

                  <div className="flex-grow-1 min-w-0">
                    <div className="fw-semibold text-truncate" title={doc.filename}>
                      {truncate(doc.filename, 55)}
                    </div>
                    <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                      <span className="badge text-bg-secondary">v{doc.version || 1}</span>
                      <span>{fmtDate(doc.uploadedAt)}</span>
                      {doc.studentUnread ? <span className="badge text-bg-danger ms-1">novo</span> : null}
                    </div>
                  </div>

                  <ChevronRight size={18} className="text-muted" />
                </button>
              ))}
          </div>
        </ModalShell>
      ) : null}

      {/* Upload Modal */}
      {showUpload ? (
        <ModalShell
          title={`Enviar ${showUpload === 'programa' ? 'Programa' : meta.secondaryLabel}`}
          icon={Upload}
          onClose={() => setShowUpload(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setShowUpload(null)} disabled={busy}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={() => uploadDoc({ type: showUpload })} disabled={busy}>
                {busy ? 'A enviar...' : 'Enviar'}
              </button>
            </>
          }
          size="modal-md"
        >
          <div className="mb-3">
            <label className="form-label fw-semibold">Ficheiro</label>
            <input ref={uploadFileRef} type="file" className="form-control" accept=".pdf,.doc,.docx" />
            <div className="form-text">PDF ou Word (.pdf, .doc, .docx)</div>
          </div>

          <div className="mb-0">
            <label className="form-label fw-semibold">Nota (opcional)</label>
            <textarea
              className="form-control"
              rows={4}
              value={uploadNote}
              onChange={(e) => setUploadNote(e.target.value)}
              placeholder="Descreva o que mudou nesta versão..."
            />
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}

/** -------------------- Document Preview (same logic as old: PDF or Google Viewer) -------------------- */
function DocPreviewModal({ doc, onClose, onDownload }) {
  const url = doc?.pdf?.url || doc?.url || doc?.original?.url || ''
  const contentType = doc?.pdf?.contentType || doc?.contentType || doc?.original?.contentType || ''

  const isPdf = (contentType || '').toLowerCase().includes('pdf')
  const canGview = !!url && !isPdf
  const src = !url ? '' : isPdf ? url : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`

  return (
    <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
      <div className="modal-dialog modal-dialog-centered modal-xl" style={{ maxWidth: 1100 }} role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title d-flex align-items-center gap-2">
              <FileText size={18} className="text-primary" />
              {doc?.filename || doc?.original?.filename || 'Documento'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>

          <div className="modal-body">
            {!url ? (
              <div className="alert alert-warning">Sem pré-visualização disponível.</div>
            ) : (
              <iframe title="preview" src={src} style={{ width: '100%', height: '70vh', minHeight: 420, border: '1px solid #ddd', borderRadius: 10 }} />
            )}

            {url && canGview ? <div className="text-muted small mt-2">Nota: para alguns ficheiros Word, o preview usa Google Viewer.</div> : null}
          </div>

          <div className="modal-footer">
            {url ? (
              <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer" onClick={onDownload}>
                <Download size={16} className="me-2" />
                Baixar
              </a>
            ) : null}
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose} />
    </div>
  )
}
