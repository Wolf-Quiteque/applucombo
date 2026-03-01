'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  FileText, Download, Eye, Clock, Upload, MessageSquare, Calendar, TrendingUp,
  Bell, LogOut, Plus, Edit2, File, AlertCircle, Search, Check, XCircle,
  Users, BookOpen, Send, User, Phone, Book, UploadCloud, History, ChevronRight, ChevronLeft
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
  const [meetingDescription, setMeetingDescription] = useState('')
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

  async function dismissNotif(n) {
    // Optimistically remove from local state immediately
    setDismissedNotifs(prev => new Set([...prev, n.refId]))
    setNotifItems(prev => prev.filter(x => x.refId !== n.refId))
    try {
      if (n.type === 'question') {
        await axios.patch(`/api/mentoring/questions/${n.refId}`, { action: 'markTeacherRead' })
      } else if (n.type === 'document') {
        await axios.patch(`/api/mentoring/documents/${n.refId}/event`, { role: 'teacher', action: 'markRead' })
      } else if (n.type === 'meeting') {
        await axios.patch(`/api/mentoring/meetings/${n.refId}`, { action: 'markTeacherRead' })
      }
    } catch (e) {
      console.error('Erro ao marcar notificação como lida:', e)
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
        description: meetingDescription.trim(),
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
      setMeetingDescription('')
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
  // UI SUB-COMPONENTS
  // =========================

  const ResourceCard = ({ doc }) => (
    <div className="d-flex align-items-center justify-content-between p-3 border rounded-3 mb-2" style={{ background: '#fafbfc' }}>
      <div className="d-flex align-items-center gap-3 min-w-0 flex-grow-1">
        <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 36, height: 36, background: 'rgba(13,110,253,.08)' }}>
          <BookOpen size={16} className="text-primary" />
        </div>
        <div className="min-w-0">
          <div className="fw-medium text-truncate" style={{ fontSize: 13 }}>{doc.original?.filename}</div>
          <div className="text-muted" style={{ fontSize: 11 }}>{fmtDate(doc.createdAt)}{doc.note ? ` — ${doc.note}` : ''}</div>
        </div>
      </div>
      {doc.original?.url ? (
        <a href={doc.original.url} target="_blank" rel="noreferrer" onClick={() => trackDocDownload(doc.id)} className="btn btn-sm btn-outline-secondary flex-shrink-0 ms-2">
          <Download size={13} />
        </a>
      ) : null}
    </div>
  )

  const QuestionCard = ({ question }) => (
    <div className="mb-4">
      <div className="d-flex align-items-start gap-3 mb-3">
        <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary text-white flex-shrink-0 fw-semibold" style={{ width: 36, height: 36, fontSize: 13 }}>
          {initials(selectedMentorship?.aluno?.nomeCompleto || 'A')}
        </div>
        <div className="flex-grow-1">
          <div className="rounded-3 p-3" style={{ background: '#f0f2f5' }}>
            <div className="d-flex align-items-center justify-content-between mb-1 gap-2 flex-wrap">
              <span className="fw-semibold text-primary" style={{ fontSize: 13 }}>
                {selectedMentorship?.aluno?.nomeCompleto || 'Aluno'}
              </span>
              <div className="d-flex align-items-center gap-2">
                {question.teacherUnread && <span className="badge bg-danger" style={{ fontSize: 10 }}>Novo</span>}
                <span className="text-muted" style={{ fontSize: 11 }}>{fmtDate(question.createdAt)}</span>
              </div>
            </div>
            <p className="mb-1 fw-medium" style={{ fontSize: 14 }}>{question.pergunta}</p>
            {question.detalhe && <p className="text-muted mb-0" style={{ fontSize: 13 }}>{question.detalhe}</p>}
          </div>
        </div>
      </div>

      {question.resposta && (
        <div className="d-flex align-items-start gap-3 mb-3 justify-content-end">
          <div className="d-flex justify-content-end flex-grow-1">
            <div className="bg-primary text-white rounded-3 p-3" style={{ maxWidth: '80%' }}>
              <div className="d-flex align-items-center justify-content-between mb-1 gap-2">
                <span className="fw-semibold" style={{ fontSize: 12 }}>Você</span>
                <span style={{ fontSize: 11, opacity: 0.75 }}>{fmtDate(question.respondidaEm || question.updatedAt)}</span>
              </div>
              <p className="mb-0" style={{ fontSize: 14 }}>{question.resposta}</p>
            </div>
          </div>
          <div className="rounded-circle d-flex align-items-center justify-content-center bg-secondary text-white flex-shrink-0 fw-semibold" style={{ width: 36, height: 36, fontSize: 13 }}>P</div>
        </div>
      )}

      {!question.resposta && (
        <div className="d-flex gap-2 justify-content-end">
          <button onClick={() => markQuestionRead(question)} className="btn btn-sm btn-outline-secondary">
            <Check size={13} className="me-1" />Lida
          </button>
          <button onClick={() => { setShowReply(question); setReplyText('') }} className="btn btn-sm btn-primary">
            <MessageSquare size={13} className="me-1" />Responder
          </button>
        </div>
      )}
    </div>
  )

  const MeetingCard = ({ meeting, inAllView = false }) => {
    const isPending = meeting.status === 'pending'
    const isAccepted = meeting.status === 'accepted'
    const statusClass = isAccepted ? 'bg-success' : isPending ? 'bg-warning text-dark' : 'bg-danger'
    const statusLabel = isAccepted ? 'Aceite' : isPending ? 'Pendente' : 'Rejeitada'
    const iconColor = isAccepted ? '#198754' : isPending ? '#ffc107' : '#dc3545'
    return (
      <div className="modern-card border p-3 mb-3">
        <div className="d-flex align-items-start gap-3">
          <div className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 40, height: 40, background: `${iconColor}12` }}>
            <Calendar size={18} style={{ color: iconColor }} />
          </div>
          <div className="flex-grow-1 min-w-0">
            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
              <span className="fw-semibold" style={{ fontSize: 14 }}>{meeting.topic || 'Reunião'}</span>
              <span className={`badge ${statusClass}`} style={{ fontSize: 10 }}>{statusLabel}</span>
            </div>
            {inAllView && <div className="text-muted" style={{ fontSize: 12 }}>{meeting.aluno?.nomeCompleto || 'Aluno'}</div>}
            <div className="text-muted" style={{ fontSize: 12 }}>{meeting.datetime ? fmtDate(meeting.datetime) : 'Data por definir'}</div>
            <div className="text-muted" style={{ fontSize: 11 }}>Pedido por: {meeting.requestedBy === 'teacher' ? 'Você' : 'Aluno'}</div>
            {meeting.description && (
              <div className="mt-2 p-2 rounded-2" style={{ background: 'rgba(13,110,253,.06)', border: '1px solid rgba(13,110,253,.12)', fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {meeting.description}
              </div>
            )}
          </div>
        </div>
        {isPending && (
          <div className="d-flex gap-2 mt-3">
            <button onClick={() => updateMeeting(meeting.id, 'accept')} className="btn btn-sm btn-success flex-grow-1 d-flex align-items-center justify-content-center gap-1">
              <Check size={13} />Aceitar
            </button>
            <button onClick={() => updateMeeting(meeting.id, 'reject')} className="btn btn-sm btn-outline-danger flex-grow-1 d-flex align-items-center justify-content-center gap-1">
              <XCircle size={13} />Rejeitar
            </button>
          </div>
        )}
      </div>
    )
  }

  const ProgressNoteCard = ({ note }) => (
    <div className="border rounded-3 p-3 mb-2" style={{ background: '#fafbfc' }}>
      <div className="d-flex align-items-center gap-2 mb-2">
        <Clock size={13} className="text-muted" />
        <span className="text-muted" style={{ fontSize: 12 }}>{fmtDate(note.createdAt)}</span>
      </div>
      <p className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{note.note}</p>
    </div>
  )

  // =========================
  // LOGIN SCREEN
  // =========================
  if (!auth) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ background: '#f5f6f8' }}>
        <div className="modern-card bg-white p-4 p-md-5" style={{ width: '100%', maxWidth: 440 }}>
          <div className="text-center mb-4">
            <div className="rounded-circle bg-primary d-inline-flex align-items-center justify-content-center mb-3" style={{ width: 56, height: 56 }}>
              <User size={24} className="text-white" />
            </div>
            <h4 className="fw-semibold mb-1">Painel do Professor</h4>
            <p className="text-muted mb-0" style={{ fontSize: 14 }}>Acesso restrito</p>
          </div>

          {loginError ? <div className="alert alert-danger" style={{ fontSize: 14 }}>{loginError}</div> : null}

          <div className="mb-3">
            <label className="form-label" style={{ fontSize: 13 }}>Telefone</label>
            <input className="form-control" value={telefone} onChange={e => setTelefone(e.target.value)} />
          </div>
          <div className="mb-4">
            <label className="form-label" style={{ fontSize: 13 }}>Senha</label>
            <input className="form-control" type="password" value={senha} onChange={e => setSenha(e.target.value)} />
          </div>

          <button className="btn btn-primary w-100 py-2" disabled={busyLogin} onClick={doLogin}>
            {busyLogin ? 'A entrar...' : 'Entrar'}
          </button>
        </div>
      </div>
    )
  }

  // =========================
  // DETERMINE VIEW MODE
  // =========================
  const isOverview = tab === 'overview' || (!selectedMentorship && tab !== 'all-meetings')
  const isFocus = !!selectedMentorship && !isOverview && tab !== 'all-meetings'

  // =========================
  // MAIN DASHBOARD UI
  // =========================
  return (
    <div className="min-vh-100" style={{ background: '#f5f6f8' }}>

      {/* ---- TOP NAV ---- */}
      <nav className="bg-white border-bottom sticky-top" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div className="container">
          <div className="d-flex align-items-center justify-content-between py-2" style={{ minHeight: 56 }}>
            <div className="d-flex align-items-center gap-3">
              <div className="rounded-3 bg-primary d-flex align-items-center justify-content-center" style={{ width: 40, height: 40 }}>
                <span className="text-white fw-bold" style={{ fontSize: 16 }}>P</span>
              </div>
              <div>
                <div className="fw-semibold" style={{ fontSize: 16, lineHeight: 1.2 }}>Painel de Mentoria</div>
                <div className="text-muted" style={{ fontSize: 12 }}>Prof. Lucombo Luveia</div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <button
                onClick={() => setTab('all-meetings')}
                className={`btn btn-sm d-flex align-items-center gap-2 ${tab === 'all-meetings' ? 'btn-primary' : 'btn-outline-secondary'}`}
              >
                <Calendar size={15} />
                <span className="d-none d-sm-inline">Reuniões Globais</span>
              </button>
              <button onClick={() => setShowMeetingModal(true)} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2">
                <Plus size={15} />
                <span className="d-none d-sm-inline">Nova Reunião</span>
              </button>
              <button className="btn btn-sm btn-outline-secondary position-relative" onClick={() => setShowNotifSidebar(true)}>
                <Bell size={16} />
                {activeNotifItems.length > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: 10 }}>
                    {activeNotifItems.length}
                  </span>
                )}
              </button>
              <button className="btn btn-sm btn-outline-dark d-flex align-items-center gap-2" onClick={logout}>
                <LogOut size={15} />
                <span className="d-none d-sm-inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container py-4">

        {/* ---- WELCOME CARD ---- */}
        {isOverview && (
          <div className="modern-card mb-4 text-white" style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', border: 'none' }}>
            <div className="p-4">
              <h5 className="fw-semibold mb-1">Bem-vindo, Prof. Lucombo Luveia</h5>
              <p className="mb-0" style={{ fontSize: 14, opacity: 0.85 }}>
                Aqui encontra uma visão geral de todos os seus alunos e mentorias activas.
                {filteredMentorships.filter(m => !isDoneStatus(m.teacherQueueStatus)).length > 0 && (
                  <> Tem <strong>{filteredMentorships.filter(m => !isDoneStatus(m.teacherQueueStatus)).length}</strong> {filteredMentorships.filter(m => !isDoneStatus(m.teacherQueueStatus)).length === 1 ? 'mentoria pendente' : 'mentorias pendentes'} de revisão.</>
                )}
              </p>
            </div>
          </div>
        )}

        {/* =============================== */}
        {/* OVERVIEW MODE — Student Table    */}
        {/* =============================== */}
        {(isOverview) && (
          <div>
            {/* Filter bar */}
            <div className="d-flex align-items-center justify-content-between mb-4 gap-3 flex-wrap">
              <div className="d-flex gap-2 flex-wrap">
                {[
                  { mode: 'pending', label: 'Pendentes' },
                  { mode: 'done', label: 'Concluídas' },
                  { mode: 'all', label: 'Todos' },
                ].map(({ mode, label }) => (
                  <button
                    key={mode}
                    onClick={() => { setListMode(mode); setCurrentStudentPage(1) }}
                    className={`btn btn-sm ${listMode === mode ? 'btn-primary' : 'btn-outline-secondary'}`}
                    style={{ borderRadius: 20, padding: '6px 18px' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="input-group" style={{ maxWidth: 300 }}>
                  <span className="input-group-text bg-white border-end-0"><Search size={14} className="text-muted" /></span>
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar aluno..." className="form-control border-start-0" style={{ boxShadow: 'none' }} />
                </div>
                <span className="badge bg-primary rounded-pill" style={{ fontSize: 13 }}>{filteredMentorships.length}</span>
              </div>
            </div>

            {loadingMentorships && (
              <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>A carregar alunos...</div>
            )}

            {/* Student table */}
            <div className="modern-card bg-white">
              <div className="table-responsive">
                <table className="table table-hover mb-0 align-middle" style={{ fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                      <th style={{ width: 50, paddingLeft: 20 }}></th>
                      <th className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Aluno</th>
                      <th className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo</th>
                      <th className="fw-semibold text-muted d-none d-md-table-cell" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título</th>
                      <th className="fw-semibold text-muted text-center" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pendentes</th>
                      <th className="fw-semibold text-muted" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estado</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedMentorships.length ? paginatedMentorships.map(m => {
                      const total = (m.pendingCounts?.total || 0)
                      return (
                        <tr key={m.id} onClick={() => { setSelectedMentorshipId(m.id); setTab('mentoria') }} style={{ cursor: 'pointer' }}>
                          <td style={{ paddingLeft: 20 }}>
                            <div className="rounded-circle d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary fw-semibold" style={{ width: 36, height: 36, fontSize: 13 }}>
                              {initials(m.aluno?.nomeCompleto)}
                            </div>
                          </td>
                          <td>
                            <div className="fw-semibold">{m.aluno?.nomeCompleto || 'Aluno'}</div>
                            {m.aluno?.telefone && <div className="text-muted" style={{ fontSize: 12 }}>{m.aluno.telefone}</div>}
                          </td>
                          <td><span className="badge text-bg-light border" style={{ fontSize: 11 }}>{getMentoriaConfig(m.tipoKey).label}</span></td>
                          <td className="d-none d-md-table-cell"><span className="text-muted">{truncate(m.titulo, 40)}</span></td>
                          <td className="text-center">
                            {total > 0 ? <span className="badge bg-danger rounded-pill">{total}</span> : <span className="text-muted">—</span>}
                          </td>
                          <td>
                            {isDoneStatus(m.teacherQueueStatus)
                              ? <span className="badge bg-success" style={{ fontSize: 11 }}>Concluída</span>
                              : <span className="badge bg-warning text-dark" style={{ fontSize: 11 }}>Pendente</span>
                            }
                          </td>
                          <td><ChevronRight size={16} className="text-muted" /></td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan={7} className="text-center py-5 text-muted">
                          <Users size={40} className="mb-3 d-block mx-auto" />
                          Nenhum aluno encontrado
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {totalStudentPages > 1 && (
                <div className="d-flex justify-content-center align-items-center gap-3 py-3 border-top">
                  <button className="btn btn-sm btn-outline-secondary" disabled={currentStudentPage === 1} onClick={() => setCurrentStudentPage(prev => Math.max(1, prev - 1))}>
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-muted" style={{ fontSize: 13 }}>{currentStudentPage} de {totalStudentPages}</span>
                  <button className="btn btn-sm btn-outline-secondary" disabled={currentStudentPage === totalStudentPages} onClick={() => setCurrentStudentPage(prev => Math.min(totalStudentPages, prev + 1))}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =============================== */}
        {/* GLOBAL MEETINGS VIEW             */}
        {/* =============================== */}
        {tab === 'all-meetings' && (
          <div>
            <div className="d-flex align-items-center justify-content-between mb-4">
              <div>
                <h4 className="fw-semibold mb-1">Todas as Reuniões</h4>
                <p className="text-muted mb-0" style={{ fontSize: 14 }}>Vista global — todos os alunos</p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <span className="badge bg-primary rounded-pill" style={{ fontSize: 13 }}>{allMeetings.length}</span>
                <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={() => setTab('overview')}>
                  <ChevronLeft size={15} /> Voltar
                </button>
              </div>
            </div>

            {busyAllMeetings && <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>A carregar reuniões...</div>}

            {allMeetings.length ? (
              <div className="row g-3">
                {allMeetings.map(m => (
                  <div key={m.id} className="col-lg-6">
                    <MeetingCard meeting={m} inAllView />
                  </div>
                ))}
              </div>
            ) : !busyAllMeetings ? (
              <div className="modern-card bg-white text-center py-5">
                <Calendar size={48} className="text-muted mb-3" />
                <p className="text-muted mb-0" style={{ fontSize: 15 }}>Nenhuma reunião registada</p>
              </div>
            ) : null}
          </div>
        )}

        {/* =============================== */}
        {/* FOCUS MODE — Student Detail      */}
        {/* =============================== */}
        {isFocus && selectedMentorship && (
          <div>
            {/* Navigation bar */}
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
              <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={() => setTab('overview')}>
                <ChevronLeft size={16} />
                Ver Todos os Alunos
              </button>
              <div className="d-flex align-items-center gap-3">
                {(() => {
                  const idx = filteredMentorships.findIndex(m => m.id === selectedMentorshipId)
                  const prev = idx > 0 ? filteredMentorships[idx - 1] : null
                  const next = idx < filteredMentorships.length - 1 ? filteredMentorships[idx + 1] : null
                  return (
                    <>
                      <span className="text-muted" style={{ fontSize: 13 }}>Aluno {idx + 1} de {filteredMentorships.length}</span>
                      <div className="btn-group">
                        <button className="btn btn-sm btn-outline-secondary" disabled={!prev} onClick={() => prev && setSelectedMentorshipId(prev.id)}>
                          <ChevronLeft size={15} />
                        </button>
                        <button className="btn btn-sm btn-outline-secondary" disabled={!next} onClick={() => next && setSelectedMentorshipId(next.id)}>
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Student header card */}
            <div className="modern-card bg-white mb-4">
              <div className="p-4">
                <div className="d-flex align-items-start gap-3">
                  <div className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-primary text-white fw-bold" style={{ width: 52, height: 52, fontSize: 18 }}>
                    {initials(selectedMentorship.aluno?.nomeCompleto)}
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <h5 className="mb-0 fw-semibold">{selectedMentorship.aluno?.nomeCompleto}</h5>
                      <span className="badge text-bg-light border" style={{ fontSize: 11 }}>{getMentoriaConfig(selectedMentorship.tipoKey).label}</span>
                      <span className={`badge ${isDoneStatus(selectedMentorship.teacherQueueStatus) ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: 11 }}>
                        {isDoneStatus(selectedMentorship.teacherQueueStatus) ? 'Concluída' : 'Em andamento'}
                      </span>
                    </div>
                    <div className="d-flex align-items-center gap-3 flex-wrap text-muted" style={{ fontSize: 13 }}>
                      {selectedMentorship.aluno?.telefone && <span><Phone size={12} className="me-1" />{selectedMentorship.aluno.telefone}</span>}
                      {selectedMentorship.aluno?.curso && <span><Book size={12} className="me-1" />{selectedMentorship.aluno.curso}</span>}
                      {selectedMentorship.titulo && <span className="text-truncate" style={{ maxWidth: 350 }} title={selectedMentorship.titulo}>{truncate(selectedMentorship.titulo, 60)}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 d-flex gap-2">
                    <button onClick={() => setShowResourceModal(true)} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                      <Plus size={13} /> Recurso
                    </button>
                    {!isDoneStatus(selectedMentorship.teacherQueueStatus) ? (
                      <button className="btn btn-sm btn-outline-success d-flex align-items-center gap-1" onClick={() => markMentorshipQueue('done')}>
                        <Check size={13} /> Concluir
                      </button>
                    ) : (
                      <button className="btn btn-sm btn-outline-warning" onClick={() => markMentorshipQueue('pending')}>Reabrir</button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab bar inside card */}
              <div className="border-top px-4">
                <div className="d-flex gap-1 py-2 flex-wrap">
                  {[
                    { id: 'mentoria', label: 'Documentos', icon: FileText, count: pendingCounts.docs },
                    { id: 'questions', label: 'Perguntas', icon: MessageSquare, count: pendingCounts.questions },
                    { id: 'meetings', label: 'Reuniões', icon: Calendar, count: pendingCounts.meetings },
                    { id: 'progress', label: 'Progresso', icon: TrendingUp },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`btn btn-sm d-flex align-items-center gap-2 ${tab === t.id ? 'btn-primary' : 'btn-light'}`}
                      style={{ borderRadius: 10, padding: '7px 18px', fontSize: 13 }}
                    >
                      <t.icon size={14} />
                      {t.label}
                      {t.count > 0 && <span className="badge bg-white text-primary rounded-pill" style={{ fontSize: 10 }}>{t.count}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Loading state */}
            {busyPanel && <div className="text-center py-3 text-muted" style={{ fontSize: 13 }}>A carregar dados...</div>}

            {/* ---- DOCUMENTOS TAB ---- */}
            {tab === 'mentoria' && (
              <div>
                {/* Doc type pills */}
                <div className="d-flex gap-2 mb-4">
                  {docTypes.map(type => (
                    <button key={type} onClick={() => setDocTab(type)} className={`btn btn-sm ${docTab === type ? 'btn-dark' : 'btn-outline-secondary'}`} style={{ borderRadius: 20, padding: '6px 20px' }}>
                      {getDocLabel(type, selectedMentorship.tipoKey)}
                    </button>
                  ))}
                </div>

                <div className="row g-4">
                  {/* Submission card */}
                  <div className="col-lg-7">
                    <div className="modern-card bg-white">
                      <div className="p-3 border-bottom d-flex align-items-center gap-2">
                        <FileText size={15} className="text-primary" />
                        <span className="fw-semibold" style={{ fontSize: 14 }}>{getDocLabel(docTab, selectedMentorship.tipoKey)} do Aluno</span>
                        {docsGrouped[docTab]?.submissions?.[0]?.teacherUnread && <span className="badge bg-danger ms-1" style={{ fontSize: 10 }}>Novo</span>}
                      </div>
                      {docsGrouped[docTab]?.submissions?.length ? (
                        <div className="p-4">
                          {(() => {
                            const doc = docsGrouped[docTab].submissions[0]
                            return (
                              <>
                                <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                                  <File size={16} className="text-danger" />
                                  <span className="fw-medium" style={{ fontSize: 14 }}>{truncate(doc.original?.filename, 50)}</span>
                                  <span className="badge bg-secondary" style={{ fontSize: 10 }}>v{doc.version || 1}</span>
                                </div>
                                <div className="text-muted mb-3" style={{ fontSize: 12 }}>{fmtDate(doc.createdAt)}</div>

                                {doc.studentNote && (
                                  <div className="p-3 rounded-3 mb-3" style={{ background: '#f8f9fa', fontSize: 13 }}>
                                    <span className="fw-semibold">Nota do aluno:</span> {doc.studentNote}
                                  </div>
                                )}
                                {doc.teacherNote && (
                                  <div className="p-3 rounded-3 mb-3" style={{ background: 'rgba(25,135,84,.06)', fontSize: 13, border: '1px solid rgba(25,135,84,.15)' }}>
                                    <span className="text-success fw-semibold">Feedback anterior:</span> {doc.teacherNote}
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="d-flex gap-2 flex-wrap mb-4">
                                  <button onClick={() => openPreview(doc)} className="btn btn-sm btn-primary d-flex align-items-center gap-1"><Eye size={13} /> Ver</button>
                                  <button onClick={() => setShowCorrection({ parentId: doc.id, type: doc.type, filename: doc.original?.filename })} className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"><Send size={13} /> Correção</button>
                                  <button onClick={() => setShowHistory(docTab)} className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"><History size={13} /> Histórico</button>
                                  {doc.original?.url && (
                                    <a href={doc.original.url} target="_blank" rel="noreferrer" onClick={() => trackDocDownload(doc.id)} className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"><Download size={13} /></a>
                                  )}
                                </div>

                                {/* Inline feedback */}
                                <div className="pt-3 border-top">
                                  <label className="form-label fw-medium mb-2" style={{ fontSize: 13 }}>Enviar feedback ao aluno</label>
                                  <div className="d-flex gap-2 align-items-end">
                                    <textarea className="form-control" rows={2} value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="Escreva o seu feedback..." style={{ fontSize: 13 }} />
                                    <button onClick={handleSendFeedback} className="btn btn-primary flex-shrink-0 d-flex align-items-center gap-1" disabled={!feedbackText.trim()}>
                                      <Send size={14} /> Enviar
                                    </button>
                                  </div>
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      ) : (
                        <div className="p-5 text-center text-muted">
                          <FileText size={40} className="mb-3" />
                          <p className="mb-0" style={{ fontSize: 14 }}>O aluno ainda não enviou o {getDocLabel(docTab, selectedMentorship.tipoKey).toLowerCase()}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resources card */}
                  <div className="col-lg-5">
                    <div className="modern-card bg-white">
                      <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2" style={{ fontSize: 14 }}>
                          <BookOpen size={15} className="text-primary" />
                          <span className="fw-semibold">Recursos de Apoio</span>
                          <span className="text-muted">({docsGrouped[docTab]?.resources?.length || 0})</span>
                        </div>
                        <button onClick={() => setShowResourceModal(true)} className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
                          <Plus size={13} /> Adicionar
                        </button>
                      </div>
                      <div className="p-3">
                        {docsGrouped[docTab]?.resources?.length ? (
                          docsGrouped[docTab].resources.map(doc => <ResourceCard key={doc.id} doc={doc} />)
                        ) : (
                          <div className="text-center py-4 text-muted" style={{ fontSize: 13 }}>Nenhum recurso disponível</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ---- PERGUNTAS TAB ---- */}
            {tab === 'questions' && (
              <div className="modern-card bg-white">
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 fw-semibold" style={{ fontSize: 14 }}>
                    <MessageSquare size={15} className="text-primary" />
                    Perguntas do Aluno
                  </div>
                  <span className="badge bg-primary rounded-pill">{questions.length}</span>
                </div>
                <div className="p-4">
                  {questions.length ? (
                    questions.map(q => <QuestionCard key={q.id} question={q} />)
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <MessageSquare size={44} className="mb-3" />
                      <p className="mb-0" style={{ fontSize: 15 }}>Nenhuma pergunta por responder</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- REUNIÕES TAB ---- */}
            {tab === 'meetings' && (
              <div className="modern-card bg-white">
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2 fw-semibold" style={{ fontSize: 14 }}>
                    <Calendar size={15} className="text-primary" />
                    Reuniões
                  </div>
                  <span className="badge bg-primary rounded-pill">{meetings.length}</span>
                </div>
                <div className="p-4">
                  {meetings.length ? (
                    meetings.map(m => <MeetingCard key={m.id} meeting={m} />)
                  ) : (
                    <div className="text-center py-5 text-muted">
                      <Calendar size={44} className="mb-3" />
                      <p className="mb-0" style={{ fontSize: 15 }}>Nenhuma reunião agendada</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ---- PROGRESSO TAB ---- */}
            {tab === 'progress' && (
              <div>
                <div className="modern-card bg-white mb-4">
                  <div className="p-4">
                    <label className="form-label fw-semibold mb-2" style={{ fontSize: 13 }}>
                      <TrendingUp size={14} className="me-1 text-primary" />
                      Nova nota de progresso
                    </label>
                    <div className="d-flex gap-2 align-items-end">
                      <textarea className="form-control" rows={3} value={progressNote} onChange={e => setProgressNote(e.target.value)} placeholder="Registe observações sobre o progresso do aluno..." />
                      <button onClick={handleAddProgressNote} className="btn btn-primary flex-shrink-0 d-flex align-items-center gap-1" disabled={!progressNote.trim()}>
                        <Plus size={15} /> Adicionar
                      </button>
                    </div>
                  </div>
                </div>
                <div className="modern-card bg-white">
                  <div className="p-3 border-bottom">
                    <span className="fw-semibold" style={{ fontSize: 14 }}>Histórico de Progresso</span>
                  </div>
                  <div className="p-3">
                    {progress.length ? (
                      progress.map(note => <ProgressNoteCard key={note.id} note={note} />)
                    ) : (
                      <div className="text-center py-5 text-muted">
                        <TrendingUp size={40} className="mb-3" />
                        <p className="mb-0" style={{ fontSize: 14 }}>Nenhuma nota de progresso registada</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- PREVIEW MODAL ---- */}
      {showPreview ? (
        <PreviewModal
          doc={showPreview}
          onClose={() => setShowPreview(null)}
          onDownload={async () => { if (showPreview?.id) await trackDocDownload(showPreview.id) }}
        />
      ) : null}

      {/* ---- NOTIFICATIONS SIDEBAR ---- */}
      {showNotifSidebar && (
        <div className="position-fixed top-0 end-0 bg-white border-start shadow-lg" style={{ width: '400px', height: '100vh', zIndex: 1050, overflowY: 'auto' }}>
          <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
            <span className="fw-semibold" style={{ fontSize: 16 }}>Notificações</span>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setShowNotifSidebar(false)}><XCircle size={16} /></button>
          </div>
          <div className="p-3">
            {activeNotifItems.length === 0 ? (
              <div className="text-center py-5 text-muted">
                <Bell size={44} className="mb-3" />
                <p className="mb-0" style={{ fontSize: 14 }}>Sem notificações novas</p>
              </div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {activeNotifItems.map((n, idx) => (
                  <div key={idx} className="modern-card border p-3">
                    <div className="d-flex align-items-start gap-3">
                      <div className={`rounded-3 d-flex align-items-center justify-content-center flex-shrink-0 ${n.type === 'document' ? 'bg-danger bg-opacity-10' : n.type === 'question' ? 'bg-primary bg-opacity-10' : 'bg-warning bg-opacity-10'}`} style={{ width: 36, height: 36 }}>
                        {n.type === 'document' ? <FileText size={15} className="text-danger" /> : n.type === 'question' ? <MessageSquare size={15} className="text-primary" /> : <Calendar size={15} className="text-warning" />}
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="d-flex align-items-start justify-content-between gap-2">
                          <span className="fw-semibold" style={{ fontSize: 13 }}>{n.title}</span>
                          <button className="btn btn-sm btn-outline-secondary flex-shrink-0" style={{ padding: '1px 6px' }} onClick={() => dismissNotif(n)} title="Marcar como vista">
                            <Check size={12} />
                          </button>
                        </div>
                        <p className="text-muted mb-1" style={{ fontSize: 12 }}>{n.message}</p>
                        <p className="text-muted mb-2" style={{ fontSize: 11 }}>{fmtDate(n.createdAt)}</p>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => {
                          dismissNotif(n)
                          setShowNotifSidebar(false)
                          if (n.type === 'document') setTab('mentoria')
                          if (n.type === 'question') setTab('questions')
                          if (n.type === 'meeting') setTab('meetings')
                        }}>Ver</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- CORRECTION MODAL ---- */}
      {showCorrection ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 18 }}>
              <div className="modal-header">
                <h5 className="modal-title">Enviar Correção</h5>
                <button type="button" className="btn-close" onClick={() => setShowCorrection(null)}></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3" style={{ fontSize: 13 }}>Documento: <strong>{showCorrection.filename}</strong></p>
                <div className="mb-3">
                  <label className="form-label">Ficheiro da correção</label>
                  <input ref={correctionFileRef} type="file" className="form-control" accept=".pdf,.doc,.docx" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Nota (opcional)</label>
                  <input type="text" className="form-control" value={correctionNote} onChange={e => setCorrectionNote(e.target.value)} placeholder="Ex: Corrigi as citações e a estrutura..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleUploadCorrection}><Upload size={16} className="me-2" />Enviar Correção</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCorrection(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- REPLY MODAL ---- */}
      {showReply ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 18 }}>
              <div className="modal-header">
                <h5 className="modal-title">Responder Pergunta</h5>
                <button type="button" className="btn-close" onClick={() => setShowReply(null)}></button>
              </div>
              <div className="modal-body">
                <div className="p-3 rounded-3 mb-3" style={{ background: '#f0f2f5' }}>
                  <p className="fw-medium mb-0">{showReply.pergunta}</p>
                </div>
                <div className="mb-3">
                  <label className="form-label">Sua resposta</label>
                  <textarea className="form-control" rows={4} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escreva a sua resposta..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleSendReply}><Send size={16} className="me-2" />Enviar Resposta</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowReply(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- MEETING MODAL ---- */}
      {showMeetingModal ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 18 }}>
              <div className="modal-header">
                <h5 className="modal-title">Criar Nova Reunião</h5>
                <button type="button" className="btn-close" onClick={() => setShowMeetingModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="form-check mb-3">
                  <input className="form-check-input" type="checkbox" checked={meetingForAll} onChange={e => setMeetingForAll(e.target.checked)} id="forAll" />
                  <label className="form-check-label" htmlFor="forAll">Criar para todos os alunos</label>
                </div>
                <div className="mb-3">
                  <label className="form-label">Data e Hora</label>
                  <input type="datetime-local" className="form-control" value={meetingDatetime} onChange={e => setMeetingDatetime(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Tópico</label>
                  <input type="text" className="form-control" value={meetingTopic} onChange={e => setMeetingTopic(e.target.value)} placeholder="Ex: Revisão do Capítulo 3" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Mensagem / Detalhes <span className="text-muted fw-normal">(opcional)</span></label>
                  <textarea className="form-control" rows={3} value={meetingDescription} onChange={e => setMeetingDescription(e.target.value)} placeholder="Ex: https://zoom.us/j/123... · Sala 204, Bloco A · Traga o capítulo 3 impresso..." style={{ resize: 'vertical' }} />
                  <div className="form-text">Link Zoom, localização, materiais necessários, etc.</div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleCreateMeeting}><Calendar size={16} className="me-2" />Criar Reunião</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeetingModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- RESOURCE MODAL ---- */}
      {showResourceModal ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content" style={{ borderRadius: 18 }}>
              <div className="modal-header">
                <h5 className="modal-title">Adicionar Recurso</h5>
                <button type="button" className="btn-close" onClick={() => setShowResourceModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Tipo de Documento</label>
                  <select className="form-select" value={resourceType} onChange={e => setResourceType(e.target.value)}>
                    {docTypes.map(type => (
                      <option key={type} value={type}>{getDocLabel(type, selectedMentorship?.tipoKey)}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Ficheiro</label>
                  <input ref={resourceFileRef} type="file" className="form-control" accept=".pdf,.doc,.docx,.ppt,.pptx" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Descrição (opcional)</label>
                  <input type="text" className="form-control" value={resourceNote} onChange={e => setResourceNote(e.target.value)} placeholder="Ex: Template para estrutura, exemplos, etc..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-primary" onClick={handleUploadResource}><UploadCloud size={16} className="me-2" />Enviar Recurso</button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowResourceModal(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- HISTORY MODAL ---- */}
      {showHistory ? (
        <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content" style={{ borderRadius: 18 }}>
              <div className="modal-header">
                <h5 className="modal-title">Histórico — {getDocLabel(showHistory, selectedMentorship?.tipoKey)}</h5>
                <button type="button" className="btn-close" onClick={() => setShowHistory(null)}></button>
              </div>
              <div className="modal-body">
                <div className="list-group">
                  {docsGrouped[showHistory]?.submissions?.map(doc => (
                    <button key={doc.id} type="button" className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3" onClick={() => openPreview(doc)}>
                      <div className="rounded-3 p-2 d-inline-flex align-items-center justify-content-center" style={{ background: 'rgba(220,53,69,.08)' }}>
                        <FileText size={20} className="text-danger" />
                      </div>
                      <div className="flex-grow-1 min-w-0">
                        <div className="fw-semibold text-truncate" title={doc.original?.filename}>{truncate(doc.original?.filename, 55)}</div>
                        <div className="d-flex align-items-center gap-2 text-muted mt-1" style={{ fontSize: 12 }}>
                          <span className="badge text-bg-secondary">v{doc.version || 1}</span>
                          <span>{fmtDate(doc.createdAt)}</span>
                          {doc.teacherUnread && <span className="badge text-bg-danger">Novo</span>}
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
          <div className="modal-content" style={{ borderRadius: 18 }}>
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
