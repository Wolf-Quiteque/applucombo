// app/mentoring/page.js
'use client'

import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'

export default function MentoringPage() {
  // auth do aluno (simples: localStorage)
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login') // login|signup

  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [curso, setCurso] = useState('')

  // docs do aluno
  const [docs, setDocs] = useState({ programa: null, monografia: null })
  const [programaFile, setProgramaFile] = useState(null)
  const [programaNote, setProgramaNote] = useState('')
  const [monografiaFile, setMonografiaFile] = useState(null)
  const [monografiaNote, setMonografiaNote] = useState('')

  // perguntas ao professor (mantém)
  const [perguntas, setPerguntas] = useState([])
  const [novaPergunta, setNovaPergunta] = useState('')

  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // carregar user do localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem('mentoringUser')
    if (raw) {
      try {
        const u = JSON.parse(raw)
        if (u?.id) setUser(u)
      } catch {
        // ignore
      }
    }
  }, [])

  const programaDoc = useMemo(() => docs.programa, [docs])
  const monografiaDoc = useMemo(() => docs.monografia, [docs])

  async function carregarDocs(alunoId) {
    try {
      const res = await axios.get(`/api/mentoring/documents?alunoId=${alunoId}`)
      const list = res.data?.documents || []
      const next = { programa: null, monografia: null }
      for (const d of list) {
        if (d.type === 'programa') next.programa = d
        if (d.type === 'monografia') next.monografia = d
      }
      setDocs(next)

      // preenche notas (para editar)
      if (next.programa) setProgramaNote(next.programa.studentNote || '')
      if (next.monografia) setMonografiaNote(next.monografia.studentNote || '')
    } catch (e) {
      console.error(e)
    }
  }

  async function carregarPerguntas(alunoId) {
    try {
      // Prefer the new endpoint (/questions). Fallback to legacy (/perguntas) if needed.
      try {
        const res = await axios.get(`/api/mentoring/questions?alunoId=${alunoId}`)
        setPerguntas(res.data?.perguntas || [])
        return
      } catch {
        const res = await axios.get(`/api/mentoring/perguntas?alunoId=${alunoId}`)
        setPerguntas(res.data?.perguntas || [])
        return
      }
    } catch (e) {
      console.error(e)
    }
  }

  // quando user estiver logado, carregar docs + perguntas
  useEffect(() => {
    if (!user?.id) return
    carregarDocs(user.id)
    carregarPerguntas(user.id)

    // polling leve para atualizar respostas do professor
    const t = setInterval(() => {
      carregarDocs(user.id)
      carregarPerguntas(user.id)
    }, 30000)

    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // --- AUTH ---
  async function handleSignup(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.post('/api/mentoring/register', {
        nomeCompleto,
        telefone,
        senha,
        curso
      })

      const u = res.data?.user || res.data?.aluno
      if (!u?.id) throw new Error('Resposta inválida do servidor (sem id).')
      window.localStorage.setItem('mentoringUser', JSON.stringify(u))
      setUser(u)
      setInfo('Conta criada. Bem-vindo!')
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro no registo.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.post('/api/mentoring/login', {
        telefone,
        senha
      })

      const u = res.data?.user || res.data?.aluno
      if (!u?.id) throw new Error('Resposta inválida do servidor (sem id).')
      window.localStorage.setItem('mentoringUser', JSON.stringify(u))
      setUser(u)
      setInfo('Sessão iniciada com sucesso.')
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro no login.')
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mentoringUser')
    }
    setUser(null)
    setDocs({ programa: null, monografia: null })
    setPerguntas([])
    setNovaPergunta('')
    setProgramaFile(null)
    setProgramaNote('')
    setMonografiaFile(null)
    setMonografiaNote('')
    setInfo('')
    setErro('')
  }

  // --- DOC UPLOAD ---
  async function guardarDocumento(type) {
    if (!user?.id) return

    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const fd = new FormData()
      fd.append('alunoId', user.id)
      fd.append('type', type)

      if (type === 'programa') {
        fd.append('note', programaNote || '')
        if (programaFile) fd.append('file', programaFile)
      }

      if (type === 'monografia') {
        fd.append('note', monografiaNote || '')
        if (monografiaFile) fd.append('file', monografiaFile)
      }

      await axios.post('/api/mentoring/documents', fd)

      setInfo('Enviado com sucesso. O professor foi notificado.')

      // limpa file local
      if (type === 'programa') setProgramaFile(null)
      if (type === 'monografia') setMonografiaFile(null)

      await carregarDocs(user.id)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao enviar documento.')
    } finally {
      setLoading(false)
    }
  }

  // --- PERGUNTAS ---
  async function enviarPergunta() {
    if (!user?.id) return
    if (!novaPergunta.trim()) return

    setErro('')
    setInfo('')
    setLoading(true)

    try {
      // Prefer the new endpoint (/questions). Fallback to legacy (/perguntas) if needed.
      try {
        await axios.post('/api/mentoring/questions', {
          alunoId: user.id,
          pergunta: novaPergunta.trim()
        })
      } catch {
        await axios.post('/api/mentoring/perguntas', {
          alunoId: user.id,
          pergunta: novaPergunta.trim()
        })
      }

      setNovaPergunta('')
      setInfo('Pergunta enviada.')
      await carregarPerguntas(user.id)
    } catch (err) {
      setErro(err?.response?.data?.error || 'Erro ao enviar pergunta.')
    } finally {
      setLoading(false)
    }
  }

  // --- UI ---
  if (!user) {
    return (
      <div className="container py-5" style={{ maxWidth: 820 }}>
        <h2 className="mb-2">Mentoria – Área do Aluno</h2>
        <p className="text-muted">
          Aceda com o seu telefone e palavra-passe. Se ainda não tiver conta,
          crie uma em 1 minuto.
        </p>

        {erro && <div className="alert alert-danger">{erro}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        <div className="d-flex gap-2 mb-3">
          <button
            className={`btn ${authMode === 'login' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setAuthMode('login')}
            type="button"
          >
            Login
          </button>
          <button
            className={`btn ${authMode === 'signup' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setAuthMode('signup')}
            type="button"
          >
            Criar conta
          </button>
        </div>

        {authMode === 'login' ? (
          <form onSubmit={handleLogin} className="card p-4">
            <div className="mb-3">
              <label className="form-label">Telefone</label>
              <input
                className="form-control"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
                placeholder="Ex: 9xx xxx xxx"
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
        ) : (
          <form onSubmit={handleSignup} className="card p-4">
            <div className="mb-3">
              <label className="form-label">Nome completo</label>
              <input
                className="form-control"
                value={nomeCompleto}
                onChange={e => setNomeCompleto(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Telefone</label>
              <input
                className="form-control"
                value={telefone}
                onChange={e => setTelefone(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Curso</label>
              <input
                className="form-control"
                value={curso}
                onChange={e => setCurso(e.target.value)}
                placeholder="Ex: Economia"
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
              {loading ? 'A criar...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="container py-5" style={{ maxWidth: 1100 }}>
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h2 className="mb-1">Mentoria – Área do Aluno</h2>
          <div className="text-muted">
            Bem-vindo, <strong>{user.nomeCompleto}</strong>
          </div>
        </div>
        <button className="btn btn-outline-secondary" onClick={logout}>
          Sair
        </button>
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card p-4 mb-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h4 className="mb-0">Programa</h4>
              <span className="text-muted small">Word (.doc/.docx)</span>
            </div>

            {programaDoc ? (
              <div className="border rounded p-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-text" />
                  <div>
                    <div className="fw-semibold">{programaDoc.original?.filename || 'Documento'}</div>
                    <div className="text-muted small">
                      Última actualização:{' '}
                      {programaDoc.updatedAt
                        ? new Date(programaDoc.updatedAt).toLocaleString()
                        : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="small text-muted">Nota (aluno)</div>
                  <div>{programaDoc.studentNote || <span className="text-muted">(sem nota)</span>}</div>
                </div>

                <div className="mt-3">
                  <div className="small text-muted">Nota (professor)</div>
                  <div>{programaDoc.teacherNote || <span className="text-muted">(ainda sem feedback)</span>}</div>
                </div>

                {programaDoc.original?.url && (
                  <div className="mt-3">
                    <a className="btn btn-sm btn-outline-primary" href={programaDoc.original.url} target="_blank" rel="noreferrer">
                      Ver / descarregar documento
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-warning mb-3">
                Ainda não enviaste o teu <strong>Programa</strong>. Faz upload abaixo.
              </div>
            )}

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Upload do Programa</label>
                <input
                  className="form-control"
                  type="file"
                  accept=".doc,.docx"
                  onChange={e => setProgramaFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Nota (opcional)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={programaNote}
                  onChange={e => setProgramaNote(e.target.value)}
                  placeholder="Escreve aqui a tua nota para o professor (ex: o que mudou, dúvidas, observações...)"
                />
              </div>
              <div className="col-12">
                <button
                  className="btn btn-primary"
                  onClick={() => guardarDocumento('programa')}
                  disabled={loading}
                  type="button"
                >
                  {loading ? 'A enviar...' : 'Enviar / Actualizar Programa'}
                </button>
                <div className="text-muted small mt-2">
                  Sempre que actualizares o ficheiro ou a nota, o professor recebe notificação.
                </div>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h4 className="mb-0">Monografia</h4>
              <span className="text-muted small">Word (.doc/.docx) ou PDF</span>
            </div>

            {monografiaDoc ? (
              <div className="border rounded p-3 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <i className="bi bi-file-earmark-text" />
                  <div>
                    <div className="fw-semibold">{monografiaDoc.original?.filename || 'Documento'}</div>
                    <div className="text-muted small">
                      Última actualização:{' '}
                      {monografiaDoc.updatedAt
                        ? new Date(monografiaDoc.updatedAt).toLocaleString()
                        : '-'}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="small text-muted">Nota (aluno)</div>
                  <div>{monografiaDoc.studentNote || <span className="text-muted">(sem nota)</span>}</div>
                </div>

                <div className="mt-3">
                  <div className="small text-muted">Nota (professor)</div>
                  <div>{monografiaDoc.teacherNote || <span className="text-muted">(ainda sem feedback)</span>}</div>
                </div>

                {monografiaDoc.original?.url && (
                  <div className="mt-3">
                    <a className="btn btn-sm btn-outline-primary" href={monografiaDoc.original.url} target="_blank" rel="noreferrer">
                      Ver / descarregar documento
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="alert alert-warning mb-3">
                Ainda não enviaste a tua <strong>Monografia</strong>. Faz upload abaixo.
              </div>
            )}

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Upload da Monografia</label>
                <input
                  className="form-control"
                  type="file"
                  accept=".doc,.docx,.pdf"
                  onChange={e => setMonografiaFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="col-12">
                <label className="form-label">Nota (opcional)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={monografiaNote}
                  onChange={e => setMonografiaNote(e.target.value)}
                  placeholder="Escreve aqui a tua nota para o professor (ex: mudanças, pontos para rever...)"
                />
              </div>
              <div className="col-12">
                <button
                  className="btn btn-primary"
                  onClick={() => guardarDocumento('monografia')}
                  disabled={loading}
                  type="button"
                >
                  {loading ? 'A enviar...' : 'Enviar / Actualizar Monografia'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card p-4">
            <h4 className="mb-3">Perguntas ao Professor</h4>

            <div className="mb-3">
              <label className="form-label">Nova pergunta</label>
              <textarea
                className="form-control"
                rows={3}
                value={novaPergunta}
                onChange={e => setNovaPergunta(e.target.value)}
                placeholder="Escreve a tua pergunta..."
              />
              <button
                className="btn btn-success mt-2"
                onClick={enviarPergunta}
                disabled={loading}
                type="button"
              >
                Enviar
              </button>
            </div>

            <hr />

            {perguntas.length === 0 ? (
              <div className="text-muted">Ainda não tens perguntas.</div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {perguntas.map(p => (
                  <div key={p.id} className="border rounded p-3">
                    <div className="fw-semibold">{p.pergunta}</div>
                    <div className="text-muted small">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString() : ''}
                    </div>

                    <div className="mt-2">
                      <div className="small text-muted">Resposta do professor</div>
                      <div>
                        {p.resposta ? (
                          p.resposta
                        ) : (
                          <span className="text-muted">(ainda sem resposta)</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="alert alert-info mt-4">
            <div className="fw-semibold mb-1">Dica rápida</div>
            Ao actualizar o documento, escreve uma nota curta dizendo o que mudou (ex: “revisei capítulo 2”, “corrigi referências”, “tenho dúvidas na metodologia”).
          </div>
        </div>
      </div>
    </div>
  )
}