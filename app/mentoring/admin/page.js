'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  FileText, Download, Eye, Clock, Upload, MessageSquare, Calendar, TrendingUp,
  Bell, LogOut, Plus, Edit2, File, AlertCircle, Search, Check, XCircle,
  Users, BookOpen, Send, User, Phone, Book, UploadCloud, History, ChevronRight
} from 'lucide-react'

const MENTORIA_TYPES = {
  doutoramento: { label: 'Doutoramento', docs: ['programa', 'tez'] },
  licenciatura: { label: 'Licenciatura', docs: ['programa', 'monografia'] },
  mestrado: { label: 'Mestrado', docs: ['programa', 'dissertacao'] }
}

function getMentoriaConfig(tipoKey) {
  return MENTORIA_TYPES[tipoKey] || MENTORIA_TYPES.licenciatura
}

function getDocLabel(type, tipoKey) {
  const labels = { programa: 'Programa', monografia: 'Monografia', tez: 'Tese', dissertacao: 'Dissertação' }
  return labels[type] || type
}

function fmtDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', {
    year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
  })
}

function truncate(str, max = 45) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function initials(name) {
  const parts = (name || '').toString().trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'P'
  return parts.slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function isDoneStatus(value) {
  const v = (value || '').toString().trim().toLowerCase()
  return [
    'done', 'concluido', 'concluído', 'concluida', 'concluída',
    'concluidas', 'concluídas', 'completed', 'finalizada', 'finalizado'
  ].includes(v)
}

export default function TeacherDashboard() {
  // auth + login
  const [auth, setAuth] = useState(null)
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busyLogin, setBusyLogin] = useState(false)

  // main state
  const [mentorships, setMentorships] = useState([])
  const [selectedMentorshipId, setSelectedMentorshipId] = useState('')
  const [listMode, setListMode] = useState('pending') // pending | done | all
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('mentoria')
  const [docTab, setDocTab] = useState('programa')

  // data panels
  const [documents, setDocuments] = useState([])
  const [meetings, setMeetings] = useState([])
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState([])
  const [allMeetings, setAllMeetings] = useState([]) // optional if you have an endpoint
  const [loadingMentorships, setLoadingMentorships] = useState(false)
  const [busyPanel, setBusyPanel] = useState(false)
  const [busyAllMeetings, setBusyAllMeetings] = useState(false)

  // notifications
  const [notifCount, setNotifCount] = useState(0)
  const [notifItems, setNotifItems] = useState([])
  const [showNotifSidebar, setShowNotifSidebar] = useState(false)
  const [dismissedNotifs, setDismissedNotifs] = useState(new Set())

  // pagination for students
  const [currentStudentPage, setCurrentStudentPage] = useState(1)
  const studentsPerPage = 10

  // modals
  const [showPreview, setShowPreview] = useState(null)
  const [showCorrection, setShowCorrection] = useState(null)
  const [showReply, setShowReply] = useState(null)
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [showHistory, setShowHistory] = useState(null)

  // forms
  const [feedbackText, setFeedbackText] = useState('')
  const [progressNote, setProgressNote] = useState('')
  const [replyText, setReplyText] = useState('')
  const [correctionNote, setCorrectionNote] = useState('')
  const [meetingTopic, setMeetingTopic] = useState('')
  const [meetingDatetime, setMeetingDatetime] = useState('')
  const [meetingForAll, setMeetingForAll] = useState(false)
  const [resourceNote, setResourceNote] = useState('')
  const [resourceType, setResourceType] = useState('programa')

  const correctionFileRef = useRef(null)
  const resourceFileRef = useRef(null)

  // ---------- Restore auth ----------
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mentoring_teacher_auth')
      if (raw) setAuth(JSON.parse(raw))
    } catch {}
  }, [])

  // ---------- Load mentorships + notifications polling ----------
  useEffect(() => {
    if (!auth) return
    loadMentorships()
    loadNotifications()

    const t = setInterval(() => {
      loadNotifications()
      loadMentorships(true)
    }, 25000)

    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  // ---------- Load selected panel ----------
  useEffect(() => {
    if (!auth || !selectedMentorshipId) return
    // Clear modals when switching mentorships to avoid stale data
    setShowReply(null)
    setShowPreview(null)
    setShowCorrection(null)
    setShowHistory(null)
    setShowResourceModal(false)
    setReplyText('')
    setFeedbackText('')
    loadSelectedPanel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, selectedMentorshipId])

  // ---------- Load all meetings (teacher global view) ----------
  useEffect(() => {
    if (!auth) return
    if (tab !== 'all-meetings') return
    if (!mentorships.length) return
    loadAllMeetings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, tab, mentorships.length])

  const selectedMentorship = useMemo(
    () => mentorships.find(m => m.id === selectedMentorshipId) || null,
    [mentorships, selectedMentorshipId]
  )

  const docTypes = useMemo(() => {
    if (!selectedMentorship) return ['programa', 'monografia']
    return getMentoriaConfig(selectedMentorship.tipoKey).docs
  }, [selectedMentorship])

  // keep docTab valid per mentorship
  useEffect(() => {
    const first = docTypes[0] || 'programa'
    setDocTab(prev => (prev && docTypes.includes(prev) ? prev : first))
    setResourceType(prev => (prev && docTypes.includes(prev) ? prev : first))
    setFeedbackText('')
  }, [selectedMentorshipId, docTypes.join('|')])

  const filteredMentorships = useMemo(() => {
    let filtered = mentorships

    if (listMode === 'pending') filtered = filtered.filter(m => !isDoneStatus(m.teacherQueueStatus))
    if (listMode === 'done') filtered = filtered.filter(m => isDoneStatus(m.teacherQueueStatus))

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(m =>
        (m.aluno?.nomeCompleto || '').toLowerCase().includes(q) ||
        (m.aluno?.telefone || '').toLowerCase().includes(q) ||
        (m.titulo || '').toLowerCase().includes(q)
      )
    }
    return filtered
  }, [mentorships, listMode, search])

  // Pagination for students
  const totalStudentPages = Math.ceil(filteredMentorships.length / studentsPerPage)
  const paginatedMentorships = useMemo(() => {
    const startIndex = (currentStudentPage - 1) * studentsPerPage
    return filteredMentorships.slice(startIndex, startIndex + studentsPerPage)
  }, [filteredMentorships, currentStudentPage])

  // Active notifications (not dismissed)
  const activeNotifItems = useMemo(() => {
    return notifItems.filter(n => !dismissedNotifs.has(n.refId))
  }, [notifItems, dismissedNotifs])

  const docsGrouped = useMemo(() => {
    const submissions = documents.filter(d => d.kind === 'submission')
    const resources = documents.filter(d => d.kind === 'resource')

    const byType = {}
    docTypes.forEach(type => {
      byType[type] = {
        submissions: submissions.filter(d => d.type === type).sort((a, b) => (b.version || 0) - (a.version || 0)),
        resources: resources.filter(d => d.type === type).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    })
    return byType
  }, [documents, docTypes])

  const pendingCounts = useMemo(() => {
    const pendingDocs = documents.filter(d => d.teacherUnread).length
    const pendingQuestions = questions.filter(q => q.teacherUnread).length
    const pendingMeetings = meetings.filter(m => m.status === 'pending').length
    return { docs: pendingDocs, questions: pendingQuestions, meetings: pendingMeetings }
  }, [documents, questions, meetings])

  // =========================
  // API FUNCTIONS (from old admin)
  // =========================
  async function doLogin() {
    setLoginError('')
    try {
      setBusyLogin(true)
      const res = await axios.post('/api/mentoring/admin/login', { telefone, senha })
      if (!res?.data?.ok) throw new Error('Credenciais inválidas.')
      const session = { telefone, loggedInAt: new Date().toISOString() }
      localStorage.setItem('mentoring_teacher_auth', JSON.stringify(session))
      setAuth(session)
    } catch (e) {
      setLoginError(e?.response?.data?.error || e?.message || 'Erro ao entrar.')
    } finally {
      setBusyLogin(false)
    }
  }

  function logout() {
    try { localStorage.removeItem('mentoring_teacher_auth') } catch {}
    setAuth(null)
    setSelectedMentorshipId('')
    setMentorships([])
    setDocuments([])
    setMeetings([])
    setQuestions([])
    setProgress([])
    setNotifCount(0)
    setNotifItems([])
  }

  async function loadMentorships(silent = false) {
    try {
      if (!silent) setLoadingMentorships(true)
      const res = await axios.get('/api/mentoring/admin/mentorships')
      const list = res?.data?.mentorships || []
      setMentorships(list)

      // auto select if none selected or invalid
      if (!silent) {
        const needsSelect = !selectedMentorshipId || !list.some(m => m.id === selectedMentorshipId)
        if (needsSelect) {
          const pending = list
            .filter(m => !isDoneStatus(m.teacherQueueStatus))
            .sort((a, b) => {
              const da = a.teacherQueueUpdatedAt ? new Date(a.teacherQueueUpdatedAt).getTime() : 0
              const db = b.teacherQueueUpdatedAt ? new Date(b.teacherQueueUpdatedAt).getTime() : 0
              return db - da
            })
          if (pending[0]?.id) setSelectedMentorshipId(pending[0].id)
          else if (list[0]?.id) setSelectedMentorshipId(list[0].id)
          else setSelectedMentorshipId('')
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (!silent) setLoadingMentorships(false)
    }
  }

  async function loadNotifications() {
    try {
      const res = await axios.get('/api/mentoring/notifications?role=teacher')
      setNotifCount(res?.data?.count || 0)
      setNotifItems(res?.data?.items || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function loadSelectedPanel() {
    try {
      setBusyPanel(true)
      const ms = selectedMentorship
      if (!ms) return

      const [docsRes, meetingsRes, questionsRes, progressRes] = await Promise.all([
        axios.get(`/api/mentoring/documents?mentorshipId=${ms.id}`),
        axios.get(`/api/mentoring/meetings?mentorshipId=${ms.id}`),
        axios.get(`/api/mentoring/questions?alunoId=${ms.alunoId}&mentorshipId=${ms.id}`),
        axios.get(`/api/mentoring/progress?mentorshipId=${ms.id}`)
      ])

      setDocuments(docsRes?.data?.documents || [])
      setMeetings(meetingsRes?.data?.meetings || [])
      setQuestions(questionsRes?.data?.perguntas || [])
      setProgress(progressRes?.data?.progress || [])

      // OPTIONAL: if you have an endpoint for ALL meetings, use it here:
      // try {
      //   const all = await axios.get('/api/mentoring/meetings?role=teacher')
      //   setAllMeetings(all?.data?.meetings || [])
      // } catch {}

    } catch (e) {
      console.error(e)
    } finally {
      setBusyPanel(false)
    }
  }


  async function loadAllMeetings() {
    try {
      setBusyAllMeetings(true)
      const list = mentorships || []
      if (!list.length) {
        setAllMeetings([])
        return
      }

      const chunks = await Promise.all(
        list.map(async (ms) => {
          try {
            const r = await axios.get(`/api/mentoring/meetings?mentorshipId=${ms.id}`)
            const meets = r?.data?.meetings || []
            return meets.map(m => ({
              ...m,
              mentorshipId: ms.id,
              alunoId: ms.alunoId,
              aluno: ms.aluno || null
            }))
          } catch (e) {
            console.error(e)
            return []
          }
        })
      )

      const all = chunks.flat()
      all.sort((a, b) => {
        const da = a.datetime ? new Date(a.datetime).getTime() : 0
        const db = b.datetime ? new Date(b.datetime).getTime() : 0
        if (db !== da) return db - da
        const ca = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0)
        const cb = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0)
        return cb - ca
      })
      setAllMeetings(all)
    } catch (e) {
      console.error(e)
    } finally {
      setBusyAllMeetings(false)
    }
  }

  async function markMentorshipQueue(status) {
    if (!selectedMentorship) return
    try {
      await axios.patch(`/api/mentoring/mentorships/${selectedMentorship.id}`, { teacherQueueStatus: status })
      await loadMentorships(true)
      if (tab === 'all-meetings') await loadAllMeetings()
    } catch (e) {
      console.error(e)
      alert('Não foi possível actualizar o estado.')
    }
  }

  async function markTeacherEventOnDoc(docId, action) {
    try {
      await axios.patch(`/api/mentoring/admin/documents/${docId}/opened`)
    } catch (e) {
      console.error(e)
    }
  }

  async function openPreview(doc) {
    setShowPreview(doc)
    if (doc?.id) {
      await markTeacherEventOnDoc(doc.id, 'view')
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    }
  }

  async function trackDocDownload(docId) {
    await markTeacherEventOnDoc(docId, 'download')
    await loadSelectedPanel()
    await loadNotifications()
  }

  async function handleSendFeedback() {
    if (!selectedMentorship) return
    if (!feedbackText.trim()) return

    try {
      const form = new FormData()
      form.append('mentorshipId', selectedMentorship.id)
      form.append('alunoId', selectedMentorship.alunoId)
      form.append('type', docTab)                 // feedback tied to current doc section
      form.append('kind', 'submission')           // same as old
      form.append('uploadedByRole', 'teacher')
      form.append('note', feedbackText)

      await axios.post('/api/mentoring/documents', form)
      setFeedbackText('')
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
      if (tab === 'all-meetings') await loadAllMeetings()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao enviar feedback.')
    }
  }

  async function handleUploadCorrection() {
    if (!selectedMentorship || !showCorrection) return
    const file = correctionFileRef.current?.files?.[0]
    if (!file) return alert('Por favor, selecione um ficheiro')

    try {
      const form = new FormData()
      form.append('mentorshipId', selectedMentorship.id)
      form.append('alunoId', selectedMentorship.alunoId)
      form.append('type', showCorrection.type)
      form.append('kind', 'correction')
      form.append('parentDocumentId', showCorrection.parentId)
      form.append('note', correctionNote || '')
      form.append('file', file)

      await axios.post('/api/mentoring/documents', form)
      setShowCorrection(null)
      setCorrectionNote('')
      if (correctionFileRef.current) correctionFileRef.current.value = ''
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao enviar correção.')
    }
  }

  async function handleUploadResource() {
    if (!selectedMentorship) return
    const file = resourceFileRef.current?.files?.[0]
    if (!file) return alert('Por favor, selecione um ficheiro')

    try {
      const form = new FormData()
      form.append('mentorshipId', selectedMentorship.id)
      form.append('alunoId', selectedMentorship.alunoId)
      form.append('type', resourceType)
      form.append('kind', 'resource')
      form.append('note', resourceNote || '')
      form.append('file', file)

      await axios.post('/api/mentoring/documents', form)
      setShowResourceModal(false)
      setResourceNote('')
      if (resourceFileRef.current) resourceFileRef.current.value = ''
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao enviar recurso.')
    }
  }

  async function handleSendReply() {
    if (!showReply) return
    if (!replyText.trim()) return

    try {
      await axios.patch(`/api/mentoring/questions/${showReply.id}`, { resposta: replyText })
      setShowReply(null)
      setReplyText('')
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao responder.')
    }
  }

  async function markQuestionRead(question) {
    try {
      await axios.patch(`/api/mentoring/questions/${question.id}`, { action: 'markTeacherRead' })
      await loadSelectedPanel()
      await loadNotifications()
    } catch (e) {
      console.error(e)
    }
  }

  async function updateMeeting(meetingId, action) {
    try {
      await axios.patch(`/api/mentoring/meetings/${meetingId}`, { action })
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao actualizar reunião.')
    }
  }

  async function handleCreateMeeting() {
    if (!meetingTopic.trim()) return alert('Por favor, insira um tópico para a reunião')

    try {
      const payload = {
        requestedBy: 'teacher',
        datetime: meetingDatetime ? new Date(meetingDatetime).toISOString() : null,
        topic: meetingTopic,
        allMentorships: meetingForAll
      }

      if (!meetingForAll) {
        if (!selectedMentorship) return alert('Seleccione um aluno.')
        payload.mentorshipId = selectedMentorship.id
        payload.alunoId = selectedMentorship.alunoId
      }

      await axios.post('/api/mentoring/meetings', payload)
      setShowMeetingModal(false)
      setMeetingTopic('')
      setMeetingDatetime('')
      setMeetingForAll(false)

      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao criar reunião.')
    }
  }

  async function handleAddProgressNote() {
    if (!selectedMentorship) return
    if (!progressNote.trim()) return

    try {
      await axios.post('/api/mentoring/progress', {
        mentorshipId: selectedMentorship.id,
        alunoId: selectedMentorship.alunoId,
        note: progressNote
      })
      setProgressNote('')
      await loadSelectedPanel()
      await loadNotifications()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao adicionar nota.')
    }
  }

  // =========================
  // UI COMPONENTS
  // =========================
  const StudentCard = ({ m, active, onClick }) => {
    const hasNew = (m.pendingCounts?.total || 0) > 0
    return (
      <button
        onClick={onClick}
        className={`w-100 p-4 rounded-3 text-left transition-all ${
          active
            ? 'bg-primary text-white shadow-lg border-0'
            : 'bg-white hover:bg-light border border-gray-200 hover:shadow-sm'
        }`}
        style={{ height: '120px', minHeight: '120px' }}
      >
        <div className="d-flex align-items-start gap-3 h-100">
          <div
            className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${
              active
                ? 'bg-white text-primary border border-white border-2'
                : 'bg-primary text-white'
            }`}
            style={{ width: '56px', height: '56px', fontSize: '18px', fontWeight: '600' }}
          >
            {initials(m.aluno?.nomeCompleto)}
          </div>
          <div className="flex-1 min-w-0 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center gap-2 mb-2">
                <span className="fw-semibold text-truncate fs-6" title={m.aluno?.nomeCompleto}>
                  {m.aluno?.nomeCompleto}
                </span>
                {hasNew && (
                  <span className={`badge ${active ? 'bg-white text-primary' : 'bg-danger text-white'} px-2 py-1`}>
                    {m.pendingCounts.total}
                  </span>
                )}
              </div>
              <p className={`small mb-1 ${active ? 'text-white-75' : 'text-muted'} text-truncate`}>
                {getMentoriaConfig(m.tipoKey).label}
              </p>
            </div>
            <p className={`text-xs text-truncate ${active ? 'text-white-75' : 'text-muted'}`} title={m.titulo}>
              {truncate(m.titulo, 40)}
            </p>
          </div>
        </div>
      </button>
    )
  }

  const DocumentCard = ({ doc }) => {
    return (
      <div className="bg-white border rounded-xl p-4 hover:shadow-sm transition-all mb-3">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div className="d-flex align-items-start gap-3 flex-1 min-w-0">
            <div className="p-2 bg-danger bg-opacity-10 rounded-lg">
              <FileText className="text-danger" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="d-flex align-items-center gap-2">
                <span className="font-medium text-truncate" title={doc.original?.filename}>
                  {truncate(doc.original?.filename, 30)}
                </span>
                {doc.teacherUnread && <span className="badge bg-danger text-white">Novo</span>}
              </div>
              <p className="small text-muted mt-1">
                Versão {doc.version || 1} · {fmtDate(doc.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-md-6">
            <div className="p-2 bg-primary bg-opacity-10 rounded-lg">
              <p className="small text-primary fw-medium mb-1">Nota do aluno</p>
              <p className="small text-muted">
                {doc.studentNote || <span className="text-muted">Sem nota</span>}
              </p>
            </div>
          </div>
          <div className="col-md-6">
            <div className="p-2 bg-success bg-opacity-10 rounded-lg">
              <p className="small text-success fw-medium mb-1">Seu feedback</p>
              <p className="small text-muted">
                {doc.teacherNote || <span className="text-muted">Sem feedback</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            onClick={() => openPreview(doc)}
            className="btn btn-primary flex-1 d-flex align-items-center justify-content-center gap-2"
          >
            <Eye size={16} />
            Ver
          </button>
          <button
            onClick={() => setShowCorrection({ parentId: doc.id, type: doc.type, filename: doc.original?.filename })}
            className="btn btn-success d-flex align-items-center justify-content-center gap-2"
          >
            <Send size={16} />
            Correção
          </button>
          {doc.original?.url ? (
            <a
              href={doc.original.url}
              target="_blank"
              rel="noreferrer"
              onClick={() => trackDocDownload(doc.id)}
              className="btn btn-outline-secondary d-flex align-items-center justify-content-center"
            >
              <Download size={16} />
            </a>
          ) : null}
        </div>

        <div className="d-flex gap-2 mt-2">
          <button
            onClick={() => setShowHistory(doc.type)}
            className="btn btn-outline-primary flex-1 d-flex align-items-center justify-content-center gap-2"
          >
            <History size={16} />
            Ver histórico
          </button>
        </div>
      </div>
    )
  }

  const ResourceCard = ({ doc }) => {
    return (
      <div className="bg-white border rounded-xl p-3 hover:shadow-sm transition-all mb-2">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-info bg-opacity-10 rounded-lg">
              <BookOpen size={16} className="text-info" />
            </div>
            <div>
              <p className="mb-0 fw-medium">{doc.original?.filename}</p>
              <p className="small text-muted mb-0">{fmtDate(doc.createdAt)}</p>
            </div>
          </div>
          <div className="d-flex gap-2">
            {doc.original?.url ? (
              <a
                href={doc.original.url}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDocDownload(doc.id)}
                className="btn btn-sm btn-outline-primary"
              >
                <Download size={14} />
              </a>
            ) : null}
          </div>
        </div>
        {doc.note ? <p className="small text-muted mt-2 mb-0">{doc.note}</p> : null}
      </div>
    )
  }

  const QuestionCard = ({ question }) => {
    return (
      <div className="mb-4">
        {/* Student Question Bubble */}
        <div className="d-flex align-items-start gap-3 mb-3">
          <div className="flex-shrink-0">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white"
              style={{ width: '40px', height: '40px' }}
            >
              {initials(selectedMentorship?.aluno?.nomeCompleto || 'A')}
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-light rounded-3 p-3 position-relative">
              <div className="d-flex align-items-center justify-content-between mb-2">
                <span className="fw-semibold small text-primary">
                  {selectedMentorship?.aluno?.nomeCompleto || 'Aluno'}
                </span>
                <div className="d-flex align-items-center gap-2">
                  {question.teacherUnread && <span className="badge bg-danger text-white small">Novo</span>}
                  <span className="small text-muted">{fmtDate(question.createdAt)}</span>
                </div>
              </div>
              <p className="mb-1 fw-medium">{question.pergunta}</p>
              {question.detalhe && <p className="small text-muted mb-0">{question.detalhe}</p>}
            </div>
          </div>
        </div>

        {/* Teacher Response Bubble */}
        {question.resposta && (
          <div className="d-flex align-items-start gap-3 mb-3 justify-content-end">
            <div className="flex-1 d-flex justify-content-end">
              <div className="bg-primary text-white rounded-3 p-3 position-relative" style={{ maxWidth: '80%' }}>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="small fw-semibold">Você</span>
                  <span className="small opacity-75">{fmtDate(question.respondidaEm || question.updatedAt)}</span>
                </div>
                <p className="mb-0">{question.resposta}</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center bg-secondary text-white"
                style={{ width: '40px', height: '40px' }}
              >
                P
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!question.resposta && (
          <div className="d-flex gap-2 justify-content-end">
            <button
              onClick={() => markQuestionRead(question)}
              className="btn btn-sm btn-outline-secondary"
              title="Marcar como lida"
            >
              <Check size={14} className="me-1" />
              Lida
            </button>
            <button
              onClick={() => {
                setShowReply(question)
                setReplyText('')
              }}
              className="btn btn-sm btn-primary"
            >
              <MessageSquare size={14} className="me-1" />
              Responder
            </button>
          </div>
        )}
      </div>
    )
  }

  const MeetingCard = ({ meeting, inAllView = false }) => {
    const isPending = meeting.status === 'pending'
    const isAccepted = meeting.status === 'accepted'

    return (
      <div className="bg-white border rounded-xl p-4 mb-3">
        <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
          <div className="d-flex align-items-start gap-3 flex-1">
            <div className={`p-2 rounded-lg ${isAccepted ? 'bg-success bg-opacity-10' : isPending ? 'bg-warning bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
              <Calendar size={20} className={isAccepted ? 'text-success' : isPending ? 'text-warning' : 'text-danger'} />
            </div>
            <div className="flex-1">
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="fw-semibold">{meeting.topic || 'Reunião'}</span>
                <span className={`badge ${isAccepted ? 'bg-success' : isPending ? 'bg-warning' : 'bg-danger'}`}>
                  {meeting.status}
                </span>
              </div>
              {inAllView ? <p className="small text-muted mb-1">{meeting.aluno?.nomeCompleto || 'Aluno'}</p> : null}
              <p className="small text-muted mb-1">{meeting.datetime ? fmtDate(meeting.datetime) : 'Data por definir'}</p>
              <p className="text-xs text-muted">Pedido por: {meeting.requestedBy === 'teacher' ? 'Você' : 'Aluno'}</p>
            </div>
          </div>
        </div>

        {isPending ? (
          <div className="d-flex gap-2">
            <button
              onClick={() => updateMeeting(meeting.id, 'accept')}
              className="btn btn-success flex-1 d-flex align-items-center justify-content-center gap-2"
            >
              <Check size={16} />
              Aceitar
            </button>
            <button
              onClick={() => updateMeeting(meeting.id, 'reject')}
              className="btn btn-danger flex-1 d-flex align-items-center justify-content-center gap-2"
            >
              <XCircle size={16} />
              Rejeitar
            </button>
          </div>
        ) : null}
      </div>
    )
  }

  const ProgressNoteCard = ({ note }) => {
    return (
      <div className="bg-white border rounded-xl p-4 mb-3">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <div className="d-flex align-items-center gap-2">
            <div className="p-1 bg-primary bg-opacity-10 rounded">
              <Clock size={14} className="text-primary" />
            </div>
            <span className="small text-muted">{fmtDate(note.createdAt)}</span>
          </div>
        </div>
        <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{note.note}</p>
      </div>
    )
  }

  // =========================
  // LOGIN SCREEN
  // =========================
  if (!auth) {
    return (
      <div className="container py-5" style={{ maxWidth: 520 }}>
        <div className="card shadow-sm" style={{ borderRadius: 16 }}>
          <div className="card-body p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white" style={{ width: 44, height: 44 }}>
                <User size={20} />
              </div>
              <div>
                <div className="h5 mb-0">Painel do Professor</div>
                <div className="text-muted small">Acesso restrito</div>
              </div>
            </div>

            {loginError ? <div className="alert alert-danger">{loginError}</div> : null}

            <div className="mb-3">
              <label className="form-label">Telefone</label>
              <input className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Senha</label>
              <input className="form-control" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
            </div>

            <button className="btn btn-primary w-100" disabled={busyLogin} onClick={doLogin}>
              {busyLogin ? 'A entrar...' : 'Entrar'}
            </button>

            <div className="text-muted small mt-3">
              Dica: guarde as credenciais como variáveis de ambiente no Vercel.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // =========================
  // MAIN DASHBOARD UI (your new UI)
  // =========================
  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
              <span className="text-white fw-bold">P</span>
            </div>
            <div>
              <h5 className="mb-0 fw-semibold">Painel do Professor</h5>
              <p className="text-muted small mb-0">Gestão de Mentorias</p>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button onClick={() => setShowMeetingModal(true)} className="btn btn-primary d-flex align-items-center gap-2">
              <Plus size={16} />
              <span className="d-none d-md-inline">Nova Reunião</span>
            </button>

            <button className="btn btn-outline-secondary position-relative" onClick={() => setShowNotifSidebar(true)}>
              <Bell size={16} />
              {activeNotifItems.length > 0 ? (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                  {activeNotifItems.length}
                </span>
              ) : null}
            </button>

            <button className="btn btn-outline-dark d-flex align-items-center gap-2" onClick={logout}>
              <LogOut size={16} />
              <span className="d-none d-md-inline">Sair</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="container-fluid py-4">
        <div className="row g-3">
          {/* Sidebar */}
          <div className="col-lg-4">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <h5 className="card-title mb-0">Alunos</h5>
                  <span className="badge bg-primary">{filteredMentorships.length}</span>
                </div>

                {loadingMentorships ? <div className="text-muted small mb-2">a actualizar...</div> : null}

                <div className="btn-group w-100 mb-3" role="group">
                  <button onClick={() => setListMode('pending')} className={`btn btn-sm ${listMode === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}>
                    Pendentes
                  </button>
                  <button onClick={() => setListMode('done')} className={`btn btn-sm ${listMode === 'done' ? 'btn-primary' : 'btn-outline-primary'}`}>
                    Concluídas
                  </button>
                  <button onClick={() => setListMode('all')} className={`btn btn-sm ${listMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}>
                    Todos
                  </button>
                </div>

                <div className="input-group mb-3">
                  <span className="input-group-text bg-transparent border-end-0">
                    <Search size={16} className="text-muted" />
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pesquisar..."
                    className="form-control border-start-0"
                  />
                </div>

                <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
                  {paginatedMentorships.length ? (
                    <div className="d-flex flex-column gap-3">
                      {paginatedMentorships.map(m => (
                        <StudentCard
                          key={m.id}
                          m={m}
                          active={m.id === selectedMentorshipId}
                          onClick={() => setSelectedMentorshipId(m.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted">Nenhum aluno encontrado</div>
                  )}
                </div>

                {/* Pagination */}
                {totalStudentPages > 1 && (
                  <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={currentStudentPage === 1}
                      onClick={() => setCurrentStudentPage(prev => Math.max(1, prev - 1))}
                    >
                      Anterior
                    </button>
                    <span className="small text-muted">
                      Página {currentStudentPage} de {totalStudentPages}
                    </span>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      disabled={currentStudentPage === totalStudentPages}
                      onClick={() => setCurrentStudentPage(prev => Math.min(totalStudentPages, prev + 1))}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="col-lg-8">
            {!selectedMentorship && tab !== 'all-meetings' ? (
              <div className="card">
                <div className="card-body text-center py-5">
                  <Users size={48} className="text-muted mb-3" />
                  <h5 className="text-muted">Selecione um aluno</h5>
                  <p className="text-muted mb-0">Escolha um aluno da lista para ver os detalhes</p>
                </div>
              </div>
            ) : (
              <div>
                {selectedMentorship && tab !== 'all-meetings' ? (
                  <div className="card bg-primary text-white mb-3">
                    <div className="card-body">
                      <div className="d-flex align-items-start justify-content-between">
                        <div className="d-flex align-items-center gap-4">
                          <div className="rounded-circle d-flex align-items-center justify-content-center bg-white bg-opacity-20" style={{ width: '64px', height: '64px' }}>
                            <span className="fs-5 fw-bold">{initials(selectedMentorship.aluno?.nomeCompleto)}</span>
                          </div>
                          <div>
                            <h4 className="mb-1">{selectedMentorship.aluno?.nomeCompleto}</h4>
                            <div className="d-flex flex-wrap gap-3 small text-white-75">
                              <span><Phone size={14} className="me-1" /> {selectedMentorship.aluno?.telefone || '-'}</span>
                              <span><Book size={14} className="me-1" /> {selectedMentorship.aluno?.curso || '-'}</span>
                            </div>
                            <div className="mt-2">
                              <span className="badge bg-black bg-opacity-20">{getMentoriaConfig(selectedMentorship.tipoKey).label}</span>
                            </div>
                          </div>
                        </div>

                        {!isDoneStatus(selectedMentorship.teacherQueueStatus) ? (
                          <button className="btn btn-outline-light" onClick={() => markMentorshipQueue('done')}>
                            Marcar Concluída
                          </button>
                        ) : (
                          <button className="btn btn-outline-warning" onClick={() => markMentorshipQueue('pending')}>
                            Voltar para pendente
                          </button>
                        )}
                      </div>

                      {selectedMentorship.titulo ? (
                        <div className="mt-4 pt-4 border-top border-white border-opacity-20">
                          <p className="text-white-75 small mb-1">Título do trabalho</p>
                          <p className="fw-medium mb-0">{selectedMentorship.titulo}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Tabs */}
                <div className="card mb-3">
                  <div className="card-body p-0">
                    <ul className="nav nav-tabs" role="tablist">
                      {[
                        { id: 'mentoria', label: 'Mentoria', icon: FileText },
                        { id: 'questions', label: 'Perguntas', icon: MessageSquare, count: pendingCounts.questions },
                        { id: 'meetings', label: 'Reuniões', icon: Calendar, count: pendingCounts.meetings },
                        { id: 'progress', label: 'Progresso', icon: TrendingUp },
                        { id: 'all-meetings', label: 'Todas Reuniões', icon: Users, global: true }
                      ].map(t => (
                        <li className="nav-item" key={t.id}>
                          <button onClick={() => setTab(t.id)} className={`nav-link ${tab === t.id ? 'active' : ''}`}>
                            <t.icon size={16} className="me-2" />
                            {t.label}
                            {t.count > 0 && !t.global ? <span className="badge bg-danger ms-2">{t.count}</span> : null}
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="tab-content p-4">
                      {busyPanel ? <div className="alert alert-info">A carregar dados…</div> : null}

                      {/* Mentoria */}
                      {tab === 'mentoria' && selectedMentorship ? (
                        <div>
                          <div className="d-flex flex-wrap gap-2 mb-4">
                            {docTypes.map(type => (
                              <button
                                key={type}
                                onClick={() => setDocTab(type)}
                                className={`btn ${docTab === type ? 'btn-primary' : 'btn-outline-primary'}`}
                              >
                                {getDocLabel(type, selectedMentorship.tipoKey)}
                              </button>
                            ))}
                          </div>

                          {/* Prominent Program Display */}
                          {docsGrouped[docTab]?.submissions?.length ? (
                            <div className="card shadow-sm mb-4">
                              <div className="card-body">
                                <div className="d-flex align-items-center justify-content-between mb-4">
                                  <h5 className="card-title mb-0">
                                    <FileText size={20} className="me-2 text-primary" />
                                    {getDocLabel(docTab, selectedMentorship.tipoKey)} Enviado
                                  </h5>
                                  {docsGrouped[docTab].submissions[0].teacherUnread && (
                                    <span className="badge bg-danger">Novo</span>
                                  )}
                                </div>

                                <div className="row g-3 mb-4">
                                  <div className="col-md-8">
                                    <div className="p-3 bg-light rounded">
                                      <div className="d-flex align-items-center gap-3 mb-2">
                                        <div className="p-2 bg-white rounded shadow-sm">
                                          <FileText size={24} className="text-danger" />
                                        </div>
                                        <div>
                                          <h6 className="mb-1">{docsGrouped[docTab].submissions[0].original?.filename}</h6>
                                          <p className="small text-muted mb-0">
                                            Versão {docsGrouped[docTab].submissions[0].version || 1} · {fmtDate(docsGrouped[docTab].submissions[0].createdAt)}
                                          </p>
                                        </div>
                                      </div>
                                      {docsGrouped[docTab].submissions[0].studentNote && (
                                        <p className="small text-muted mt-2">
                                          <strong>Nota do aluno:</strong> {docsGrouped[docTab].submissions[0].studentNote}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="col-md-4">
                                    <div className="d-grid gap-2">
                                      <button
                                        onClick={() => openPreview(docsGrouped[docTab].submissions[0])}
                                        className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
                                      >
                                        <Eye size={16} />
                                        Pré-visualizar
                                      </button>
                                      <button
                                        onClick={() => setShowCorrection({
                                          parentId: docsGrouped[docTab].submissions[0].id,
                                          type: docsGrouped[docTab].submissions[0].type,
                                          filename: docsGrouped[docTab].submissions[0].original?.filename
                                        })}
                                        className="btn btn-success d-flex align-items-center justify-content-center gap-2"
                                      >
                                        <Send size={16} />
                                        Enviar Correção
                                      </button>
                                      <button
                                        onClick={() => setShowHistory(docTab)}
                                        className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2"
                                      >
                                        <History size={16} />
                                        Ver histórico
                                      </button>
                                      {docsGrouped[docTab].submissions[0].original?.url && (
                                        <a
                                          href={docsGrouped[docTab].submissions[0].original.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={() => trackDocDownload(docsGrouped[docTab].submissions[0].id)}
                                          className="btn btn-outline-secondary d-flex align-items-center justify-content-center gap-2"
                                        >
                                          <Download size={16} />
                                          Descarregar
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Teacher Feedback */}
                                {docsGrouped[docTab].submissions[0].teacherNote && (
                                  <div className="alert alert-success">
                                    <h6 className="alert-heading mb-2">
                                      <MessageSquare size={16} className="me-2" />
                                      Seu Feedback Anterior
                                    </h6>
                                    <p className="mb-0">{docsGrouped[docTab].submissions[0].teacherNote}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="card border-dashed border-2 mb-4">
                              <div className="card-body text-center py-5">
                                <FileText size={48} className="text-muted mb-3" />
                                <h5 className="text-muted">Nenhum documento enviado</h5>
                                <p className="text-muted mb-0">O aluno ainda não enviou o {getDocLabel(docTab, selectedMentorship.tipoKey).toLowerCase()}</p>
                              </div>
                            </div>
                          )}

                          <div className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0">
                                <BookOpen size={18} className="me-2" />
                                Recursos de Apoio ({docsGrouped[docTab]?.resources?.length || 0})
                              </h6>
                              <button onClick={() => setShowResourceModal(true)} className="btn btn-sm btn-outline-primary">
                                <Plus size={14} className="me-1" />
                                Adicionar Recurso
                              </button>
                            </div>

                            {docsGrouped[docTab]?.resources?.length ? (
                              docsGrouped[docTab].resources.map(doc => <ResourceCard key={doc.id} doc={doc} />)
                            ) : (
                              <div className="text-center py-4 text-muted border rounded">
                                <BookOpen size={32} className="mb-2" />
                                <p className="mb-0">Nenhum recurso disponível</p>
                              </div>
                            )}
                          </div>

                          {/* New Feedback */}
                          <div className="card">
                            <div className="card-body">
                              <h6 className="card-title mb-3">
                                <MessageSquare size={18} className="me-2" />
                                Enviar Feedback
                              </h6>
                              <div className="mb-3">
                                <label className="form-label">Mensagem para o aluno</label>
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  value={feedbackText}
                                  onChange={(e) => setFeedbackText(e.target.value)}
                                  placeholder="Escreva o seu feedback sobre o trabalho..."
                                />
                              </div>
                              <button
                                onClick={handleSendFeedback}
                                className="btn btn-primary"
                                disabled={!feedbackText.trim()}
                              >
                                <Send size={16} className="me-2" />
                                Enviar Feedback
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* Questions */}
                      {tab === 'questions' && selectedMentorship ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5>Perguntas do Aluno</h5>
                            <span className="badge bg-primary">{questions.length} pergunta(s)</span>
                          </div>

                          {questions.length ? (
                            questions.map(q => <QuestionCard key={q.id} question={q} />)
                          ) : (
                            <div className="text-center py-5 text-muted">
                              <MessageSquare size={48} className="mb-3" />
                              <p className="mb-0">Nenhuma pergunta por responder</p>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Meetings */}
                      {tab === 'meetings' && selectedMentorship ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5>Reuniões</h5>
                            <span className="badge bg-primary">{meetings.length} reunião(ões)</span>
                          </div>

                          {meetings.length ? (
                            meetings.map(m => <MeetingCard key={m.id} meeting={m} />)
                          ) : (
                            <div className="text-center py-5 text-muted">
                              <Calendar size={48} className="mb-3" />
                              <p className="mb-0">Nenhuma reunião agendada</p>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* Progress */}
                      {tab === 'progress' && selectedMentorship ? (
                        <div>
                          <div className="card mb-4">
                            <div className="card-body">
                              <h6 className="card-title mb-3">
                                <Edit2 size={18} className="me-2" />
                                Nova Nota de Progresso
                              </h6>
                              <div className="mb-3">
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  value={progressNote}
                                  onChange={(e) => setProgressNote(e.target.value)}
                                  placeholder="Registe observações sobre o progresso do aluno..."
                                />
                              </div>
                              <button
                                onClick={handleAddProgressNote}
                                className="btn btn-primary"
                                disabled={!progressNote.trim()}
                              >
                                <Plus size={16} className="me-2" />
                                Adicionar Nota
                              </button>
                            </div>
                          </div>

                          <h5 className="mb-3">Histórico de Progresso</h5>

                          {progress.length ? (
                            progress.map(note => <ProgressNoteCard key={note.id} note={note} />)
                          ) : (
                            <div className="text-center py-5 text-muted">
                              <TrendingUp size={48} className="mb-3" />
                              <p className="mb-0">Nenhuma nota de progresso registada</p>
                            </div>
                          )}
                        </div>
                      ) : null}

                      {/* All meetings (only works if you fill allMeetings from an endpoint) */}
                      {tab === 'all-meetings' ? (
                        <div>
                          <div className="d-flex justify-content-between align-items-center mb-4">
                            <h5>Todas as Reuniões</h5>
                            <span className="badge bg-primary">{allMeetings.length} reunião(ões)</span>
                          </div>

                          {busyAllMeetings ? <div className="alert alert-info">A carregar todas as reuniões…</div> : null}

                          {allMeetings.length ? (
                            allMeetings.map(m => <MeetingCard key={m.id} meeting={m} inAllView />)
                          ) : (
                            <div className="text-center py-5 text-muted">
                              <Users size={48} className="mb-3" />
                              <p className="mb-0">Nenhuma reunião encontrada</p>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal (real preview like old admin: PDF or Google Viewer) */}
      {showPreview ? (
        <PreviewModal
          doc={showPreview}
          onClose={() => setShowPreview(null)}
          onDownload={async () => {
            if (showPreview?.id) await trackDocDownload(showPreview.id)
          }}
        />
      ) : null}

      {/* Notifications Sidebar */}
      {showNotifSidebar && (
        <div className="position-fixed top-0 end-0 bg-white border-start shadow-lg" style={{ width: '400px', height: '100vh', zIndex: 1050, overflowY: 'auto' }}>
          <div className="p-3 border-bottom">
            <div className="d-flex align-items-center justify-content-between">
              <h5 className="mb-0">Notificações</h5>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowNotifSidebar(false)}>
                <XCircle size={16} />
              </button>
            </div>
          </div>
          <div className="p-3">
            {activeNotifItems.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <Bell size={48} className="mb-3" />
                <p className="mb-0">Sem notificações novas</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {activeNotifItems.map((n, idx) => (
                  <div key={idx} className="card border-0 shadow-sm">
                    <div className="card-body p-3">
                      <div className="d-flex align-items-start gap-3">
                        <div className={`p-2 rounded-circle ${n.type === 'document' ? 'bg-danger bg-opacity-10 text-danger' : n.type === 'question' ? 'bg-primary bg-opacity-10 text-primary' : 'bg-warning bg-opacity-10 text-warning'}`}>
                          {n.type === 'document' ? <FileText size={16} /> : n.type === 'question' ? <MessageSquare size={16} /> : <Calendar size={16} />}
                        </div>
                        <div className="flex-1">
                          <div className="d-flex align-items-start justify-content-between mb-2">
                            <h6 className="mb-0 fw-semibold">{n.title}</h6>
                            <button
                              className="btn btn-sm btn-outline-secondary ms-2"
                              onClick={() => setDismissedNotifs(prev => new Set([...prev, n.refId]))}
                              title="Marcar como vista"
                            >
                              <Check size={14} />
                            </button>
                          </div>
                          <p className="small text-muted mb-2">{n.message}</p>
                          <p className="small text-muted mb-0">{fmtDate(n.createdAt)}</p>
                          <button
                            className="btn btn-sm btn-outline-primary mt-2"
                            onClick={() => {
                              setShowNotifSidebar(false)
                              if (n.type === 'document') setTab('mentoria')
                              if (n.type === 'question') setTab('questions')
                              if (n.type === 'meeting') setTab('meetings')
                            }}
                          >
                            Ver
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Correction Modal */}
      {showCorrection ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enviar Correção</h5>
                <button type="button" className="btn-close" onClick={() => setShowCorrection(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">Documento: <strong>{showCorrection.filename}</strong></p>
                <div className="mb-3">
                  <label className="form-label">Ficheiro da correção</label>
                  <input ref={correctionFileRef} type="file" className="form-control" accept=".pdf,.doc,.docx" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Nota (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={correctionNote}
                    onChange={(e) => setCorrectionNote(e.target.value)}
                    placeholder="Ex: Corrigi as citações e a estrutura..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleUploadCorrection}>
                  <Upload size={16} className="me-2" />
                  Enviar Correção
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCorrection(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reply Modal */}
      {showReply ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Responder Pergunta</h5>
                <button type="button" className="btn-close" onClick={() => setShowReply(null)}></button>
              </div>
              <div className="modal-body">
                <p className="fw-medium mb-3">{showReply.pergunta}</p>
                <div className="mb-3">
                  <label className="form-label">Sua resposta</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escreva a sua resposta..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleSendReply}>
                  <Send size={16} className="me-2" />
                  Enviar Resposta
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReply(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Meeting Modal */}
      {showMeetingModal ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Criar Nova Reunião</h5>
                <button type="button" className="btn-close" onClick={() => setShowMeetingModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="form-check mb-3">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={meetingForAll}
                    onChange={(e) => setMeetingForAll(e.target.checked)}
                    id="forAll"
                  />
                  <label className="form-check-label" htmlFor="forAll">
                    Criar para todos os alunos
                  </label>
                </div>
                <div className="mb-3">
                  <label className="form-label">Data e Hora</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={meetingDatetime}
                    onChange={(e) => setMeetingDatetime(e.target.value)}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Tópico</label>
                  <input
                    type="text"
                    className="form-control"
                    value={meetingTopic}
                    onChange={(e) => setMeetingTopic(e.target.value)}
                    placeholder="Ex: Revisão do Capítulo 3"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleCreateMeeting}>
                  <Calendar size={16} className="me-2" />
                  Criar Reunião
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Resource Modal */}
      {showResourceModal ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Recurso</h5>
                <button type="button" className="btn-close" onClick={() => setShowResourceModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tipo de Documento</label>
                  <select className="form-select" value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
                    {docTypes.map(type => (
                      <option key={type} value={type}>
                        {getDocLabel(type, selectedMentorship?.tipoKey)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Ficheiro</label>
                  <input ref={resourceFileRef} type="file" className="form-control" accept=".pdf,.doc,.docx,.ppt,.pptx" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Descrição (opcional)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={resourceNote}
                    onChange={(e) => setResourceNote(e.target.value)}
                    placeholder="Ex: Template para estrutura, exemplos, etc..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleUploadResource}>
                  <UploadCloud size={16} className="me-2" />
                  Enviar Recurso
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResourceModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* History Modal */}
      {showHistory ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Histórico - {getDocLabel(showHistory, selectedMentorship?.tipoKey)}</h5>
                <button type="button" className="btn-close" onClick={() => setShowHistory(null)}></button>
              </div>
              <div className="modal-body">
                <div className="list-group">
                  {docsGrouped[showHistory]?.submissions?.map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3"
                      onClick={() => openPreview(doc)}
                    >
                      <div className="bg-white border rounded-3 p-2 d-inline-flex align-items-center justify-content-center">
                        <FileText size={20} className="text-danger" />
                      </div>

                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate" title={doc.original?.filename}>
                          {truncate(doc.original?.filename, 55)}
                        </div>
                        <div className="d-flex align-items-center gap-2 text-muted small mt-1">
                          <span className="badge text-bg-secondary">v{doc.version || 1}</span>
                          <span>{fmtDate(doc.createdAt)}</span>
                          {doc.teacherUnread && <span className="badge text-bg-danger ms-1">Novo</span>}
                        </div>
                      </div>

                      <ChevronRight size={18} className="text-muted" />
                    </button>
                  )) || []}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(null)}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>

  )
}

function PreviewModal({ doc, onClose, onDownload }) {
  const url = doc?.pdf?.url || doc?.original?.url || ''
  const contentType = doc?.pdf?.contentType || doc?.original?.contentType || ''
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
              <h5 className="modal-title">
                <FileText size={18} className="me-2" />
                {doc?.original?.filename || 'Documento'}
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
                  <Download size={16} className="me-2" /> Baixar
                </a>
              ) : null}
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Fechar</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
