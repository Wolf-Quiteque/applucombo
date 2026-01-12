'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import {
  getMentoriaConfig,
  getDocTypesForMentoria,
  getDocLabel,
  MENTORIA_TYPES
} from '@/app/lib/mentoringConfig'

function fmtDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('pt-PT', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function initials(name) {
  const parts = (name || '').toString().trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'A'
  const a = parts[0]?.[0] || 'A'
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : ''
  return (a + b).toUpperCase()
}

function isDoneStatus(value) {
  const v = (value || '').toString().trim().toLowerCase()
  return [
    'done',
    'concluido',
    'concluído',
    'concluida',
    'concluída',
    'concluidas',
    'concluídas',
    'completed',
    'finalizada',
    'finalizado'
  ].includes(v)
}

function Avatar({ name, size = 44 }) {
  return (
    <div
      className="rounded-circle d-inline-flex align-items-center justify-content-center"
      style={{ width: size, height: size, background: 'rgba(41, 198, 210, 0.15)', border: '1px solid rgba(41, 198, 210, 0.35)', fontWeight: 700 }}
      title={name}
    >
      {initials(name)}
    </div>
  )
}

export default function MentoringAdminPage() {
  const [auth, setAuth] = useState(null)

  // login
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busyLogin, setBusyLogin] = useState(false)

  // dashboard
  const [mentorships, setMentorships] = useState([])
  const [selectedMentorshipId, setSelectedMentorshipId] = useState('')
  // pending | done | all  (compat: 'concluidas' -> done, 'todos' -> all)
  const [listMode, setListMode] = useState('pending')
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('docs') // docs | questions | meetings | progress
  const [loadingMentorships, setLoadingMentorships] = useState(false)

  // selected data
  const selectedMentorship = useMemo(
    () => mentorships.find(m => m.id === selectedMentorshipId) || null,
    [mentorships, selectedMentorshipId]
  )

  const docTypes = useMemo(() => {
    if (!selectedMentorship) return ['programa', 'monografia']
    return getDocTypesForMentoria(selectedMentorship.tipoKey)
  }, [selectedMentorship])

  // Dentro do aluno seleccionado, manter a UI limpa: o professor escolhe uma secção (Programa/Monografia/etc.)
  const [docTab, setDocTab] = useState('programa')

  // manter docTab alinhado com a mentoria seleccionada
  useEffect(() => {
    if (!selectedMentorship) return
    const first = (docTypes || [])[0] || 'programa'
    setDocTab(prev => (prev && docTypes.includes(prev) ? prev : first))
    setResourceUploadType(prev => (prev && docTypes.includes(prev) ? prev : first))
    setFeedbackType(prev => (prev && docTypes.includes(prev) ? prev : first))
    setResourcePickedName('')
  }, [selectedMentorshipId, docTypes, selectedMentorship])

  const [documents, setDocuments] = useState([])
  const [meetings, setMeetings] = useState([])
  const [questions, setQuestions] = useState([])
  const [progress, setProgress] = useState([])

  const [busyPanel, setBusyPanel] = useState(false)

  // modals
  const [previewDoc, setPreviewDoc] = useState(null)
  const [showNotif, setShowNotif] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [notifItems, setNotifItems] = useState([])
  const [showMeetingModal, setShowMeetingModal] = useState(false)
  const [meetingForAll, setMeetingForAll] = useState(false)
  const [meetingDatetime, setMeetingDatetime] = useState('')
  const [meetingTopic, setMeetingTopic] = useState('')
  const [meetingBusy, setMeetingBusy] = useState(false)

  const [replyTarget, setReplyTarget] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)

  const [correctionTarget, setCorrectionTarget] = useState(null)
  const [correctionNote, setCorrectionNote] = useState('')
  const [correctionBusy, setCorrectionBusy] = useState(false)
  const correctionFileRef = useRef(null)

  const [resourceUploadType, setResourceUploadType] = useState('programa')
  const [resourceNote, setResourceNote] = useState('')
  const [resourcePickedName, setResourcePickedName] = useState('')
  const [resourceBusy, setResourceBusy] = useState(false)
  const resourceFileRef = useRef(null)

  const [feedbackType, setFeedbackType] = useState('programa')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackBusy, setFeedbackBusy] = useState(false)

  const [progressNote, setProgressNote] = useState('')
  const [progressBusy, setProgressBusy] = useState(false)

  // restore auth
  useEffect(() => {
    try {
      const raw = localStorage.getItem('mentoring_teacher_auth')
      if (raw) setAuth(JSON.parse(raw))
    } catch {}
  }, [])

  // load mentorships
  useEffect(() => {
    if (!auth) return
    loadMentorships()
    loadNotifications()
    const t = setInterval(() => {
      loadNotifications()
      // leve refresh da lista
      loadMentorships(true)
    }, 25000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth])

  // load selected panel
  useEffect(() => {
    if (!auth || !selectedMentorshipId) return
    loadSelectedPanel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, selectedMentorshipId])

  // garantir que a secção seleccionada existe para a mentoria actual
  useEffect(() => {
    const first = docTypes[0] || 'programa'
    setDocTab(prev => (prev && docTypes.includes(prev) ? prev : first))
    setResourceUploadType(prev => (prev && docTypes.includes(prev) ? prev : first))
    setFeedbackType(prev => (prev && docTypes.includes(prev) ? prev : first))
    setResourcePickedName('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMentorshipId, docTypes.join('|')])

  async function loadMentorships(silent = false) {
    try {
      if (!silent) setLoadingMentorships(true)
      const res = await axios.get('/api/mentoring/admin/mentorships')
      const list = res?.data?.mentorships || []
      setMentorships(list)

      if (!silent) {
        // select default if none selected or selected not in list (only on full load)
        const needsSelect = !selectedMentorshipId || !list.some(m => m.id === selectedMentorshipId)
        if (needsSelect) {
          const pending = list
            .filter(m => (m.teacherQueueStatus || 'pending') === 'pending')
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
      // for silent refreshes, don't change selection
    } catch (e) {
      console.error(e)
    } finally {
      if (!silent) setLoadingMentorships(false)
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

      // defaults per mentoria
      setResourceUploadType(docTypes[0] || 'programa')
      setFeedbackType(docTypes[0] || 'programa')
    } catch (e) {
      console.error(e)
    } finally {
      setBusyPanel(false)
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
    try {
      localStorage.removeItem('mentoring_teacher_auth')
    } catch {}
    setAuth(null)
    setSelectedMentorshipId('')
    setMentorships([])
  }

  const filteredMentorships = useMemo(() => {
    const q = search.trim().toLowerCase()
    const lm = listMode
    let base = mentorships
    if (lm === 'pending') {
      base = base.filter(m => !isDoneStatus(m.teacherQueueStatus))
    }
    if (lm === 'done') {
      base = base.filter(m => isDoneStatus(m.teacherQueueStatus))
    }
    if (q) {
      base = base.filter(m => {
        const name = (m.aluno?.nomeCompleto || '').toLowerCase()
        const tel = (m.aluno?.telefone || '').toLowerCase()
        const title = (m.titulo || '').toLowerCase()
        return name.includes(q) || tel.includes(q) || title.includes(q)
      })
    }
    return base
  }, [mentorships, listMode, search])

  const novidades = useMemo(() => {
    return mentorships
      .filter(m => !isDoneStatus(m.teacherQueueStatus) && (m.pendingCounts?.total || 0) > 0)
      .sort((a, b) => {
        const da = a.teacherQueueUpdatedAt ? new Date(a.teacherQueueUpdatedAt).getTime() : 0
        const db = b.teacherQueueUpdatedAt ? new Date(b.teacherQueueUpdatedAt).getTime() : 0
        return db - da
      })
      .slice(0, 10)
  }, [mentorships])

  const pendentesAntigos = useMemo(() => {
    return mentorships
      .filter(m => !isDoneStatus(m.teacherQueueStatus))
      .sort((a, b) => {
        const da = a.teacherQueueUpdatedAt ? new Date(a.teacherQueueUpdatedAt).getTime() : 0
        const db = b.teacherQueueUpdatedAt ? new Date(b.teacherQueueUpdatedAt).getTime() : 0
        return da - db
      })
  }, [mentorships])

  const docsGrouped = useMemo(() => {
    const submissions = documents.filter(d => d.kind === 'submission')
    const corrections = documents.filter(d => d.kind === 'correction')
    const resources = documents.filter(d => d.kind === 'resource')

    const byType = {}
    docTypes.forEach(t => {
      byType[t] = {
        submissions: submissions.filter(s => s.type === t).sort((a, b) => (b.version || 0) - (a.version || 0)),
        resources: resources.filter(r => r.type === t).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }
    })

    const corrByParent = {}
    corrections.forEach(c => {
      const key = c.parentDocumentId
      if (!key) return
      if (!corrByParent[key]) corrByParent[key] = []
      corrByParent[key].push(c)
    })
    Object.keys(corrByParent).forEach(k => {
      corrByParent[k].sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()))
    })

    return { byType, corrByParent }
  }, [documents, docTypes])

  async function markMentorshipQueue(status) {
    if (!selectedMentorship) return
    try {
      await axios.patch(`/api/mentoring/mentorships/${selectedMentorship.id}`, { teacherQueueStatus: status })
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert('Não foi possível actualizar o estado.')
    }
  }

  async function markTeacherReadOnDoc(docId) {
    try {
      await axios.patch(`/api/mentoring/documents/${docId}/event`, { role: 'teacher', action: 'view' })
    } catch (e) {
      console.error(e)
    }
  }

  async function trackDocDownload(docId) {
    try {
      await axios.patch(`/api/mentoring/documents/${docId}/event`, { role: 'teacher', action: 'download' })
    } catch (e) {
      console.error(e)
    }
  }

  async function openPreview(doc) {
    setPreviewDoc(doc)
    if (doc?.id) {
      await markTeacherReadOnDoc(doc.id)
      // refresh docs so badges clear
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    }
  }

  async function handleResourceUpload() {
    if (!selectedMentorship) return
    const file = resourceFileRef.current?.files?.[0] || null
    if (!file) return alert('Escolha um ficheiro.')
    try {
      setResourceBusy(true)
      const form = new FormData()
      form.append('mentorshipId', selectedMentorship.id)
      form.append('alunoId', selectedMentorship.alunoId)
      form.append('type', resourceUploadType)
      form.append('kind', 'resource')
      form.append('note', resourceNote || '')
      form.append('file', file)
      await axios.post('/api/mentoring/documents', form)
      setResourceNote('')
      if (resourceFileRef.current) resourceFileRef.current.value = ''
      await loadSelectedPanel()
      await loadNotifications()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao enviar recurso.')
    } finally {
      setResourceBusy(false)
    }
  }

  async function handleSendFeedback() {
    if (!selectedMentorship) return
    if (!feedbackText.trim()) return alert('Escreva o feedback.')
    try {
      setFeedbackBusy(true)
      const form = new FormData()
      form.append('mentorshipId', selectedMentorship.id)
      form.append('alunoId', selectedMentorship.alunoId)
      form.append('type', feedbackType)
      form.append('kind', 'submission')
      form.append('uploadedByRole', 'teacher')
      form.append('note', feedbackText)
      await axios.post('/api/mentoring/documents', form)
      setFeedbackText('')
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao enviar feedback.')
    } finally {
      setFeedbackBusy(false)
    }
  }

  async function handleUploadCorrection() {
    if (!selectedMentorship || !correctionTarget) return
    const file = correctionFileRef.current?.files?.[0] || null
    if (!file) return alert('Escolha um ficheiro.')
    try {
      setCorrectionBusy(true)
      const form = new FormData()
      form.append('mentorshipId', selectedMentorship.id)
      form.append('alunoId', selectedMentorship.alunoId)
      form.append('type', correctionTarget.type)
      form.append('kind', 'correction')
      form.append('parentDocumentId', correctionTarget.parentId)
      form.append('note', correctionNote || '')
      form.append('file', file)
      await axios.post('/api/mentoring/documents', form)
      setCorrectionTarget(null)
      setCorrectionNote('')
      if (correctionFileRef.current) correctionFileRef.current.value = ''
      await loadSelectedPanel()
      await loadNotifications()
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao enviar correção.')
    } finally {
      setCorrectionBusy(false)
    }
  }

  async function handleReplyQuestion() {
    if (!replyTarget) return
    try {
      setReplyBusy(true)
      await axios.patch(`/api/mentoring/questions/${replyTarget.id}`, { resposta: replyText })
      setReplyTarget(null)
      setReplyText('')
      await loadSelectedPanel()
      await loadNotifications()
      await loadMentorships(true)
    } catch (e) {
      console.error(e)
      alert(e?.response?.data?.error || 'Erro ao responder.')
    } finally {
      setReplyBusy(false)
    }
  }

  async function markQuestionRead(q) {
    try {
      await axios.patch(`/api/mentoring/questions/${q.id}`, { action: 'markTeacherRead' })
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

  async function createMeeting() {
    try {
      setMeetingBusy(true)
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
    } finally {
      setMeetingBusy(false)
    }
  }

  async function addProgressNote() {
    if (!selectedMentorship) return
    if (!progressNote.trim()) return
    try {
      setProgressBusy(true)
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
    } finally {
      setProgressBusy(false)
    }
  }

  if (!auth) {
    return (
      <div className="container py-5" style={{ maxWidth: 520 }}>
        <div className="card shadow-sm" style={{ borderRadius: 16 }}>
          <div className="card-body p-4">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'rgba(41, 198, 210, 0.15)' }}>
                <i className="bi bi-mortarboard" style={{ fontSize: 22 }} />
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

  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1400 }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 44, height: 44, background: 'rgba(41, 198, 210, 0.15)' }}>
            <i className="bi bi-mortarboard" style={{ fontSize: 22 }} />
          </div>
          <div>
            <div className="h5 mb-0">Mentorias</div>
            <div className="text-muted small">Gestão de alunos, documentos, reuniões e progresso</div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-primary" type="button" onClick={() => setShowMeetingModal(true)}>
            <i className="bi bi-calendar-plus me-1" /> Criar reunião
          </button>
          <button className="btn btn-outline-secondary position-relative" type="button" onClick={() => setShowNotif(true)}>
            <i className="bi bi-bell" />
            {notifCount > 0 ? (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill text-bg-danger">
                {notifCount}
              </span>
            ) : null}
          </button>
          <button className="btn btn-outline-dark" type="button" onClick={logout}>
            <i className="bi bi-box-arrow-right me-1" /> Sair
          </button>
        </div>
      </div>

      <div className="row g-3">
        <div className="col-lg-4">
          <div className="card shadow-sm" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                <div className="fw-semibold">Alunos</div>
                {loadingMentorships ? <span className="text-muted small">a actualizar...</span> : null}
              </div>

              <div className="btn-group w-100 mb-2" role="group" aria-label="filtros">
                <button
                  className={`btn btn-sm ${listMode === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setListMode('pending')}
                >
                  Pendentes
                </button>
                <button
                  className={`btn btn-sm ${listMode === 'done' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setListMode('done')}
                >
                  Concluídas
                </button>
                <button
                  className={`btn btn-sm ${listMode === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setListMode('all')}
                >
                  Todos
                </button>
              </div>

              <input
                className="form-control form-control-sm mb-3"
                placeholder="Pesquisar por nome, telefone ou título..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />

              {listMode === 'pending' && search.trim() === '' ? (
                <div className="mb-3">
                  <div className="text-muted small mb-2">
                    <i className="bi bi-lightning-charge me-1" /> Novidades (mais recentes)
                  </div>
                  {novidades.length ? (
                    <div className="d-flex flex-column gap-2">
                      {novidades.map(m => (
                        <MentorshipListItem
                          key={m.id}
                          m={m}
                          active={m.id === selectedMentorshipId}
                          onClick={() => setSelectedMentorshipId(m.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted small">Sem novidades.</div>
                  )}
                </div>
              ) : null}

              {listMode === 'pending' && search.trim() === '' ? (
                <div className="text-muted small mb-2">
                  <i className="bi bi-hourglass-split me-1" /> Pendentes (do mais antigo ao mais recente)
                </div>
              ) : null}

              <div className="d-flex flex-column gap-2" style={{ maxHeight: 560, overflow: 'auto' }}>
                {(listMode === 'pending' && search.trim() === '' ? pendentesAntigos : filteredMentorships).map(m => (
                  <MentorshipListItem
                    key={m.id}
                    m={m}
                    active={m.id === selectedMentorshipId}
                    onClick={() => setSelectedMentorshipId(m.id)}
                  />
                ))}

                {(!filteredMentorships.length && !(listMode === 'pending' && search.trim() === '' && pendentesAntigos.length)) ? (
                  <div className="text-muted">Sem resultados.</div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {!selectedMentorship ? (
            <div className="alert alert-warning">Seleccione um aluno para começar.</div>
          ) : (
            <div className="card shadow-sm" style={{ borderRadius: 16 }}>
              <div className="card-body">
                <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
                  <div className="d-flex align-items-center gap-3">
                    <Avatar name={selectedMentorship.aluno?.nomeCompleto} size={54} />
                    <div>
                      <div className="h5 mb-1">{selectedMentorship.aluno?.nomeCompleto || 'Aluno'}</div>
                      <div className="text-muted small">
                        <i className="bi bi-phone me-1" /> {selectedMentorship.aluno?.telefone || '-'}
                        <span className="mx-2">·</span>
                        <i className="bi bi-journal-text me-1" /> {selectedMentorship.aluno?.curso || '-'}
                      </div>
                      <div className="text-muted small mt-1">
                        <span className="badge text-bg-light me-2">{getMentoriaConfig(selectedMentorship.tipoKey).label}</span>
                        <span className="text-muted">{selectedMentorship.titulo ? selectedMentorship.titulo : ''}</span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {!isDoneStatus(selectedMentorship.teacherQueueStatus) ? (
                      <button className="btn btn-success" type="button" onClick={() => markMentorshipQueue('done')}>
                        <i className="bi bi-check2-circle me-1" /> Concluída
                      </button>
                    ) : (
                      <button className="btn btn-outline-warning" type="button" onClick={() => markMentorshipQueue('pending')}>
                        <i className="bi bi-arrow-repeat me-1" /> Voltar para pendente
                      </button>
                    )}
                    <button className="btn btn-outline-secondary" type="button" onClick={loadSelectedPanel}>
                      <i className="bi bi-arrow-clockwise" />
                    </button>
                  </div>
                </div>

                <hr />

                <div className="d-flex flex-wrap gap-2 mb-3">
                  <button
                    className={`btn btn-sm ${activeTab === 'docs' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveTab('docs')}
                  >
                    <i className="bi bi-folder2-open me-1" /> Documentos
                  </button>
                  <button
                    className={`btn btn-sm ${activeTab === 'questions' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveTab('questions')}
                  >
                    <i className="bi bi-chat-dots me-1" /> Perguntas
                    {selectedMentorship.pendingCounts?.questions ? (
                      <span className="badge text-bg-danger ms-2">{selectedMentorship.pendingCounts.questions}</span>
                    ) : null}
                  </button>
                  <button
                    className={`btn btn-sm ${activeTab === 'meetings' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveTab('meetings')}
                  >
                    <i className="bi bi-calendar-event me-1" /> Reuniões
                    {selectedMentorship.pendingCounts?.meetings ? (
                      <span className="badge text-bg-danger ms-2">{selectedMentorship.pendingCounts.meetings}</span>
                    ) : null}
                  </button>
                  <button
                    className={`btn btn-sm ${activeTab === 'progress' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setActiveTab('progress')}
                  >
                    <i className="bi bi-graph-up-arrow me-1" /> Progresso
                  </button>
                </div>

                {busyPanel ? <div className="alert alert-info">A carregar dados…</div> : null}

                {activeTab === 'docs' ? (
                  <div>
                    {/* Escolher secção (Programa / Monografia / Tez / etc.) */}
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {docTypes.map(t => (
                        <button
                          key={t}
                          type="button"
                          className={`btn btn-sm ${docTab === t ? 'btn-primary' : 'btn-outline-primary'}`}
                          onClick={() => {
                            setDocTab(t)
                            setResourceUploadType(t)
                            setFeedbackType(t)
                            setResourceNote('')
                            setFeedbackText('')
                            setResourcePickedName('')
                            if (resourceFileRef.current) resourceFileRef.current.value = ''
                          }}
                        >
                          {getDocLabel(t, selectedMentorship.tipoKey)}
                        </button>
                      ))}
                    </div>

                    <div className="row g-3">
                      {/* 1) Documentos primeiro (conteúdo) */}
                      <div className="col-12">
                        <TeacherDocTypeBlock
                          key={docTab}
                          type={docTab}
                          tipoKey={selectedMentorship.tipoKey}
                          data={docsGrouped.byType[docTab]}
                          corrByParent={docsGrouped.corrByParent}
                          onPreview={openPreview}
                          onDownload={async doc => {
                            await trackDocDownload(doc.id)
                            await loadSelectedPanel()
                            await loadNotifications()
                          }}
                          onCorrection={submission => {
                            setCorrectionTarget({ parentId: submission.id, type: submission.type, filename: submission.original?.filename })
                            setCorrectionNote('')
                          }}
                        />
                      </div>

                      {/* 2) Operações no fundo (upload + feedback) */}
                      <div className="col-12">
                        <div className="card modern-card p-4">
                          <div className="fw-semibold mb-3">
                            <i className="bi bi-ui-checks-grid me-2" /> Operações — {getDocLabel(docTab, selectedMentorship.tipoKey)}
                          </div>

                          <div className="row g-3">
                            <div className="col-lg-6">
                              <div className="fw-semibold mb-2"><i className="bi bi-book me-2" /> Recurso de apoio</div>

                              <label className="file-drop d-block" style={{ cursor: 'pointer' }}>
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                  <div style={{ minWidth: 0 }}>
                                    <div className="fw-semibold"><i className="bi bi-cloud-arrow-up me-2" /> Escolher ficheiro</div>
                                    <div
                                      className="text-muted small truncate-1"
                                      style={{ maxWidth: 520 }}
                                      title={resourcePickedName || ''}
                                    >
                                      {resourcePickedName ? resourcePickedName : 'PDF ou Word (.pdf, .doc, .docx)'}
                                    </div>
                                  </div>
                                  <span className="btn btn-sm btn-outline-primary">Procurar</span>
                                </div>
                                <input
                                  ref={resourceFileRef}
                                  className="d-none"
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  onChange={e => setResourcePickedName(e?.target?.files?.[0]?.name || '')}
                                />
                              </label>

                              <div className="mt-2">
                                <label className="form-label small">Nota (opcional)</label>
                                <input
                                  className="form-control"
                                  value={resourceNote}
                                  onChange={e => setResourceNote(e.target.value)}
                                  placeholder="ex.: Template, exemplo de estrutura, checklist…"
                                />
                              </div>

                              <button className="btn btn-primary mt-2 rounded-4" disabled={resourceBusy} onClick={handleResourceUpload}>
                                {resourceBusy ? 'A enviar…' : 'Enviar recurso'}
                              </button>
                            </div>

                            <div className="col-lg-6">
                              <div className="fw-semibold mb-2"><i className="bi bi-chat-square-text me-2" /> Feedback (nota) para a última versão</div>
                              <label className="form-label small">Mensagem</label>
                              <input
                                className="form-control"
                                value={feedbackText}
                                onChange={e => setFeedbackText(e.target.value)}
                                placeholder="ex.: Ajustar bibliografia, corrigir formatação, alinhar estrutura…"
                              />
                              <button className="btn btn-primary mt-2 rounded-4" disabled={feedbackBusy} onClick={handleSendFeedback}>
                                {feedbackBusy ? 'A enviar…' : 'Enviar feedback'}
                              </button>
                              <div className="text-muted small mt-2">O aluno receberá notificação e verá como “Feedback do professor”.</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {activeTab === 'questions' ? (
                  <div>
                    {questions.length === 0 ? (
                      <div className="text-muted">Sem perguntas.</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {questions.map(q => (
                          <div key={q.id} className="border rounded p-3">
                            <div className="d-flex align-items-start justify-content-between gap-2">
                              <div className="d-flex gap-2">
                                <Avatar name={selectedMentorship.aluno?.nomeCompleto} size={36} />
                                <div>
                                  <div className="fw-semibold">
                                    {q.pergunta}
                                    {q.teacherUnread ? <span className="badge text-bg-danger ms-2">novo</span> : null}
                                  </div>
                                  {q.detalhe ? <div className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>{q.detalhe}</div> : null}
                                  <div className="text-muted small mt-1">{fmtDate(q.createdAt)}</div>
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => { setReplyTarget(q); setReplyText(q.resposta || '') }}>
                                  <i className="bi bi-reply me-1" /> Responder
                                </button>
                                {q.teacherUnread ? (
                                  <button className="btn btn-sm btn-outline-secondary" onClick={() => markQuestionRead(q)}>
                                    Marcar lida
                                  </button>
                                ) : null}
                              </div>
                            </div>

                            {q.resposta ? (
                              <div className="mt-3 border rounded p-2" style={{ background: '#fafafa' }}>
                                <div className="d-flex align-items-center gap-2 mb-1">
                                  <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: 28, height: 28, background: 'rgba(1,2,46,.08)' }}>
                                    <i className="bi bi-person-check" />
                                  </div>
                                  <div className="fw-semibold" style={{ fontSize: 14 }}>Resposta</div>
                                  <div className="text-muted small">{q.respondidaEm ? fmtDate(q.respondidaEm) : ''}</div>
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>{q.resposta}</div>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'meetings' ? (
                  <div>
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <div className="fw-semibold">Reuniões</div>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => setShowMeetingModal(true)}>
                        <i className="bi bi-calendar-plus me-1" /> Criar
                      </button>
                    </div>

                    {meetings.length === 0 ? (
                      <div className="text-muted">Sem reuniões.</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {meetings.map(m => (
                          <div key={m.id} className="border rounded p-3">
                            <div className="d-flex align-items-start justify-content-between gap-2">
                              <div>
                                <div className="fw-semibold">
                                  <i className="bi bi-calendar-event me-2" /> {m.topic || 'Reunião'}
                                  {m.teacherUnread ? <span className="badge text-bg-danger ms-2">novo</span> : null}
                                </div>
                                <div className="text-muted small">
                                  <span className="me-2">{m.datetime ? fmtDate(m.datetime) : 'Data por definir'}</span>
                                  <span className={`badge ${m.status === 'accepted' ? 'text-bg-success' : m.status === 'rejected' ? 'text-bg-danger' : m.status === 'cancelled' ? 'text-bg-secondary' : 'text-bg-warning'}`}>
                                    {m.status}
                                  </span>
                                  <span className="ms-2 text-muted">· solicitado por {m.requestedBy === 'teacher' ? 'professor' : 'aluno'}</span>
                                </div>
                              </div>
                              <div className="d-flex gap-2">
                                {m.status === 'pending' ? (
                                  <>
                                    <button className="btn btn-sm btn-success" onClick={() => updateMeeting(m.id, 'accept')}>Aceitar</button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => updateMeeting(m.id, 'reject')}>Rejeitar</button>
                                  </>
                                ) : null}
                                {m.teacherUnread ? (
                                  <button className="btn btn-sm btn-outline-secondary" onClick={() => updateMeeting(m.id, 'markTeacherRead')}>
                                    Marcar lida
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}

                {activeTab === 'progress' ? (
                  <div>
                    <div className="border rounded p-3 mb-3">
                      <div className="fw-semibold mb-2"><i className="bi bi-pencil-square me-2" /> Nova nota de progresso</div>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={progressNote}
                        onChange={e => setProgressNote(e.target.value)}
                        placeholder="ex.: 2026 Março 23 — Aluno está a avançar bem, dedicado..."
                      />
                      <button className="btn btn-primary mt-2" disabled={progressBusy} onClick={addProgressNote}>
                        {progressBusy ? 'A guardar...' : 'Guardar'}
                      </button>
                    </div>

                    {progress.length === 0 ? (
                      <div className="text-muted">Ainda não há notas de progresso.</div>
                    ) : (
                      <div className="d-flex flex-column gap-2">
                        {progress.map(p => (
                          <div key={p.id} className="border rounded p-3">
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="fw-semibold">Nota</div>
                              <div className="text-muted small">{fmtDate(p.createdAt)}</div>
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{p.note}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {previewDoc ? (
        <PreviewModal
          doc={previewDoc}
          role="teacher"
          onClose={() => setPreviewDoc(null)}
          onDownload={async () => {
            if (previewDoc?.id) {
              await trackDocDownload(previewDoc.id)
              await loadSelectedPanel()
              await loadNotifications()
            }
          }}
        />
      ) : null}

      {showNotif ? (
        <NotificationsModal
          items={notifItems}
          onClose={() => setShowNotif(false)}
          onGo={(type) => {
            setShowNotif(false)
            if (type === 'document') setActiveTab('docs')
            if (type === 'question') setActiveTab('questions')
            if (type === 'meeting') setActiveTab('meetings')
          }}
        />
      ) : null}

      {showMeetingModal ? (
        <MeetingModal
          forAll={meetingForAll}
          datetime={meetingDatetime}
          topic={meetingTopic}
          busy={meetingBusy}
          onChangeForAll={setMeetingForAll}
          onChangeDatetime={setMeetingDatetime}
          onChangeTopic={setMeetingTopic}
          onClose={() => setShowMeetingModal(false)}
          onCreate={createMeeting}
        />
      ) : null}

      {replyTarget ? (
        <ReplyModal
          question={replyTarget}
          text={replyText}
          busy={replyBusy}
          onClose={() => setReplyTarget(null)}
          onChange={setReplyText}
          onSend={handleReplyQuestion}
        />
      ) : null}

      {correctionTarget ? (
        <CorrectionModal
          target={correctionTarget}
          note={correctionNote}
          busy={correctionBusy}
          fileRef={correctionFileRef}
          onClose={() => setCorrectionTarget(null)}
          onChangeNote={setCorrectionNote}
          onSend={handleUploadCorrection}
        />
      ) : null}
    </div>
  )
}

function MentorshipListItem({ m, active, onClick }) {
  const cfg = getMentoriaConfig(m.tipoKey)
  const total = m.pendingCounts?.total || 0
  const isPending = !isDoneStatus(m.teacherQueueStatus)

  return (
    <button
      type="button"
      onClick={onClick}
      className={`btn text-start ${active ? 'btn-primary' : 'btn-light'}`}
      style={{ borderRadius: 12 }}
    >
      <div className="d-flex align-items-center justify-content-between gap-2">
        <div>
          <div className="fw-semibold" style={{ fontSize: 14 }}>
            {m.aluno?.nomeCompleto || 'Aluno'}
            {total > 0 ? <span className="badge text-bg-danger ms-2">{total}</span> : null}
          </div>
          <div className="text-muted small">
            {cfg.label} · {m.aluno?.telefone || '-'}
          </div>
          {m.titulo ? <div className="text-muted small" style={{ maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.titulo}</div> : null}
        </div>
        <div className="text-end">
          <div className={`badge ${isPending ? 'text-bg-warning' : 'text-bg-success'}`}>{isPending ? 'pendente' : 'concluída'}</div>
          <div className="text-muted small mt-1">{m.teacherQueueUpdatedAt ? fmtDate(m.teacherQueueUpdatedAt) : ''}</div>
        </div>
      </div>
    </button>
  )
}

function TeacherDocTypeBlock({ type, tipoKey, data, corrByParent, onPreview, onDownload, onCorrection }) {
  const label = getDocLabel(type, tipoKey)
  const submissions = data?.submissions || []
  const resources = data?.resources || []
  const latest = submissions[0] || null
  const pastSubmissions = submissions.slice(1)
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="border rounded p-3">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div className="fw-semibold"><i className="bi bi-folder me-2" /> {label}</div>
        <div className="text-muted small">Submissões: {submissions.length} · Recursos: {resources.length}</div>
      </div>

      {resources.length ? (
        <div className="mb-3">
          <div className="text-muted small mb-2"><i className="bi bi-book me-1" /> Recursos de apoio</div>
          <div className="d-flex flex-column gap-2">
            {resources.slice(0, 6).map(r => (
              <DocRow key={r.id} doc={r} kindLabel="Recurso" onPreview={onPreview} onDownload={onDownload} showStudentSeen />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-muted small mb-3">Sem recursos enviados para esta secção.</div>
      )}

      <div className="fw-semibold mb-2"><i className="bi bi-clock-history me-2" /> Última versão</div>
      {!latest ? (
        <div className="text-muted">O aluno ainda não enviou ficheiro nesta secção.</div>
      ) : (
        <SubmissionTeacherCard
          doc={latest}
          corrections={corrByParent[latest.id] || []}
          onPreview={onPreview}
          onDownload={onDownload}
          onCorrection={() => onCorrection(latest)}
        />
      )}

      <div className="d-flex align-items-center justify-content-between mt-3 mb-2 gap-2">
        <div className="fw-semibold"><i className="bi bi-layers me-2" /> Histórico</div>
        {pastSubmissions.length ? (
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => setShowHistory(v => !v)}>
            <i className="bi bi-clock-history me-1" /> {showHistory ? 'Esconder' : `Ver histórico (${pastSubmissions.length})`}
          </button>
        ) : null}
      </div>
      {!pastSubmissions.length ? (
        <div className="text-muted">Sem histórico.</div>
      ) : showHistory ? (
        <div className="d-flex flex-column gap-2">
          {pastSubmissions.map(s => (
            <div key={s.id}>
              <DocRow
                doc={s}
                kindLabel={`v${s.version || 1}`}
                onPreview={onPreview}
                onDownload={onDownload}
                right={
                  <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onCorrection(s)}>
                    <i className="bi bi-pencil-square me-1" /> Correção
                  </button>
                }
              />
              {(corrByParent[s.id] || []).length ? (
                <div className="ms-4 mt-2 d-flex flex-column gap-2">
                  {(corrByParent[s.id] || []).slice(0, 5).map(c => (
                    <DocRow key={c.id} doc={c} kindLabel={`correção v${c.version || 1}`} onPreview={onPreview} onDownload={onDownload} showStudentSeen />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function DocRow({ doc, kindLabel, onPreview, onDownload, right, showStudentSeen }) {
  return (
    <div className="p-3 bg-white rounded-4 soft-border d-flex align-items-center justify-content-between gap-2">
      <div style={{ minWidth: 0 }}>
        <div className="fw-semibold" style={{ fontSize: 14, minWidth: 0 }}>
          <span className="badge text-bg-light me-2">{kindLabel}</span>
          <i className="bi bi-file-earmark me-2" />
          <span className="truncate-1" style={{ maxWidth: 520 }} title={doc.original?.filename || ''}>
            {doc.original?.filename || 'Documento'}
          </span>
          {doc.teacherUnread ? <span className="badge text-bg-danger ms-2">novo</span> : null}
        </div>
        <div className="text-muted small">
          {fmtDate(doc.createdAt || doc.updatedAt)}
          {showStudentSeen ? (
            <>
              <span className="mx-2">·</span>
              <i className="bi bi-eye me-1" /> visto pelo aluno: <strong>{doc.studentViewedAt ? fmtDate(doc.studentViewedAt) : '-'}</strong>
              <span className="mx-2">·</span>
              <i className="bi bi-download me-1" /> baixado: <strong>{doc.studentDownloadedAt ? fmtDate(doc.studentDownloadedAt) : '-'}</strong>
            </>
          ) : null}
        </div>
      </div>
      <div className="d-flex align-items-center gap-2">
        <button className="btn btn-sm btn-outline-primary" type="button" onClick={() => onPreview(doc)}>
          Ver
        </button>
        {doc.original?.url ? (
          <a
            className="btn btn-sm btn-outline-secondary"
            href={doc.original.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => onDownload(doc)}
          >
            Baixar
          </a>
        ) : null}
        {right ? right : null}
      </div>
    </div>
  )
}

function SubmissionTeacherCard({ doc, corrections, onPreview, onDownload, onCorrection }) {
  return (
    <div className="border rounded p-3">
      <div className="d-flex align-items-start justify-content-between gap-2">
        <div>
          <div className="fw-semibold">
            <i className="bi bi-file-earmark me-2" /> {doc.original?.filename || 'Documento'}
          </div>
          <div className="text-muted small">
            Versão: <strong>{doc.version || 1}</strong> · Enviado: <strong>{fmtDate(doc.createdAt)}</strong>
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
          <button className="btn btn-sm btn-primary" type="button" onClick={onCorrection}>
            <i className="bi bi-pencil-square me-1" /> Enviar correção
          </button>
        </div>
      </div>

      <div className="row g-2 mt-2">
        <div className="col-md-6">
          <div className="small text-muted">Nota do aluno</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{doc.studentNote ? doc.studentNote : <span className="text-muted">(sem nota)</span>}</div>
        </div>
        <div className="col-md-6">
          <div className="small text-muted">Feedback do professor</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{doc.teacherNote ? doc.teacherNote : <span className="text-muted">(sem feedback)</span>}</div>
        </div>
      </div>

      <div className="text-muted small mt-2">
        <i className="bi bi-eye me-1" /> visto pelo aluno: <strong>{doc.studentViewedAt ? fmtDate(doc.studentViewedAt) : '-'}</strong> ·{' '}
        <i className="bi bi-download me-1" /> baixado: <strong>{doc.studentDownloadedAt ? fmtDate(doc.studentDownloadedAt) : '-'}</strong>
      </div>

      {corrections?.length ? (
        <div className="mt-3">
          <div className="fw-semibold mb-2"><i className="bi bi-file-earmark-check me-2" /> Correções</div>
          <div className="d-flex flex-column gap-2">
            {corrections.slice(0, 5).map(c => (
              <DocRow key={c.id} doc={c} kindLabel={`correção v${c.version || 1}`} onPreview={onPreview} onDownload={onDownload} showStudentSeen />
            ))}
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

  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-fullscreen" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title"><i className="bi bi-file-earmark-text me-2" /> {doc?.original?.filename || 'Documento'}</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            {!url ? (
              <div className="alert alert-warning">Sem pré-visualização disponível.</div>
            ) : (
              <iframe title="preview" src={src} style={{ width: '100%', height: '85vh', border: '1px solid #ddd', borderRadius: 10 }} />
            )}
            {url && canGview ? <div className="text-muted small mt-2">Nota: para alguns ficheiros Word, o preview usa Google Viewer.</div> : null}
          </div>
          <div className="modal-footer">
            {url ? (
              <a className="btn btn-primary" href={url} target="_blank" rel="noreferrer" onClick={onDownload}>
                <i className="bi bi-download me-1" /> Baixar
              </a>
            ) : null}
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
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
                  <button key={idx} type="button" className="btn btn-light text-start" onClick={() => onGo(n.type)}>
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
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MeetingModal({ forAll, datetime, topic, busy, onChangeForAll, onChangeDatetime, onChangeTopic, onClose, onCreate }) {
  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Criar reunião</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="form-check mb-3">
              <input className="form-check-input" type="checkbox" checked={forAll} onChange={e => onChangeForAll(e.target.checked)} id="forAll" />
              <label className="form-check-label" htmlFor="forAll">Criar para todos os alunos</label>
            </div>
            <div className="mb-3">
              <label className="form-label">Data e hora</label>
              <input className="form-control" type="datetime-local" value={datetime} onChange={e => onChangeDatetime(e.target.value)} />
            </div>
            <div className="mb-3">
              <label className="form-label">Tópico</label>
              <input className="form-control" value={topic} onChange={e => onChangeTopic(e.target.value)} placeholder="ex.: Revisão de capítulos" />
            </div>
            <div className="text-muted small">O aluno terá de aceitar a reunião.</div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onCreate}>
              {busy ? 'A criar...' : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReplyModal({ question, text, busy, onClose, onChange, onSend }) {
  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Responder</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="fw-semibold mb-2">{question?.pergunta}</div>
            <textarea className="form-control" rows={5} value={text} onChange={e => onChange(e.target.value)} placeholder="Escreva a resposta..." />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onSend}>
              {busy ? 'A enviar...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CorrectionModal({ target, note, busy, fileRef, onClose, onChangeNote, onSend }) {
  return (
    <div className="modal d-block" tabIndex={-1} role="dialog">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Enviar correção</h5>
            <button type="button" className="btn-close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="text-muted small mb-2">Documento base: <strong>{target?.filename || 'submissão'}</strong></div>
            <div className="mb-3">
              <label className="form-label">Ficheiro da correção</label>
              <input ref={fileRef} className="form-control" type="file" accept=".pdf,.doc,.docx" />
            </div>
            <div className="mb-3">
              <label className="form-label">Nota (opcional)</label>
              <input className="form-control" value={note} onChange={e => onChangeNote(e.target.value)} placeholder="ex.: Corrigi as citações e estrutura" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={onSend}>
              {busy ? 'A enviar...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
