'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'

// UI e labels em PT (LMS simples)
const TIPO_OPCOES = [
  {
    key: 'doutoramento',
    label: 'Doutoramento',
    secondaryType: 'tez',
    secondaryLabel: 'Tese',
    titleLabel: 'Título da Tese'
  },
  {
    key: 'licenciatura',
    label: 'Licenciatura',
    secondaryType: 'monografia',
    secondaryLabel: 'Monografia',
    titleLabel: 'Título da Monografia'
  },
  {
    key: 'mestrado',
    label: 'Mestrado',
    secondaryType: 'dissertacao',
    secondaryLabel: 'Dissertação',
    titleLabel: 'Título da Dissertação'
  },
  {
    key: 'pesquisa',
    label: 'Pesquisa',
    secondaryType: 'pesquisa',
    secondaryLabel: 'Pesquisa',
    titleLabel: 'Título da Pesquisa'
  },
  {
    key: 'outros',
    label: 'Outros',
    secondaryType: 'outras_pesquisa',
    secondaryLabel: 'Outras Pesquisas',
    titleLabel: 'Título da Pesquisa'
  }
]

function tipoMeta(tipoKey) {
  return TIPO_OPCOES.find(t => t.key === (tipoKey || 'licenciatura')) || TIPO_OPCOES[1]
}

function fmtDate(dt) {
  if (!dt) return ''
  try {
    return new Date(dt).toLocaleString()
  } catch {
    return ''
  }
}

export default function MentoringAlunoPage() {
  // auth
  const [user, setUser] = useState(null)
  const [loadingAuth, setLoadingAuth] = useState(false)

  // login/signup
  const [isSignup, setIsSignup] = useState(false)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [curso, setCurso] = useState('')

  // mentorias
  const [mentorships, setMentorships] = useState([])
  const [selectedMentorshipId, setSelectedMentorshipId] = useState('')

  // dados por mentoria
  const [documents, setDocuments] = useState([])
  const [meetings, setMeetings] = useState([])
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState([])

  // UI state
  const [tab, setTab] = useState('docs')
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  // notificações
  const [notifCount, setNotifCount] = useState(0)
  const [notifItems, setNotifItems] = useState([])
  const [showNotifModal, setShowNotifModal] = useState(false)

  // modais
  const [showMentoriaModal, setShowMentoriaModal] = useState(false)
  const [editingMentoria, setEditingMentoria] = useState(null)
  const [showDocModal, setShowDocModal] = useState(false)
  const [docModalDoc, setDocModalDoc] = useState(null)
  const [showAskModal, setShowAskModal] = useState(false)
  const [askText, setAskText] = useState('')
  const [askDetail, setAskDetail] = useState('')
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [meetingDateTime, setMeetingDateTime] = useState('')
  const [meetingTopic, setMeetingTopic] = useState('')

  // upload
  const fileProgramaRef = useRef(null)
  const fileSecRef = useRef(null)
  const [studentNotePrograma, setStudentNotePrograma] = useState('')
  const [studentNoteSec, setStudentNoteSec] = useState('')

  const mentorship = useMemo(
    () => mentorships.find(m => m.id === selectedMentorshipId) || null,
    [mentorships, selectedMentorshipId]
  )
  const meta = useMemo(() => tipoMeta(mentorship?.tipoKey), [mentorship])

  const firstName = useMemo(() => {
    const n = (user?.nomeCompleto || '').toString().trim()
    return n ? n.split(/\s+/)[0] : 'Aluno'
  }, [user?.nomeCompleto])

  const nextMeeting = useMemo(() => {
    const now = Date.now()
    const accepted = (meetings || [])
      .filter(m => m?.status === 'accepted' && m?.datetime)
      .map(m => ({ ...m, _t: new Date(m.datetime).getTime() }))
      .filter(m => Number.isFinite(m._t) && m._t >= now)
      .sort((a, b) => a._t - b._t)
    return accepted[0] || null
  }, [meetings])

  const docCounts = useMemo(() => {
    const total = (documents || []).filter(d => (d?.kind || 'submission') === 'submission').length
    const unread = (documents || []).filter(d => !!d?.studentUnread).length
    return { total, unread }
  }, [documents])

  // ---- init auth from localStorage ----
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

  // carregar mentorias quando user existe
  useEffect(() => {
    if (!user?.id) return
    carregarMentorias()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // selecciona mentoria (persist)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!selectedMentorshipId) return
    window.localStorage.setItem('mentoringSelectedMentorshipId', selectedMentorshipId)
  }, [selectedMentorshipId])

  // carregar tudo quando mentoria muda
  useEffect(() => {
    if (!user?.id || !selectedMentorshipId) return
    carregarTudo()

    // poll de notificações
    const t = setInterval(() => {
      carregarNotificacoes()
    }, 8000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedMentorshipId])

  async function carregarMentorias() {
    try {
      const res = await axios.get(`/api/mentoring/mentorships?alunoId=${user.id}`)
      const list = res.data?.mentorships || []
      setMentorships(list)

      // escolher a última seleccionada se existir
      let chosen = ''
      if (typeof window !== 'undefined') {
        chosen = window.localStorage.getItem('mentoringSelectedMentorshipId') || ''
      }

      if (chosen && list.some(m => m.id === chosen)) {
        setSelectedMentorshipId(chosen)
      } else {
        setSelectedMentorshipId(list[0]?.id || '')
      }

      // se a mentoria padrão estiver incompleta, abre modal para completar
      const first = list[0]
      const needs = first && (!first.email || !first.titulo || !first.anoInicioMentoria)
      if (needs) {
        setEditingMentoria(first)
        setShowMentoriaModal(true)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarTudo() {
    await Promise.all([carregarDocs(), carregarMeetings(), carregarQuestions(), carregarProgress(), carregarNotificacoes()])
  }

  async function carregarDocs() {
    try {
      const res = await axios.get(`/api/mentoring/documents?mentorshipId=${selectedMentorshipId}`)
      setDocuments(res.data?.documents || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarMeetings() {
    try {
      const res = await axios.get(`/api/mentoring/meetings?mentorshipId=${selectedMentorshipId}`)
      setMeetings(res.data?.meetings || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarQuestions() {
    try {
      const res = await axios.get(
        `/api/mentoring/questions?alunoId=${user.id}&mentorshipId=${selectedMentorshipId}`
      )
      setQuestions(res.data?.perguntas || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarProgress() {
    try {
      const res = await axios.get(`/api/mentoring/progress?mentorshipId=${selectedMentorshipId}`)
      setProgress(res.data?.progress || [])
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

  // ---------------- AUTH ----------------
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
          curso
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
    setMeetings([])
    setQuestions([])
    setProgress([])
    setNotifCount(0)
    setNotifItems([])
    setErro('')
    setInfo('')
  }

  // ---------------- Mentorias ----------------
  function abrirNovaMentoria() {
    setEditingMentoria(null)
    setShowMentoriaModal(true)
  }

  function abrirEditarMentoria() {
    if (!mentorship) return
    setEditingMentoria(mentorship)
    setShowMentoriaModal(true)
  }

  async function salvarMentoria(form) {
    setErro('')
    setInfo('')
    setBusy(true)
    try {
      if (editingMentoria?.id) {
        await axios.patch(`/api/mentoring/mentorships/${editingMentoria.id}`, form)
        setInfo('Mentoria actualizada.')
      } else {
        await axios.post('/api/mentoring/mentorships', { alunoId: user.id, ...form })
        setInfo('Mentoria criada.')
      }
      setShowMentoriaModal(false)
      setEditingMentoria(null)
      await carregarMentorias()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao guardar mentoria.')
    } finally {
      setBusy(false)
    }
  }

  // ---------------- Documentos ----------------
  const byType = useMemo(() => {
    const m = {
      programa: [],
      [meta.secondaryType]: []
    }
    documents.forEach(d => {
      if (!d?.type) return
      if (!m[d.type]) m[d.type] = []
      m[d.type].push(d)
    })
    // ordenar por versão desc / datas
    Object.keys(m).forEach(k => {
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
      programa: (byType.programa || []).filter(d => (d.kind || 'submission') === 'submission'),
      secondary: (byType[meta.secondaryType] || []).filter(d => (d.kind || 'submission') === 'submission')
    }
  }, [byType, meta.secondaryType])

  const correctionsByParent = useMemo(() => {
    const m = {}
    documents
      .filter(d => d.kind === 'correction' && d.parentDocumentId)
      .forEach(d => {
        const pid = d.parentDocumentId
        m[pid] = m[pid] || []
        m[pid].push(d)
      })
    Object.keys(m).forEach(pid => {
      m[pid].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dbt = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dbt - da
      })
    })
    return m
  }, [documents])

  const resourcesByType = useMemo(() => {
    const m = {}
    documents
      .filter(d => d.kind === 'resource')
      .forEach(d => {
        const t = d.type
        if (!t) return
        m[t] = m[t] || []
        m[t].push(d)
      })
    Object.keys(m).forEach(t => {
      m[t].sort((a, b) => {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dbt = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dbt - da
      })
    })
    return m
  }, [documents])

  async function uploadDoc({ type, file, studentNote }) {
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
      if (type === 'programa') {
        setStudentNotePrograma('')
        if (fileProgramaRef.current) fileProgramaRef.current.value = ''
      } else {
        setStudentNoteSec('')
        if (fileSecRef.current) fileSecRef.current.value = ''
      }

      await carregarDocs()
      await carregarNotificacoes()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao enviar documento.')
    } finally {
      setBusy(false)
    }
  }

  async function openDocModal(doc) {
    if (!doc?.id) return
    setDocModalDoc(doc)
    setShowDocModal(true)
    try {
      await axios.patch(`/api/mentoring/documents/${doc.id}/event`, { role: 'student', action: 'view' })
      // refresh para remover badge de "novo"
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

  // ---------------- Reuniões ----------------
  async function criarReuniao() {
    if (!meetingDateTime || !meetingTopic.trim()) {
      setErro('Defina data/hora e tópico.')
      return
    }
    setErro('')
    setInfo('')
    setBusy(true)
    try {
      await axios.post('/api/mentoring/meetings', {
        mentorshipId: selectedMentorshipId,
        alunoId: user.id,
        requestedBy: 'student',
        datetime: new Date(meetingDateTime).toISOString(),
        topic: meetingTopic
      })
      setShowMeetingModal(false)
      setMeetingDateTime('')
      setMeetingTopic('')
      setInfo('Pedido de reunião enviado.')
      await carregarMeetings()
      await carregarNotificacoes()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao solicitar reunião.')
    } finally {
      setBusy(false)
    }
  }

  async function meetingAction(id, action) {
    setBusy(true)
    try {
      await axios.patch(`/api/mentoring/meetings/${id}`, { action })
      await carregarMeetings()
      await carregarNotificacoes()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  // ---------------- Perguntas ----------------
  async function enviarPergunta() {
    if (!askText.trim()) {
      setErro('Escreva uma pergunta.')
      return
    }
    setErro('')
    setInfo('')
    setBusy(true)
    try {
      await axios.post('/api/mentoring/questions', {
        alunoId: user.id,
        mentorshipId: selectedMentorshipId,
        pergunta: askText,
        detalhe: askDetail
      })
      setAskText('')
      setAskDetail('')
      setShowAskModal(false)
      setInfo('Pergunta enviada.')
      await carregarQuestions()
      await carregarNotificacoes()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao enviar pergunta.')
    } finally {
      setBusy(false)
    }
  }

  async function markQuestionRead(q) {
    if (!q?.id) return
    try {
      await axios.patch(`/api/mentoring/questions/${q.id}`, { action: 'markStudentRead' })
      await carregarQuestions()
      await carregarNotificacoes()
    } catch {
      // ignore
    }
  }

  // ---------------- Progresso ----------------
  async function marcarProgressoComoLido() {
    try {
      await axios.patch('/api/mentoring/progress/mark-read', { mentorshipId: selectedMentorshipId })
      await carregarProgress()
      await carregarNotificacoes()
    } catch {
      // ignore
    }
  }

  // ---------------- UI (login) ----------------
  if (!user) {
    return (
      <div className="container py-5" style={{ maxWidth: 860 }}>
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h2 className="mb-1">Mentoria</h2>
            <div className="text-muted">Acesso do aluno</div>
          </div>
          <span className="badge text-bg-light">
            <i className="bi bi-mortarboard me-1" /> LMS
          </span>
        </div>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        <div className="card modern-card p-4">
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
            {isSignup && (
              <>
                <div className="row g-3">
                  <div className="col-md-7">
                    <label className="form-label">Nome completo</label>
                    <input className="form-control" value={nomeCompleto} onChange={e => setNomeCompleto(e.target.value)} />
                  </div>
                  <div className="col-md-5">
                    <label className="form-label">Curso</label>
                    <input className="form-control" value={curso} onChange={e => setCurso(e.target.value)} />
                  </div>
                </div>
              </>
            )}

            <div className="row g-3 mt-1">
              <div className="col-md-6">
                <label className="form-label">Telefone</label>
                <input className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Palavra-passe</label>
                <input className="form-control" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
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

  return (
    <div className="container py-4" style={{ maxWidth: 1200 }}>
      {/* Top bar */}
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2 mb-3">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2 className="mb-0">Painel do Aluno</h2>
            {mentorship ? (
              <span className="badge text-bg-light">
                <i className="bi bi-clipboard-check me-1" /> {tipoMeta(mentorship.tipoKey).label}
              </span>
            ) : null}
          </div>
          <div className="text-muted">{user.nomeCompleto}</div>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* switch mentoria */}
          <div className="input-group" style={{ minWidth: 320 }}>
            <span className="input-group-text">
              <i className="bi bi-diagram-3" />
            </span>
            <select
              className="form-select"
              value={selectedMentorshipId}
              onChange={e => setSelectedMentorshipId(e.target.value)}
            >
              {mentorships.map(m => (
                <option key={m.id} value={m.id}>
                  {tipoMeta(m.tipoKey).label} — {m.titulo ? m.titulo : 'Sem título'}
                </option>
              ))}
            </select>
          </div>

          <button className="btn btn-outline-primary" type="button" onClick={abrirNovaMentoria}>
            <i className="bi bi-plus-lg me-1" /> Nova mentoria
          </button>

          <button
            className="btn btn-outline-secondary position-relative"
            type="button"
            onClick={() => setShowNotifModal(true)}
          >
            <i className="bi bi-bell" />
            {notifCount ? (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                {notifCount}
              </span>
            ) : null}
          </button>

          <button className="btn btn-outline-danger" type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </div>

      {/* Welcome dashboard */}
      <div className="card modern-card hero-gradient p-4 mb-3">
        <div className="row g-3 align-items-center">
          <div className="col-lg-7">
            <div className="d-flex align-items-center gap-2 mb-1">
              <span className="badge text-bg-light">
                <i className="bi bi-stars me-1" /> Bem-vindo
              </span>
              {notifCount ? <span className="badge text-bg-danger">{notifCount} novidades</span> : null}
            </div>
            <h3 className="mb-2">Olá, {firstName} 👋</h3>
            <div className="text-muted" style={{ maxWidth: 720 }}>
              Este é o seu espaço de acompanhamento. Aqui você envia o seu <strong>Programa</strong> e a sua{' '}
              <strong>{meta.secondaryLabel}</strong>, recebe feedback e acompanha o progresso.
              <div className="mt-2">
                <span className="fw-semibold">Dr. Lucombo</span> acompanha este processo com rigor e clareza — foco em estrutura,
                consistência e evolução versão a versão.
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="row g-2">
              <div className="col-6">
                <div className="p-3 bg-white rounded-4 soft-border">
                  <div className="text-muted small">Próxima reunião</div>
                  <div className="fw-semibold truncate-1" style={{ maxWidth: '100%' }} title={nextMeeting?.topic || ''}>
                    {nextMeeting ? (nextMeeting.topic || 'Reunião') : '—'}
                  </div>
                  <div className="text-muted small">{nextMeeting?.datetime ? fmtDate(nextMeeting.datetime) : 'Sem reunião marcada'}</div>
                </div>
              </div>
              <div className="col-6">
                <div className="p-3 bg-white rounded-4 soft-border">
                  <div className="text-muted small">Submissões</div>
                  <div className="fw-semibold">{docCounts.total}</div>
                  <div className="text-muted small">Atualizações: {docCounts.unread}</div>
                </div>
              </div>
              <div className="col-12">
                <div className="p-3 bg-white rounded-4 soft-border d-flex align-items-center justify-content-between gap-2">
                  <div>
                    <div className="fw-semibold">Dica rápida</div>
                    <div className="text-muted small">Antes de enviar, confirme o título e adicione uma nota curta (o que mudou).</div>
                  </div>
                  <button className="btn btn-primary" type="button" onClick={() => setTab('docs')}>
                    <i className="bi bi-upload me-1" /> Enviar agora
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      {/* Mentoria Info */}
      {mentorship && (
        <div className="card modern-card p-3 mb-3">
          <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-2">
            <div>
              <div className="fw-semibold truncate-1" style={{ maxWidth: 780 }} title={mentorship.titulo || ''}>
                <i className="bi bi-journal-text me-2" /> {mentorship.titulo ? mentorship.titulo : 'Sem título'}
              </div>
              <div className="text-muted small">
                Email: <strong>{mentorship.email || '-'}</strong> · Ano do curso:{' '}
                <strong>{mentorship.anoInicioCurso || '-'}</strong> · Ano da mentoria:{' '}
                <strong>{mentorship.anoInicioMentoria || '-'}</strong>
              </div>
            </div>
            <div className="d-flex gap-2">
              <button className="btn btn-outline-secondary" type="button" onClick={abrirEditarMentoria}>
                <i className="bi bi-pencil-square me-1" /> Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button className={`nav-link ${tab === 'docs' ? 'active' : ''}`} onClick={() => setTab('docs')}>
            <i className="bi bi-files me-1" /> Documentos
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'meetings' ? 'active' : ''}`} onClick={() => setTab('meetings')}>
            <i className="bi bi-calendar-event me-1" /> Reuniões
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
            <i className="bi bi-chat-dots me-1" /> Perguntas
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${tab === 'progress' ? 'active' : ''}`} onClick={() => setTab('progress')}>
            <i className="bi bi-graph-up-arrow me-1" /> Progresso
          </button>
        </li>
      </ul>

      {tab === 'docs' ? (
        <div className="row g-3">
          <div className="col-lg-6">
            <DocSection
              title="Programa"
              type="programa"
              fileRef={fileProgramaRef}
              note={studentNotePrograma}
              setNote={setStudentNotePrograma}
              onUpload={(file, note) => uploadDoc({ type: 'programa', file, studentNote: note })}
              submissions={submissions.programa}
              resources={resourcesByType.programa || []}
              correctionsByParent={correctionsByParent}
              onPreview={openDocModal}
              onDownload={trackDownload}
              busy={busy}
            />
          </div>
          <div className="col-lg-6">
            <DocSection
              title={meta.secondaryLabel}
              type={meta.secondaryType}
              fileRef={fileSecRef}
              note={studentNoteSec}
              setNote={setStudentNoteSec}
              onUpload={(file, note) => uploadDoc({ type: meta.secondaryType, file, studentNote: note })}
              submissions={submissions.secondary}
              resources={resourcesByType[meta.secondaryType] || []}
              correctionsByParent={correctionsByParent}
              onPreview={openDocModal}
              onDownload={trackDownload}
              busy={busy}
            />
          </div>
        </div>
      ) : null}

      {tab === 'meetings' ? (
        <div className="card modern-card p-4">
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Reuniões</h4>
            <button className="btn btn-primary" type="button" onClick={() => setShowMeetingModal(true)}>
              <i className="bi bi-plus-lg me-1" /> Solicitar reunião
            </button>
          </div>
          <div className="text-muted small mt-1">Pedidos ficam pendentes até o professor aceitar.</div>

          <div className="mt-3 d-flex flex-column gap-2">
            {meetings.length === 0 ? (
              <div className="text-muted">Sem reuniões.</div>
            ) : (
              meetings.map(m => (
                <div key={m.id} className="border rounded p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-semibold">
                      <i className="bi bi-calendar2-week me-2" /> {m.topic || 'Reunião'}
                    </div>
                    <span className={`badge ${m.status === 'accepted' ? 'text-bg-success' : m.status === 'rejected' ? 'text-bg-danger' : 'text-bg-warning'}`}>
                      {m.status}
                    </span>
                  </div>
                  <div className="text-muted small mt-1">
                    Data/Hora: <strong>{m.datetime ? fmtDate(m.datetime) : '-'}</strong> · Pedido por:{' '}
                    <strong>{m.requestedBy === 'teacher' ? 'Professor' : 'Aluno'}</strong>
                  </div>

                  {/* Acções do aluno */}
                  {m.status === 'pending' && m.requestedBy === 'teacher' ? (
                    <div className="d-flex gap-2 mt-2">
                      <button className="btn btn-sm btn-success" type="button" disabled={busy} onClick={() => meetingAction(m.id, 'accept')}>
                        Aceitar
                      </button>
                      <button className="btn btn-sm btn-outline-danger" type="button" disabled={busy} onClick={() => meetingAction(m.id, 'reject')}>
                        Rejeitar
                      </button>
                    </div>
                  ) : null}

                  {m.studentUnread ? (
                    <button className="btn btn-sm btn-outline-secondary mt-2" type="button" disabled={busy} onClick={() => meetingAction(m.id, 'markStudentRead')}>
                      Marcar como lida
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === 'questions' ? (
        <div className="card modern-card p-4">
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Perguntas</h4>
            <button className="btn btn-primary" type="button" onClick={() => setShowAskModal(true)}>
              <i className="bi bi-send me-1" /> Fazer pergunta
            </button>
          </div>

          <div className="mt-3 d-flex flex-column gap-2">
            {questions.length === 0 ? (
              <div className="text-muted">Ainda não enviou perguntas.</div>
            ) : (
              questions.map(q => (
                <div key={q.id} className="border rounded p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-semibold">
                      <i className="bi bi-chat-left-text me-2" /> {q.pergunta}
                    </div>
                    {q.studentUnread ? <span className="badge text-bg-danger">nova resposta</span> : null}
                  </div>
                  {q.detalhe ? <div className="text-muted small mt-1">{q.detalhe}</div> : null}

                  <div className="mt-2">
                    <div className="small text-muted">Resposta do professor</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                      {q.resposta ? q.resposta : <span className="text-muted">(sem resposta)</span>}
                    </div>
                  </div>

                  <div className="text-muted small mt-2">Enviado: {fmtDate(q.createdAt)}</div>

                  {q.studentUnread ? (
                    <button className="btn btn-sm btn-outline-secondary mt-2" type="button" onClick={() => markQuestionRead(q)}>
                      Marcar como lida
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {tab === 'progress' ? (
        <div className="card modern-card p-4">
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">Progresso</h4>
            {progress.some(p => p.studentUnread) ? (
              <button className="btn btn-outline-secondary" type="button" onClick={marcarProgressoComoLido}>
                Marcar tudo como lido
              </button>
            ) : null}
          </div>
          <div className="text-muted small mt-1">Notas do professor sobre a sua evolução.</div>

          <div className="mt-3 d-flex flex-column gap-2">
            {progress.length === 0 ? (
              <div className="text-muted">Sem notas de progresso.</div>
            ) : (
              progress.map(p => (
                <div key={p.id} className="border rounded p-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="fw-semibold">
                      <i className="bi bi-check2-circle me-2" /> {fmtDate(p.createdAt)}
                    </div>
                    {p.studentUnread ? <span className="badge text-bg-danger">novo</span> : null}
                  </div>
                  <div className="mt-2" style={{ whiteSpace: 'pre-wrap' }}>{p.note}</div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}

      {/* Modal mentoria */}
      {showMentoriaModal && (
        <MentoriaModal
          initial={editingMentoria}
          busy={busy}
          onClose={() => {
            setShowMentoriaModal(false)
            setEditingMentoria(null)
          }}
          onSave={salvarMentoria}
        />
      )}

      {/* Modal pergunta */}
      {showAskModal && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Nova pergunta</h5>
                <button type="button" className="btn-close" onClick={() => setShowAskModal(false)} />
              </div>
              <div className="modal-body">
                <label className="form-label">Pergunta</label>
                <input className="form-control" value={askText} onChange={e => setAskText(e.target.value)} />
                <label className="form-label mt-3">Detalhe (opcional)</label>
                <textarea className="form-control" rows={5} value={askDetail} onChange={e => setAskDetail(e.target.value)} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAskModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={enviarPergunta}>
                  {busy ? 'A enviar...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal reunião */}
      {showMeetingModal && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Solicitar reunião</h5>
                <button type="button" className="btn-close" onClick={() => setShowMeetingModal(false)} />
              </div>
              <div className="modal-body">
                <label className="form-label">Data e hora</label>
                <input
                  className="form-control"
                  type="datetime-local"
                  value={meetingDateTime}
                  onChange={e => setMeetingDateTime(e.target.value)}
                />
                <label className="form-label mt-3">Tópico</label>
                <input className="form-control" value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} />
                <div className="text-muted small mt-2">O professor vai aceitar ou sugerir outra data.</div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" disabled={busy} onClick={criarReuniao}>
                  {busy ? 'A enviar...' : 'Enviar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal preview doc */}
      {showDocModal && docModalDoc && (
        <DocumentPreviewModal
          doc={docModalDoc}
          onClose={() => {
            setShowDocModal(false)
            setDocModalDoc(null)
          }}
          onDownload={() => trackDownload(docModalDoc)}
        />
      )}

      {/* Modal notificações */}
      {showNotifModal && (
        <NotificationsModal
          items={notifItems}
          onClose={() => setShowNotifModal(false)}
          onGo={t => {
            setTab(t)
            setShowNotifModal(false)
          }}
        />
      )}

      {/* backdrop */}
      {(showMentoriaModal || showDocModal || showAskModal || showMeetingModal || showNotifModal) && (
        <div className="modal-backdrop show" />
      )}
    </div>
  )
}

function DocSection({
  title,
  type,
  fileRef,
  note,
  setNote,
  onUpload,
  submissions,
  resources,
  correctionsByParent,
  onPreview,
  onDownload,
  busy
}) {
  const latest = submissions?.[0] || null
  const pastSubmissions = (submissions || []).slice(1)
  const [showHistory, setShowHistory] = useState(false)
  const [pickedName, setPickedName] = useState('')

  return (
    <div className="card modern-card p-4 h-100">
      <div className="d-flex align-items-center justify-content-between">
        <h4 className="mb-0">{title}</h4>
        <span className="badge text-bg-light text-uppercase">{type}</span>
      </div>

      <div className="mt-3">
        <div className="fw-semibold mb-2">
          <i className="bi bi-upload me-2" /> Enviar nova versão
        </div>

        <label className="file-drop d-block" style={{ cursor: 'pointer' }}>
          <div className="d-flex align-items-center justify-content-between gap-2">
            <div>
              <div className="fw-semibold">
                <i className="bi bi-cloud-arrow-up me-2" /> {pickedName ? 'Ficheiro selecionado' : 'Clique para escolher um ficheiro'}
              </div>
              <div className="text-muted small truncate-1" style={{ maxWidth: 520 }} title={pickedName}>
                {pickedName ? pickedName : 'PDF ou Word (.pdf, .doc, .docx)'}
              </div>
            </div>
            <span className="btn btn-sm btn-outline-primary">Procurar</span>
          </div>
          <input
            ref={fileRef}
            className="d-none"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={e => setPickedName(e?.target?.files?.[0]?.name || '')}
          />
        </label>
        <textarea
          className="form-control mt-2"
          rows={3}
          placeholder="Nota (opcional)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <button
          type="button"
          className="btn btn-primary mt-2 rounded-4"
          disabled={busy}
          onClick={() => {
            const f = fileRef?.current?.files?.[0] || null
            onUpload(f, note)
          }}
        >
          {busy ? 'A enviar...' : 'Enviar'}
        </button>
        <div className="text-muted small mt-2">
          Mantemos histórico completo (todas as versões ficam guardadas).
        </div>
      </div>

      {/* Recursos */}
      <div className="mt-4">
        <div className="fw-semibold mb-2">
          <i className="bi bi-book me-2" /> Recursos de apoio
        </div>
        {resources?.length ? (
          <div className="d-flex flex-column gap-2">
            {resources.map(r => (
              <div key={r.id} className="p-3 bg-white rounded-4 soft-border d-flex align-items-center justify-content-between gap-2">
                <div style={{ minWidth: 0 }}>
                  <div className="fw-semibold" style={{ fontSize: 14 }}>
                    <i className="bi bi-file-earmark-text me-2" />
                    <span className="truncate-1" style={{ maxWidth: 420 }} title={r.original?.filename || ''}>
                      {r.original?.filename || 'Recurso'}
                    </span>
                    {r.studentUnread ? <span className="badge text-bg-danger ms-2">novo</span> : null}
                  </div>
                  <div className="text-muted small">{fmtDate(r.createdAt)}</div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onPreview(r)}>
                    Ver
                  </button>
                  {r.original?.url ? (
                    <a
                      className="btn btn-sm btn-outline-secondary"
                      href={r.original.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onDownload(r)}
                    >
                      Baixar
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted">Sem recursos ainda.</div>
        )}
      </div>

      {/* Última versão */}
      <div className="mt-4">
        <div className="fw-semibold mb-2">
          <i className="bi bi-clock-history me-2" /> Última versão
        </div>
        {!latest ? (
          <div className="text-muted">Ainda não enviou nenhum ficheiro.</div>
        ) : (
          <SubmissionCard
            doc={latest}
            corrections={correctionsByParent[latest.id] || []}
            onPreview={onPreview}
            onDownload={onDownload}
          />
        )}
      </div>

      {/* Histórico (limpo: escondido por padrão) */}
      <div className="mt-4">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="fw-semibold">
            <i className="bi bi-layers me-2" /> Histórico
          </div>
          {pastSubmissions.length ? (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => setShowHistory(v => !v)}
            >
              {showHistory ? 'Esconder histórico' : `Ver histórico (${pastSubmissions.length})`}
            </button>
          ) : null}
        </div>

        {!pastSubmissions.length ? (
          <div className="text-muted">Sem histórico ainda.</div>
        ) : showHistory ? (
          <div className="d-flex flex-column gap-2">
            {pastSubmissions.map(s => (
              <div key={s.id}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <div className="text-muted small">
                    <span className="badge text-bg-light me-2">v{s.version || 1}</span>
                    {fmtDate(s.createdAt || s.updatedAt)}
                    {s.studentUnread ? <span className="badge text-bg-danger ms-2">novo</span> : null}
                  </div>
                </div>
                <SubmissionCard
                  doc={s}
                  corrections={correctionsByParent[s.id] || []}
                  onPreview={onPreview}
                  onDownload={onDownload}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted">Histórico escondido.</div>
        )}
      </div>
    </div>
  )
}

function NotificationsModal({ items, onClose, onGo }) {
  const mapped = (items || []).slice(0, 30)

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Notificações</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {mapped.length === 0 ? (
              <div className="text-muted">Sem novidades.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {mapped.map((n, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn btn-light text-start"
                    onClick={() => {
                      if (n.type === 'document') onGo('docs')
                      if (n.type === 'meeting') onGo('meetings')
                      if (n.type === 'question') onGo('questions')
                      if (n.type === 'progress') onGo('progress')
                    }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="fw-semibold" style={{ fontSize: 14 }}>{n.title}</div>
                      <div className="text-muted small">{fmtDate(n.createdAt)}</div>
                    </div>
                    <div className="text-muted small">{n.message}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SubmissionCard({ doc, corrections, onPreview, onDownload }) {
  return (
    <div className="p-3 bg-white rounded-4 soft-border">
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div>
          <div className="fw-semibold" style={{ minWidth: 0 }}>
            <i className="bi bi-file-earmark me-2" />
            <span className="truncate-1" style={{ maxWidth: 520 }} title={doc.original?.filename || ''}>
              {doc.original?.filename || 'Documento'}
            </span>
          </div>
          <div className="text-muted small">
            Enviado: <strong>{fmtDate(doc.createdAt)}</strong> · Versão: <strong>{doc.version || 1}</strong>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onPreview(doc)}>
            Pré-visualizar
          </button>
          {doc.original?.url ? (
            <a
              className="btn btn-sm btn-outline-secondary"
              href={doc.original.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => onDownload(doc)}
            >
              Download
            </a>
          ) : null}
        </div>
      </div>

      <div className="row g-2 mt-2">
        <div className="col-md-6">
          <div className="small text-muted">Sua nota</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{doc.studentNote ? doc.studentNote : <span className="text-muted">(sem nota)</span>}</div>
        </div>
        <div className="col-md-6">
          <div className="small text-muted">Feedback do professor</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{doc.teacherNote ? doc.teacherNote : <span className="text-muted">(sem feedback)</span>}</div>
        </div>
      </div>

      <div className="text-muted small mt-2">
        <i className="bi bi-eye me-1" /> Visto pelo professor: <strong>{doc.teacherViewedAt ? fmtDate(doc.teacherViewedAt) : '-'}</strong> ·{' '}
        <i className="bi bi-download me-1" /> Baixado: <strong>{doc.teacherDownloadedAt ? fmtDate(doc.teacherDownloadedAt) : '-'}</strong>
      </div>

      {corrections?.length ? (
        <div className="mt-3">
          <div className="fw-semibold mb-2">
            <i className="bi bi-pencil-square me-2" /> Correções do professor
          </div>
          <div className="d-flex flex-column gap-2">
            {corrections.map(c => (
              <div key={c.id} className="p-3 bg-white rounded-4 soft-border d-flex align-items-center justify-content-between gap-2">
                <div>
                  <div className="fw-semibold" style={{ fontSize: 14 }}>
                    <i className="bi bi-file-earmark-check me-2" />
                    <span className="truncate-1" style={{ maxWidth: 420 }} title={c.original?.filename || ''}>
                      {c.original?.filename || 'Correção'}
                    </span>
                    {c.studentUnread ? <span className="badge text-bg-danger ms-2">novo</span> : null}
                  </div>
                  <div className="text-muted small">{fmtDate(c.createdAt)}</div>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onPreview(c)}>
                    Ver
                  </button>
                  {c.original?.url ? (
                    <a
                      className="btn btn-sm btn-outline-secondary"
                      href={c.original.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => onDownload(c)}
                    >
                      Baixar
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DocumentPreviewModal({ doc, onClose, onDownload }) {
  const url = doc?.pdf?.url || doc?.original?.url || ''
  const contentType = doc?.pdf?.contentType || doc?.original?.contentType || ''

  const isPdf = (contentType || '').toLowerCase().includes('pdf')
  const canGview = !!url && !isPdf
  const src = !url ? '' : isPdf ? url : `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-fullscreen" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-file-earmark-text me-2" /> {doc?.original?.filename || 'Documento'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {!url ? (
              <div className="alert alert-warning">Sem pré-visualização disponível.</div>
            ) : (
              <iframe
                title="preview"
                src={src}
                style={{ width: '100%', height: '85vh', border: '1px solid #ddd', borderRadius: 10 }}
              />
            )}

            {url && canGview ? (
              <div className="text-muted small mt-2">
                Nota: para alguns ficheiros Word, o preview usa Google Viewer.
              </div>
            ) : null}
          </div>
          <div className="modal-footer">
            {url ? (
              <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer" onClick={onDownload}>
                <i className="bi bi-download me-1" /> Baixar
              </a>
            ) : null}
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MentoriaModal({ initial, busy, onClose, onSave }) {
  const [email, setEmail] = useState(initial?.email || '')
  const [tipoKey, setTipoKey] = useState(initial?.tipoKey || 'licenciatura')
  const [anoInicioCurso, setAnoInicioCurso] = useState(initial?.anoInicioCurso || '')
  const [anoInicioMentoria, setAnoInicioMentoria] = useState(initial?.anoInicioMentoria || '')
  const [titulo, setTitulo] = useState(initial?.titulo || '')

  const meta = useMemo(() => tipoMeta(tipoKey), [tipoKey])

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{initial?.id ? 'Editar mentoria' : 'Nova mentoria'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">Email do aluno</label>
                <input className="form-control" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Tipo de mentoria</label>
                <select className="form-select" value={tipoKey} onChange={e => setTipoKey(e.target.value)}>
                  {TIPO_OPCOES.map(o => (
                    <option key={o.key} value={o.key}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">Ano que começou o curso</label>
                <input
                  className="form-control"
                  type="number"
                  value={anoInicioCurso}
                  onChange={e => setAnoInicioCurso(e.target.value)}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Ano que começou a mentoria</label>
                <input
                  className="form-control"
                  type="number"
                  value={anoInicioMentoria}
                  onChange={e => setAnoInicioMentoria(e.target.value)}
                />
              </div>

              <div className="col-12">
                <label className="form-label">{meta.titleLabel}</label>
                <input className="form-control" value={titulo} onChange={e => setTitulo(e.target.value)} />
              </div>
            </div>

            <div className="alert alert-info mt-3 mb-0">
              <div className="fw-semibold mb-1"><i className="bi bi-info-circle me-2" /> Documentos desta mentoria</div>
              <div className="small">
                <strong>Programa</strong> + <strong>{meta.secondaryLabel}</strong>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => onSave({ email, tipoKey, anoInicioCurso, anoInicioMentoria, titulo })}
            >
              {busy ? 'A guardar...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
