// app/mentoring/admin/page.js
'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

export default function MentoringAdminPage() {
  const [teacherAuth, setTeacherAuth] = useState(false)

  // login
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')

  // data
  const [alunos, setAlunos] = useState([])
  const [selectedAluno, setSelectedAluno] = useState(null)
  const [documents, setDocuments] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  // perguntas
  const [perguntas, setPerguntas] = useState([])
  const [perguntaAberta, setPerguntaAberta] = useState(null)
  const [respostaTemp, setRespostaTemp] = useState('')

  // preview documento
  const [docAberto, setDocAberto] = useState(null)
  const [teacherNoteTemp, setTeacherNoteTemp] = useState('')

  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // init auth
  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = window.localStorage.getItem('mentoringTeacherAuth')
    if (flag === 'true') {
      setTeacherAuth(true)
      carregarTudo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function carregarTudo() {
    await Promise.all([carregarAlunos(), carregarDocuments()])
  }

  async function carregarAlunos() {
    try {
      const res = await axios.get('/api/mentoring/admin/alunos')
      setAlunos(res.data?.alunos || [])
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarDocuments() {
    try {
      const res = await axios.get('/api/mentoring/admin/documents')
      setDocuments(res.data?.documents || [])
      setUnreadCount(res.data?.unreadCount || 0)
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarPerguntas(alunoId) {
    try {
      const res = await axios.get(`/api/mentoring/questions?alunoId=${alunoId}`)
      setPerguntas(res.data?.perguntas || [])
    } catch (e) {
      console.error(e)
    }
  }

  // polling de notificações (docs) - mais frequente para capturar actualizações
  useEffect(() => {
    if (!teacherAuth) return
    const t = setInterval(() => {
      carregarDocuments()
    }, 5000) // 5 segundos em vez de 25
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherAuth])

  const unreadByAluno = useMemo(() => {
    const m = {}
    for (const d of documents) {
      if (!d?.alunoId) continue
      if (!d.teacherUnread) continue
      m[d.alunoId] = (m[d.alunoId] || 0) + 1
    }
    return m
  }, [documents])

  function docOf(alunoId, type) {
    return documents.find(d => d.alunoId === alunoId && d.type === type) || null
  }

  // --- login professor ---
  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      await axios.post('/api/mentoring/admin/login', { telefone, senha })
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentoringTeacherAuth', 'true')
      }
      setTeacherAuth(true)
      setInfo('Bem-vindo, Professor.')
      await carregarTudo()
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro no login do professor.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mentoringTeacherAuth')
    }
    setTeacherAuth(false)
    setSelectedAluno(null)
    setAlunos([])
    setDocuments([])
    setPerguntas([])
    setPerguntaAberta(null)
    setDocAberto(null)
    setErro('')
    setInfo('')
  }

  async function selecionarAluno(aluno) {
    setSelectedAluno(aluno)
    await Promise.all([
      carregarPerguntas(aluno.id),
      carregarDocuments() // refresh documents when selecting student
    ])
  }

  // --- Perguntas ---
  function abrirPergunta(p) {
    setPerguntaAberta(p)
    setRespostaTemp(p.resposta || '')
  }

  async function guardarResposta() {
    if (!perguntaAberta) return
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      await axios.patch(`/api/mentoring/questions/${perguntaAberta.id}`, {
        resposta: respostaTemp
      })
      setInfo('Resposta enviada.')
      setPerguntaAberta(null)
      setRespostaTemp('')
      if (selectedAluno?.id) await carregarPerguntas(selectedAluno.id)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao guardar resposta.')
    } finally {
      setLoading(false)
    }
  }

  // --- Documentos ---
  async function abrirDocumento(doc) {
    if (!doc) return
    setDocAberto(doc)
    setTeacherNoteTemp(doc.teacherNote || '')

    // marcar como aberto -> remove "novo"
    if (doc.teacherUnread) {
      try {
        await axios.patch(`/api/mentoring/admin/documents/${doc.id}/opened`)
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? { ...d, teacherUnread: false, teacherLastOpenedAt: new Date().toISOString() }
              : d
          )
        )
        setUnreadCount(c => (c > 0 ? c - 1 : 0))
      } catch (e) {
        console.error(e)
      }
    }
  }

  async function salvarNotaProfessor() {
    if (!docAberto?.id) return
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.patch(`/api/mentoring/admin/documents/${docAberto.id}/note`, {
        teacherNote: teacherNoteTemp
      })
      const newNote = res.data?.document?.teacherNote || teacherNoteTemp

      setDocuments(prev =>
        prev.map(d => (d.id === docAberto.id ? { ...d, teacherNote: newNote } : d))
      )
      setDocAberto(prev => (prev ? { ...prev, teacherNote: newNote } : prev))
      setInfo('Nota do professor guardada.')
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao guardar nota do professor.')
    } finally {
      setLoading(false)
    }
  }

  if (!teacherAuth) {
    return (
      <div className="container py-5" style={{ maxWidth: 820 }}>
        <h2 className="mb-2">Mentoria – Área do Professor</h2>
        <p className="text-muted">Entre com o telefone e palavra-passe.</p>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        <form onSubmit={handleLogin} className="card p-4">
          <div className="mb-3">
            <label className="form-label">Telefone</label>
            <input
              className="form-control"
              value={telefone}
              onChange={e => setTelefone(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Palavra-passe</label>
            <input
              className="form-control"
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? 'A entrar...' : 'Entrar'}
          </button>
        </form>
      </div>
    )
  }

  const selectedPrograma = selectedAluno?.id ? docOf(selectedAluno.id, 'programa') : null
  const selectedMonografia = selectedAluno?.id ? docOf(selectedAluno.id, 'monografia') : null

  return (
    <div className="container py-5" style={{ maxWidth: 1200 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1">Mentoria – Painel do Professor</h2>
          <div className="text-muted">
            <i className="bi bi-bell me-1" />
            Notificações de documentos: <strong>{unreadCount}</strong>
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={logout}>
          Sair
        </button>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card p-3">
            <div className="fw-semibold mb-2">Alunos</div>
            {alunos.length === 0 ? (
              <div className="text-muted">Sem alunos.</div>
            ) : (
              <div className="list-group">
                {alunos.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between ${
                      selectedAluno?.id === a.id ? 'active' : ''
                    }`}
                    onClick={() => selecionarAluno(a)}
                  >
                    <div>
                      <div className="fw-semibold">{a.nomeCompleto}</div>
                      <div className={`small ${selectedAluno?.id === a.id ? 'text-white' : 'text-muted'}`}>
                        {a.curso || ''}
                      </div>
                    </div>
                    {unreadByAluno[a.id] ? (
                      <span className="badge bg-danger">{unreadByAluno[a.id]} novo</span>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card p-3 mt-4">
            <div className="fw-semibold mb-2">Últimos "Novos" (documentos)</div>
            {documents.filter(d => d.teacherUnread).length === 0 ? (
              <div className="text-muted">Sem novidades.</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {documents
                  .filter(d => d.teacherUnread)
                  .slice(0, 8)
                  .map(d => (
                    <button
                      key={d.id}
                      type="button"
                      className="btn btn-outline-danger text-start"
                      onClick={() => {
                        if (d.aluno) setSelectedAluno(d.aluno)
                        abrirDocumento(d)
                      }}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <div>
                          <i className="bi bi-file-earmark-fill me-2" />
                          <strong>{d.aluno?.nomeCompleto || 'Aluno'}</strong>
                          <span className="ms-2 text-uppercase small">{d.type}</span>
                        </div>
                        <span className="badge bg-danger">novo</span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-8">
          {!selectedAluno ? (
            <div className="alert alert-info">Seleccione um aluno para ver documentos e perguntas.</div>
          ) : (
            <>
              <div className="card p-4 mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <div>
                    <h4 className="mb-0">{selectedAluno.nomeCompleto}</h4>
                    <div className="text-muted">{selectedAluno.curso || ''}</div>
                  </div>
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <DocumentoCard
                      titulo="Programa"
                      doc={selectedPrograma}
                      onOpen={() => abrirDocumento(selectedPrograma)}
                    />
                  </div>
                  <div className="col-md-6">
                    <DocumentoCard
                      titulo="Monografia"
                      doc={selectedMonografia}
                      onOpen={() => abrirDocumento(selectedMonografia)}
                    />
                  </div>
                </div>
              </div>

              <div className="card p-4">
                <h4 className="mb-3">Perguntas do Aluno</h4>
                {perguntas.length === 0 ? (
                  <div className="text-muted">Sem perguntas.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {perguntas.map(p => (
                      <div key={p.id} className="border rounded p-3">
                        <div className="fw-semibold">{p.pergunta}</div>
                        <div className="text-muted small">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                        </div>
                        <div className="mt-2">
                          <div className="small text-muted">Resposta</div>
                          <div>
                            {p.resposta ? p.resposta : <span className="text-muted">(sem resposta)</span>}
                          </div>
                        </div>
                        <button
                          className="btn btn-sm btn-primary mt-2"
                          type="button"
                          onClick={() => abrirPergunta(p)}
                        >
                          Responder
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Pergunta */}
      {perguntaAberta && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-lg" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Responder pergunta</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setPerguntaAberta(null)}
                />
              </div>
              <div className="modal-body">
                <div className="fw-semibold mb-2">{perguntaAberta.pergunta}</div>
                <textarea
                  className="form-control"
                  rows={6}
                  value={respostaTemp}
                  onChange={e => setRespostaTemp(e.target.value)}
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setPerguntaAberta(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={guardarResposta}
                  disabled={loading}
                >
                  {loading ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Documento */}
      {docAberto && (
        <div className="modal d-block" tabIndex={-1} role="dialog">
          <div className="modal-dialog modal-fullscreen" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {docAberto.type === 'programa' ? 'Programa' : 'Monografia'} –{' '}
                  {docAberto.aluno?.nomeCompleto || selectedAluno?.nomeCompleto}
                </h5>
                <button type="button" className="btn-close" onClick={() => setDocAberto(null)} />
              </div>

              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-lg-8">
                    {docAberto.original?.url ? (
                      // Check if it's a PDF - show directly
                      docAberto.original.contentType === 'application/pdf' ? (
                        <iframe
                          title="preview"
                          src={docAberto.original.url}
                          style={{ width: '100%', height: '80vh', border: '1px solid #ddd', borderRadius: 8 }}
                        />
                      ) : (
                        // For Word docs and other files, use Google Docs Viewer
                        <iframe
                          title="preview"
                          src={`https://docs.google.com/gview?url=${encodeURIComponent(docAberto.original.url)}&embedded=true`}
                          style={{ width: '100%', height: '80vh', border: '1px solid #ddd', borderRadius: 8 }}
                        />
                      )
                    ) : (
                      <div className="alert alert-warning">
                        Sem pré-visualização disponível.
                      </div>
                    )}

                    <div className="d-flex gap-2 mt-3">
                      {docAberto.original?.url && (
                        <a
                          className="btn btn-outline-primary"
                          href={docAberto.original.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Download original
                        </a>
                      )}
                      {docAberto.pdf?.url && (
                        <a
                          className="btn btn-outline-secondary"
                          href={docAberto.pdf.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Abrir PDF
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="col-lg-4">
                    <div className="border rounded p-3 mb-3">
                      <div className="small text-muted">Nota do aluno</div>
                      <div>
                        {docAberto.studentNote ? docAberto.studentNote : <span className="text-muted">(sem nota)</span>}
                      </div>
                    </div>

                    <div className="border rounded p-3">
                      <div className="small text-muted mb-2">Nota do professor</div>
                      <textarea
                        className="form-control"
                        rows={8}
                        value={teacherNoteTemp}
                        onChange={e => setTeacherNoteTemp(e.target.value)}
                        placeholder="Escreva feedback para o aluno..."
                      />
                      <button
                        className="btn btn-primary mt-2"
                        type="button"
                        onClick={salvarNotaProfessor}
                        disabled={loading}
                      >
                        {loading ? 'A guardar...' : 'Guardar nota'}
                      </button>
                      <div className="text-muted small mt-2">
                        Dica: deixe claro o que deve ser corrigido e a prioridade.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setDocAberto(null)}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* backdrop */}
      {(perguntaAberta || docAberto) && <div className="modal-backdrop show" />}
    </div>
  )
}

function DocumentoCard({ titulo, doc, onOpen }) {
  const isNovo = !!doc?.teacherUnread

  return (
    <div className="border rounded p-3 h-100">
      <div className="d-flex align-items-center justify-content-between">
        <div className="fw-semibold">{titulo}</div>
        {isNovo ? <span className="badge bg-danger">novo</span> : null}
      </div>

      {!doc ? (
        <div className="text-muted mt-2">Ainda não enviado.</div>
      ) : (
        <>
          <div className="d-flex align-items-center gap-2 mt-2">
            <i className={`bi ${isNovo ? 'bi-file-earmark-fill' : 'bi-file-earmark-text'}`} />
            <div>
              <div className="fw-semibold" style={{ fontSize: 14 }}>
                {doc.original?.filename || 'Documento'}
              </div>
              <div className="text-muted small">
                Actualizado: {doc.updatedAt ? new Date(doc.updatedAt).toLocaleString() : '-'}
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="small text-muted">Nota do aluno</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {doc.studentNote ? doc.studentNote : <span className="text-muted">(sem nota)</span>}
            </div>
          </div>

          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-sm btn-primary" type="button" onClick={onOpen}>
              Pré-visualizar
            </button>
            {doc.original?.url ? (
              <a
                className="btn btn-sm btn-outline-secondary"
                href={doc.original.url}
                target="_blank"
                rel="noreferrer"
              >
                Download
              </a>
            ) : null}
          </div>


        </>
      )}
    </div>
  )
}
