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
  UserCheck,
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
function ModalShell({ title, icon: Icon, onClose, children, footer, size = 'modal-lg', closable = true, mandatory = false }) {
  return (
    <>
      <div className="modal-backdrop fade show" onClick={closable ? onClose : undefined} style={{ cursor: closable ? 'pointer' : 'default' }} />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true">
        <div className={`modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}`}>
          <div className="modal-content border-0 shadow">
            <div className="modal-header">
              <div className="d-flex align-items-center gap-2">
                {Icon ? <Icon size={20} className="text-primary" /> : null}
                <h5 className="modal-title mb-0">{title}</h5>
              </div>
              {closable && !mandatory && (
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={onClose}>
                  <X size={18} />
                </button>
              )}
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
  const [questions, setQuestions] = useState([])
  const [meetings, setMeetings] = useState([])

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

  /** -------- Edit Mentorship -------- */
  const [editingMentorship, setEditingMentorship] = useState(false)
  const [editForm, setEditForm] = useState({
    titulo: '',
    email: '',
    tipoKey: '',
    anoInicioCurso: '',
    anoInicioMentoria: '',
  })

  /** -------- Create Mentorship -------- */
  const [showCreateMentorship, setShowCreateMentorship] = useState(false)
  const [createForm, setCreateForm] = useState({
    tipoKey: 'mestrado',
    titulo: '',
    anoInicioCurso: '',
    anoInicioMentoria: '',
    email: '',
  })

  /** -------- Upload form (modal) -------- */
  const uploadFileRef = useRef(null)
  const [uploadNote, setUploadNote] = useState('')

  /** -------- Questions form -------- */
  const [newQuestion, setNewQuestion] = useState('')
  const [newQuestionDetail, setNewQuestionDetail] = useState('')
  const [showAskForm, setShowAskForm] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState(null) // for viewing full question

  /** -------- Meetings form -------- */
  const [newMeetingTopic, setNewMeetingTopic] = useState('')
  const [newMeetingDatetime, setNewMeetingDatetime] = useState('')
  const [showCreateMeeting, setShowCreateMeeting] = useState(false)

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

  /** -------------------- Show create modal if no mentorships -------------------- */
  useEffect(() => {
    if (user?.id && mentorships.length === 0 && !showCreateMentorship) {
      setShowCreateMentorship(true)
    }
  }, [user?.id, mentorships.length, showCreateMentorship])

  /** -------------------- Persist selected mentorship -------------------- */
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!selectedMentorshipId) return
    window.localStorage.setItem('mentoringSelectedMentorshipId', selectedMentorshipId)
  }, [selectedMentorshipId])

  /** -------------------- Load docs + questions + meetings + notifications when mentorship changes -------------------- */
  useEffect(() => {
    if (!user?.id || !selectedMentorshipId) return

    carregarDocs()
    carregarQuestions()
    carregarMeetings()
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

  async function carregarQuestions() {
    try {
      const res = await axios.get(`/api/mentoring/questions?alunoId=${user.id}&mentorshipId=${selectedMentorshipId}`)
      const list = res.data?.perguntas || []
      setQuestions(list)
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarMeetings() {
    try {
      const res = await axios.get(`/api/mentoring/meetings?mentorshipId=${selectedMentorshipId}`)
      const list = res.data?.meetings || []
      setMeetings(list)
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

  /** -------------------- Questions logic -------------------- */
  async function askQuestion(e) {
    e.preventDefault()
    if (!newQuestion.trim()) return

    setErro('')
    setInfo('')
    setBusy(true)
    try {
      await axios.post('/api/mentoring/questions', {
        alunoId: user.id,
        mentorshipId: selectedMentorshipId,
        pergunta: newQuestion.trim(),
        detalhe: newQuestionDetail.trim() || undefined,
      })

      setInfo('Pergunta enviada ao professor.')
      setNewQuestion('')
      setNewQuestionDetail('')
      setShowAskForm(false)
      await carregarQuestions()
      await carregarNotificacoes()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao enviar pergunta.')
    } finally {
      setBusy(false)
    }
  }

  async function viewQuestion(question) {
    setSelectedQuestion(question)
    if (question.studentUnread) {
      try {
        await axios.patch(`/api/mentoring/questions/${question.id}`, { action: 'markStudentRead' })
        await carregarQuestions()
        await carregarNotificacoes()
      } catch {
        // ignore
      }
    }
  }

  /** -------------------- Meetings logic -------------------- */
  async function createMeeting(e) {
    e.preventDefault()
    if (!newMeetingTopic.trim()) return

    setErro('')
    setInfo('')
    setBusy(true)
    try {
      await axios.post('/api/mentoring/meetings', {
        mentorshipId: selectedMentorshipId,
        alunoId: user.id,
        requestedBy: 'student',
        topic: newMeetingTopic.trim(),
        datetime: newMeetingDatetime || null,
      })

      setInfo('Reunião solicitada ao professor.')
      setNewMeetingTopic('')
      setNewMeetingDatetime('')
      setShowCreateMeeting(false)
      await carregarMeetings()
      await carregarNotificacoes()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao solicitar reunião.')
    } finally {
      setBusy(false)
    }
  }

  /** -------------------- Edit Mentorship -------------------- */
  function startEditingMentorship() {
    if (!mentorship) return
    setEditForm({
      titulo: mentorship.titulo || '',
      email: mentorship.email || '',
      tipoKey: mentorship.tipoKey || '',
      anoInicioCurso: mentorship.anoInicioCurso || '',
      anoInicioMentoria: mentorship.anoInicioMentoria || '',
    })
    setEditingMentorship(true)
  }

  function cancelEditingMentorship() {
    setEditingMentorship(false)
    setEditForm({
      titulo: '',
      email: '',
      tipoKey: '',
      anoInicioCurso: '',
      anoInicioMentoria: '',
    })
  }

  async function saveMentorship() {
    if (!selectedMentorshipId) return
    setErro('')
    setInfo('')
    setBusy(true)
    try {
      const res = await axios.patch(`/api/mentoring/mentorships/${selectedMentorshipId}`, editForm)
      const updated = res.data?.mentorship
      if (updated) {
        setMentorships(prev => prev.map(m => m.id === selectedMentorshipId ? { ...m, ...updated } : m))
        setInfo('Mentoria actualizada.')
      }
      setEditingMentorship(false)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao actualizar mentoria.')
    } finally {
      setBusy(false)
    }
  }

  async function createMentorship(e) {
    e.preventDefault()
    if (!createForm.titulo.trim() || !createForm.anoInicioCurso || !createForm.anoInicioMentoria) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }
    setErro('')
    setInfo('')
    setBusy(true)
    try {
      const res = await axios.post('/api/mentoring/mentorships', {
        alunoId: user.id,
        ...createForm,
      })
      const newMentorship = res.data?.mentorship
      if (newMentorship) {
        setMentorships(prev => [newMentorship, ...prev])
        setSelectedMentorshipId(newMentorship.id)
        setInfo('Mentoria criada.')
        setShowCreateMentorship(false)
        setCreateForm({
          tipoKey: 'mestrado',
          titulo: '',
          anoInicioCurso: '',
          anoInicioMentoria: '',
          email: '',
        })
      }
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao criar mentoria.')
    } finally {
      setBusy(false)
    }
  }

  /** -------------------- QuestionCard -------------------- */
  function QuestionCard({ question, onClick }) {
    const isAnswered = question.respondida
    const hasNew = question.studentUnread

    return (
      <button
        type="button"
        className="card border-0 shadow-sm text-start"
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
            <div className="d-flex align-items-start gap-3 flex-1 min-w-0">
              <div className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${
                isAnswered ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'
              }`} style={{ width: 40, height: 40 }}>
                <MessageSquare size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-semibold text-truncate" title={question.pergunta}>
                    {truncate(question.pergunta, 60)}
                  </span>
                  {hasNew && <span className="badge bg-danger text-white">Novo</span>}
                </div>

                {question.detalhe && (
                  <p className="text-muted small mb-2 text-truncate" title={question.detalhe}>
                    {truncate(question.detalhe, 80)}
                  </p>
                )}

                <div className="d-flex align-items-center gap-2 small text-muted">
                  <Clock size={14} />
                  <span>{fmtDate(question.createdAt)}</span>
                  {isAnswered && question.respondidaEm && (
                    <>
                      <span>•</span>
                      <CheckCircle size={14} className="text-success" />
                      <span>Respondida em {fmtDate(question.respondidaEm)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <ChevronRight size={18} className="text-muted flex-shrink-0" />
          </div>

          {isAnswered && (
            <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
              <div className="d-flex align-items-center gap-2 small fw-semibold text-success mb-1">
                <CheckCircle size={14} />
                Resposta do Professor
              </div>
              <p className="small text-body mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {truncate(question.resposta, 200)}
              </p>
            </div>
          )}
        </div>
      </button>
    )
  }

  /** -------------------- MeetingCard -------------------- */
  function MeetingCard({ meeting }) {
    const isPending = meeting.status === 'pending'
    const isAccepted = meeting.status === 'accepted'
    const isRejected = meeting.status === 'rejected'
    const hasNew = meeting.studentUnread

    return (
      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
            <div className="d-flex align-items-start gap-3 flex-1 min-w-0">
              <div className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${
                isAccepted ? 'bg-success bg-opacity-10 text-success' : isPending ? 'bg-warning bg-opacity-10 text-warning' : 'bg-danger bg-opacity-10 text-danger'
              }`} style={{ width: 40, height: 40 }}>
                <Calendar size={20} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fw-semibold text-truncate" title={meeting.topic}>
                    {truncate(meeting.topic || 'Reunião', 60)}
                  </span>
                  {hasNew && <span className="badge bg-danger text-white">Novo</span>}
                </div>

                <div className="d-flex align-items-center gap-2 small text-muted">
                  <Clock size={14} />
                  <span>{meeting.datetime ? fmtDate(meeting.datetime) : 'Data por definir'}</span>
                  <span>•</span>
                  <span>Pedido por: {meeting.requestedBy === 'teacher' ? 'Professor' : 'Você'}</span>
                </div>

                <div className="mt-2">
                  <span className={`badge ${
                    isAccepted ? 'bg-success' : isPending ? 'bg-warning text-dark' : 'bg-danger'
                  }`}>
                    {isAccepted ? 'Aceite' : isPending ? 'Pendente' : 'Rejeitada'}
                  </span>
                </div>
              </div>
            </div>

            <ChevronRight size={18} className="text-muted flex-shrink-0" />
          </div>

          {isAccepted && meeting.acceptedAt && (
            <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
              <div className="d-flex align-items-center gap-2 small fw-semibold text-success mb-1">
                <CheckCircle size={14} />
                Aceite pelo professor
              </div>
              <p className="small text-body mb-0">
                Aceite em {fmtDate(meeting.acceptedAt)}
              </p>
            </div>
          )}

          {isRejected && meeting.rejectedAt && (
            <div className="p-3 bg-danger bg-opacity-10 rounded-3 border border-danger border-opacity-25">
              <div className="d-flex align-items-center gap-2 small fw-semibold text-danger mb-1">
                <X size={14} />
                Rejeitada pelo professor
              </div>
              <p className="small text-body mb-0">
                Rejeitada em {fmtDate(meeting.rejectedAt)}
              </p>
            </div>
          )}
        </div>
      </div>
    )
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
      <div className="d-flex justify-content-center position-relative py-5 min-vh-100">
        <div className="container" style={{ maxWidth: 920 }}>
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

        <div className="position-absolute top-0 end-0 mt-3 me-3">
          <a
            href="/mentoring/admin"
            className="btn btn-outline-primary d-flex align-items-center gap-2 shadow-sm fw-semibold"
            style={{
              background: 'linear-gradient(135deg, rgba(102,16,242,.1), rgba(13,110,253,.1))',
              border: '2px solid #6610f2',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'linear-gradient(135deg, #6610f2, #0d6efd)'
              e.target.style.color = 'white'
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'linear-gradient(135deg, rgba(102,16,242,.1), rgba(13,110,253,.1))'
              e.target.style.color = '#6610f2'
            }}
          >
            <UserCheck size={16} />
            Portal do Professor
          </a>
        </div>
      </div>
    )
  }

  /** -------------------- Main UI (new dashboard) -------------------- */
  return (
    <div className="min-vh-100 bg-light">

      {/* ---- TOP HEADER ---- */}
      <div className="bg-white border-bottom sticky-top shadow-sm">
        <div className="container">
          <div className="d-flex align-items-center justify-content-between py-2" style={{ minHeight: 54 }}>
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-3 text-white fw-bold d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #0d6efd, #6610f2)', fontSize: 15 }}
              >
                {firstName?.[0] || 'A'}
              </div>
              <div>
                <div className="fw-semibold lh-1">Olá, {firstName}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>{user?.curso || 'Portal de Mentoria'}</div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button type="button" className="btn btn-sm btn-light position-relative" onClick={() => setShowNotifModal(true)}>
                <Bell size={17} />
                {notifCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ width: 10, height: 10 }} />
                )}
              </button>
              <button type="button" className="btn btn-sm btn-light d-flex align-items-center gap-2" onClick={logout}>
                <LogOut size={16} />
                <span className="d-none d-sm-inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---- MENTORSHIP CONTEXT BAR ---- */}
      {mentorships.length > 0 && (
        <div className="bg-white border-bottom">
          <div className="container">
            <div className="d-flex align-items-center justify-content-between py-2 gap-3">
              <div className="d-flex align-items-center gap-2 min-w-0 flex-grow-1">
                {mentorship && (
                  <>
                    <span className="badge bg-primary" style={{ fontSize: 11 }}>{meta.label}</span>
                    <span className="fw-medium text-truncate" style={{ fontSize: 14 }} title={mentorship.titulo}>
                      {mentorship.titulo ? truncate(mentorship.titulo, 70) : 'Sem título'}
                    </span>
                  </>
                )}
              </div>
              <div className="d-flex align-items-center gap-2 flex-shrink-0">
                {mentorships.length > 1 && (
                  <select
                    className="form-select form-select-sm"
                    style={{ minWidth: 160, maxWidth: 260 }}
                    value={selectedMentorshipId}
                    onChange={e => setSelectedMentorshipId(e.target.value)}
                  >
                    {mentorships.map(m => (
                      <option key={m.id} value={m.id}>
                        {tipoMeta(m.tipoKey).label} — {m.titulo ? truncate(m.titulo, 28) : 'Sem título'}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => setShowCreateMentorship(true)}
                >+ Nova</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container py-4">
        {/* Alerts */}
        {erro && <div className="alert alert-danger alert-dismissible mb-4"><button type="button" className="btn-close" onClick={() => setErro('')}></button>{erro}</div>}
        {info && <div className="alert alert-success alert-dismissible mb-4"><button type="button" className="btn-close" onClick={() => setInfo('')}></button>{info}</div>}

        {/* ---- COMPACT MENTORSHIP BANNER ---- */}
        {mentorship ? (
          <div className="d-flex align-items-start gap-3 p-3 bg-white rounded-3 border mb-4">
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                <span className="badge text-bg-light border">{meta.label}</span>
                <span className="fw-semibold" style={{ fontSize: 15 }}>{mentorship.titulo || 'Sem título'}</span>
              </div>
              <div className="d-flex align-items-center gap-3 flex-wrap text-muted" style={{ fontSize: 13 }}>
                {mentorship.email && <span>{mentorship.email}</span>}
                {mentorship.anoInicioCurso && <span>Curso: {mentorship.anoInicioCurso}</span>}
                {mentorship.anoInicioMentoria && <span>Mentoria desde {mentorship.anoInicioMentoria}</span>}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary flex-shrink-0"
              onClick={startEditingMentorship}
            >
              <Edit2 size={13} className="me-1" />Editar
            </button>
          </div>
        ) : null}

        {/* First-time tip */}
        {!latestPrograma && mentorship ? (
          <div className="alert alert-primary mb-4" style={{ fontSize: 14 }}>
            <strong>Por onde começar:</strong> Envie o seu <strong>Programa</strong> no separador Documentos. O Dr. Lucombo Luveia irá orientar os próximos passos.
          </div>
        ) : null}

        {/* ---- TABS ---- */}
        <ul className="nav nav-tabs">
          {[
            { id: 'mentoria', label: 'Documentos', icon: FileText },
            { id: 'meetings', label: 'Reuniões', icon: Calendar },
            { id: 'questions', label: 'Perguntas', icon: MessageSquare },
            { id: 'progress', label: 'Progresso', icon: TrendingUp },
          ].map(t => {
            const Icon = t.icon
            return (
              <li className="nav-item" key={t.id}>
                <button
                  type="button"
                  className={`nav-link d-flex align-items-center gap-2 ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                  style={{ fontSize: 14 }}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              </li>
            )
          })}
        </ul>

        <div className="bg-white border border-top-0 rounded-bottom-3 p-4">

          {/* DOCUMENTOS */}
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

          {/* REUNIÕES */}
          {tab === 'meetings' ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-semibold">Reuniões</h5>
                <button className="btn btn-sm btn-primary d-flex align-items-center gap-2" onClick={() => setShowCreateMeeting(true)}>
                  <Calendar size={15} />Solicitar Reunião
                </button>
              </div>
              {meetings.length ? (
                <div className="d-flex flex-column gap-3">
                  {meetings.map(m => <MeetingCard key={m.id} meeting={m} />)}
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <Calendar size={40} className="mb-3" />
                  <p className="mb-3" style={{ fontSize: 14 }}>Ainda não solicitaste nenhuma reunião.</p>
                  <button className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2" onClick={() => setShowCreateMeeting(true)}>
                    <Calendar size={15} />Solicitar primeira reunião
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* PERGUNTAS */}
          {tab === 'questions' ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 fw-semibold">Perguntas ao Professor</h5>
                <button className="btn btn-sm btn-primary d-flex align-items-center gap-2" onClick={() => setShowAskForm(true)}>
                  <MessageSquare size={15} />Fazer Pergunta
                </button>
              </div>
              {questions.length ? (
                <div className="d-flex flex-column gap-3">
                  {questions.map(q => <QuestionCard key={q.id} question={q} onClick={() => viewQuestion(q)} />)}
                </div>
              ) : (
                <div className="text-center py-5 text-muted">
                  <MessageSquare size={40} className="mb-3" />
                  <p className="mb-3" style={{ fontSize: 14 }}>Ainda não fizeste nenhuma pergunta.</p>
                  <button className="btn btn-sm btn-primary d-inline-flex align-items-center gap-2" onClick={() => setShowAskForm(true)}>
                    <MessageSquare size={15} />Fazer primeira pergunta
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {/* PROGRESSO */}
          {tab === 'progress' ? (
            <div className="text-center py-5 text-muted">
              <TrendingUp size={40} className="mb-3" />
              <p className="mb-0" style={{ fontSize: 14 }}>O progresso da tua mentoria é registado pelo professor e ficará visível aqui.</p>
            </div>
          ) : null}

        </div>
      </div>

      {/* ---- NOTIFICATIONS MODAL ---- */}
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
                    if (n.type === 'document') setTab('mentoria')
                    if (n.type === 'meeting') setTab('meetings')
                    if (n.type === 'question') setTab('questions')
                    setShowNotifModal(false)
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
          ) : (
            <div className="text-muted text-center py-3">Sem novidades.</div>
          )}
        </ModalShell>
      ) : null}

      {/* ---- DOC VIEWER ---- */}
      {selectedDoc ? (
        <DocPreviewModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDownload={() => trackDownload(selectedDoc)}
        />
      ) : null}

      {/* ---- HISTORY ---- */}
      {showHistory ? (
        <ModalShell
          title={`Histórico — ${showHistory === 'programa' ? 'Programa' : meta.secondaryLabel}`}
          icon={History}
          onClose={() => setShowHistory(null)}
          footer={<button className="btn btn-outline-secondary" onClick={() => setShowHistory(null)}>Fechar</button>}
        >
          <div className="list-group">
            {(byType[showHistory] || [])
              .filter(d => (d.kind || 'submission') === 'submission')
              .map(doc => (
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
                    <div className="fw-semibold text-truncate" title={doc.filename}>{truncate(doc.filename, 55)}</div>
                    <div className="d-flex align-items-center gap-2 text-muted mt-1" style={{ fontSize: 12 }}>
                      <span className="badge text-bg-secondary">v{doc.version || 1}</span>
                      <span>{fmtDate(doc.uploadedAt)}</span>
                      {doc.studentUnread ? <span className="badge text-bg-danger">novo</span> : null}
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-muted" />
                </button>
              ))}
          </div>
        </ModalShell>
      ) : null}

      {/* ---- UPLOAD ---- */}
      {showUpload ? (
        <ModalShell
          title={`Enviar ${showUpload === 'programa' ? 'Programa' : meta.secondaryLabel}`}
          icon={Upload}
          onClose={() => setShowUpload(null)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setShowUpload(null)} disabled={busy}>Cancelar</button>
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
              onChange={e => setUploadNote(e.target.value)}
              placeholder="Descreva o que mudou nesta versão..."
            />
          </div>
        </ModalShell>
      ) : null}

      {/* ---- ASK QUESTION ---- */}
      {showAskForm ? (
        <ModalShell
          title="Fazer uma Pergunta"
          icon={MessageSquare}
          onClose={() => setShowAskForm(false)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setShowAskForm(false)} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" onClick={askQuestion} disabled={busy || !newQuestion.trim()}>
                {busy ? 'A enviar...' : 'Enviar Pergunta'}
              </button>
            </>
          }
          size="modal-lg"
        >
          <form onSubmit={askQuestion}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Pergunta</label>
              <input
                type="text"
                className="form-control"
                value={newQuestion}
                onChange={e => setNewQuestion(e.target.value)}
                placeholder="Escreva a sua pergunta..."
                required
              />
            </div>
            <div className="mb-0">
              <label className="form-label fw-semibold">Detalhes adicionais (opcional)</label>
              <textarea
                className="form-control"
                rows={4}
                value={newQuestionDetail}
                onChange={e => setNewQuestionDetail(e.target.value)}
                placeholder="Forneça mais contexto ou detalhes sobre a sua pergunta..."
              />
            </div>
          </form>
        </ModalShell>
      ) : null}

      {/* ---- VIEW QUESTION ---- */}
      {selectedQuestion ? (
        <ModalShell
          title="Detalhes da Pergunta"
          icon={MessageSquare}
          onClose={() => setSelectedQuestion(null)}
          footer={<button className="btn btn-outline-secondary" onClick={() => setSelectedQuestion(null)}>Fechar</button>}
          size="modal-lg"
        >
          <div className="mb-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className={`rounded-3 d-flex align-items-center justify-content-center ${selectedQuestion.respondida ? 'bg-success bg-opacity-10 text-success' : 'bg-warning bg-opacity-10 text-warning'}`} style={{ width: 40, height: 40 }}>
                <MessageSquare size={20} />
              </div>
              <div>
                <span className="badge bg-primary">Pergunta</span>
                <div className="text-muted small mt-1"><Clock size={14} className="me-1" />Enviada em {fmtDate(selectedQuestion.createdAt)}</div>
              </div>
            </div>
            <div className="p-3 bg-body-tertiary rounded-3 mb-3">
              <h6 className="fw-semibold mb-2">Pergunta</h6>
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.pergunta}</p>
            </div>
            {selectedQuestion.detalhe && (
              <div className="p-3 bg-body-tertiary rounded-3 mb-3">
                <h6 className="fw-semibold mb-2">Detalhes adicionais</h6>
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.detalhe}</p>
              </div>
            )}
          </div>
          {selectedQuestion.respondida ? (
            <div>
              <div className="d-flex align-items-center gap-2 mb-3">
                <CheckCircle size={20} className="text-success" />
                <span className="fw-semibold text-success">Resposta do Professor</span>
                {selectedQuestion.respondidaEm && (
                  <span className="text-muted small ms-auto">Respondida em {fmtDate(selectedQuestion.respondidaEm)}</span>
                )}
              </div>
              <div className="p-3 bg-success bg-opacity-10 rounded-3 border border-success border-opacity-25">
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{selectedQuestion.resposta}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted">
              <Clock size={32} className="text-warning mb-3" />
              <p className="mb-0">Aguardando resposta do professor.</p>
            </div>
          )}
        </ModalShell>
      ) : null}

      {/* ---- CREATE MEETING ---- */}
      {showCreateMeeting ? (
        <ModalShell
          title="Solicitar Reunião"
          icon={Calendar}
          onClose={() => setShowCreateMeeting(false)}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={() => setShowCreateMeeting(false)} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" onClick={createMeeting} disabled={busy || !newMeetingTopic.trim()}>
                {busy ? 'A solicitar...' : 'Solicitar Reunião'}
              </button>
            </>
          }
          size="modal-md"
        >
          <form onSubmit={createMeeting}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Tópico da reunião</label>
              <input
                type="text"
                className="form-control"
                value={newMeetingTopic}
                onChange={e => setNewMeetingTopic(e.target.value)}
                placeholder="Ex: Revisão do capítulo 3, Discussão sobre tese..."
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold">Data e hora sugerida (opcional)</label>
              <input
                type="datetime-local"
                className="form-control"
                value={newMeetingDatetime}
                onChange={e => setNewMeetingDatetime(e.target.value)}
              />
              <div className="form-text">Podes deixar em branco se preferires que o professor defina a data.</div>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {/* ---- CREATE MENTORSHIP ---- */}
      {showCreateMentorship ? (
        <ModalShell
          title="Criar Nova Mentoria"
          icon={FileText}
          onClose={() => setShowCreateMentorship(false)}
          footer={
            <>
              {mentorships.length > 0 && (
                <button className="btn btn-outline-secondary" onClick={() => setShowCreateMentorship(false)} disabled={busy}>Cancelar</button>
              )}
              <button className="btn btn-primary" onClick={createMentorship} disabled={busy || !createForm.titulo.trim()}>
                {busy ? 'Criando...' : 'Criar Mentoria'}
              </button>
            </>
          }
          size="modal-lg"
          closable={mentorships.length > 0}
          mandatory={mentorships.length === 0}
        >
          <form onSubmit={createMentorship}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">Tipo de Mentoria</label>
                <select className="form-select" value={createForm.tipoKey} onChange={e => setCreateForm(prev => ({ ...prev, tipoKey: e.target.value }))} required>
                  {TIPO_OPCOES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Título do Trabalho</label>
                <input type="text" className="form-control" value={createForm.titulo} onChange={e => setCreateForm(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Ex: Contribuição do Sector Diamantífero..." required />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Ano do Curso</label>
                <input type="number" className="form-control" value={createForm.anoInicioCurso} onChange={e => setCreateForm(prev => ({ ...prev, anoInicioCurso: e.target.value }))} placeholder="Ex: 2024" min="1900" max="2100" required />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Ano da Mentoria</label>
                <input type="number" className="form-control" value={createForm.anoInicioMentoria} onChange={e => setCreateForm(prev => ({ ...prev, anoInicioMentoria: e.target.value }))} placeholder="Ex: 2026" min="1900" max="2100" required />
              </div>
              <div className="col-12">
                <label className="form-label fw-semibold">Email (opcional)</label>
                <input type="email" className="form-control" value={createForm.email} onChange={e => setCreateForm(prev => ({ ...prev, email: e.target.value }))} placeholder="seu.email@exemplo.com" />
              </div>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {/* ---- EDIT MENTORSHIP ---- */}
      {editingMentorship ? (
        <ModalShell
          title="Editar Mentoria"
          icon={Edit2}
          onClose={cancelEditingMentorship}
          footer={
            <>
              <button className="btn btn-outline-secondary" onClick={cancelEditingMentorship} disabled={busy}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveMentorship} disabled={busy}>
                {busy ? 'A guardar...' : 'Guardar'}
              </button>
            </>
          }
          size="modal-lg"
        >
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Tipo de Mentoria</label>
              <select className="form-select" value={editForm.tipoKey} onChange={e => setEditForm(prev => ({ ...prev, tipoKey: e.target.value }))}>
                {TIPO_OPCOES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Título do Trabalho</label>
              <input type="text" className="form-control" value={editForm.titulo} onChange={e => setEditForm(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Título" />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-semibold">Email</label>
              <input type="email" className="form-control" value={editForm.email} onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))} placeholder="Email" />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Ano do Curso</label>
              <input type="number" className="form-control" value={editForm.anoInicioCurso} onChange={e => setEditForm(prev => ({ ...prev, anoInicioCurso: e.target.value }))} placeholder="Ex: 2024" />
            </div>
            <div className="col-md-3">
              <label className="form-label fw-semibold">Ano da Mentoria</label>
              <input type="number" className="form-control" value={editForm.anoInicioMentoria} onChange={e => setEditForm(prev => ({ ...prev, anoInicioMentoria: e.target.value }))} placeholder="Ex: 2026" />
            </div>
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

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" tabIndex={-1} role="dialog" aria-modal="true" onClick={handleBackdropClick}>
        <div className="modal-dialog modal-dialog-centered modal-xl modal-dialog-scrollable" style={{ maxWidth: 1100 }} role="document">
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
      </div>
    </>
  )
}
