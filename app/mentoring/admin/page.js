// app/mentoring/admin/page.js
'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from '../../page.module.css' // reaproveitar estilos

export default function MentoringAdminPage() {
  const [teacherAuth, setTeacherAuth] = useState(false)

  // login do professor
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')

  const [alunos, setAlunos] = useState([])
  const [selectedAluno, setSelectedAluno] = useState(null)
  const [programas, setProgramas] = useState([])

  const [comentarioAberto, setComentarioAberto] = useState(null)
  const [comentarioTemp, setComentarioTemp] = useState('')

  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  // carregar flag de auth do professor
  useEffect(() => {
    if (typeof window === 'undefined') return
    const flag = window.localStorage.getItem('mentoringTeacherAuth')
    if (flag === 'true') {
      setTeacherAuth(true)
      carregarAlunos()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleTeacherLogin(e) {
    e.preventDefault()
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.post('/api/mentoring/admin/login', {
        telefone,
        senha
      })

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentoringTeacherAuth', 'true')
      }
      setTeacherAuth(true)
      setInfo('Sessão de professor iniciada com sucesso.')
      setSenha('')
      carregarAlunos()
    } catch (err) {
      setErro(
        err.response?.data?.error ||
          'Erro ao iniciar sessão como professor.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleTeacherLogout() {
    setTeacherAuth(false)
    setAlunos([])
    setSelectedAluno(null)
    setProgramas([])
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mentoringTeacherAuth')
    }
  }

  async function carregarAlunos() {
    try {
      const res = await axios.get('/api/mentoring/admin/alunos')
      setAlunos(res.data.alunos || [])
    } catch (err) {
      console.error(err)
      setErro('Não foi possível carregar a lista de alunos.')
    }
  }

  async function seleccionarAluno(aluno) {
    setSelectedAluno(aluno)
    setProgramas([])
    setErro('')
    setInfo('')

    try {
      const res = await axios.get('/api/mentoring/programas', {
        params: { alunoId: aluno.id }
      })
      setProgramas(res.data.programas || [])
    } catch (err) {
      console.error(err)
      setErro('Não foi possível carregar o programa deste aluno.')
    }
  }

  function abrirComentario(programa) {
    setComentarioAberto(programa)
    setComentarioTemp(programa.comentarioProfessor || '')
  }

  async function guardarComentario() {
    if (!comentarioAberto) return
    try {
      const res = await axios.put(
        `/api/mentoring/programas/${comentarioAberto.id}`,
        { comentarioProfessor: comentarioTemp }
      )
      const updated = res.data.programa
      setProgramas(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      )
      setComentarioAberto(null)
      setComentarioTemp('')
      setInfo('Comentário do professor actualizado.')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível guardar o comentário.')
    }
  }

  const total = programas.length
  const concluidas = programas.filter(p => p.concluido).length
  const progresso =
    total === 0 ? 0 : Math.round((concluidas / total) * 100)

  return (
    <div className="container py-5">
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className={styles.pageTitle || 'h2 fw-bold'}>
            Painel do Professor – Mentoria
          </h1>
          <p className="text-muted">
            Consulte o progresso de cada aluno, veja o programa e deixe os seus
            comentários e orientações.
          </p>
        </div>
      </div>

      {(erro || info) && (
        <div className="row mb-3">
          <div className="col-12">
            {erro && <div className="alert alert-danger">{erro}</div>}
            {info && <div className="alert alert-success">{info}</div>}
          </div>
        </div>
      )}

      {!teacherAuth ? (
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3 text-center">
                  Login do Professor
                </h5>
                <form onSubmit={handleTeacherLogin}>
                  <div className="mb-3">
                    <label className="form-label">Telefone</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={telefone}
                      onChange={e => setTelefone(e.target.value)}
                      placeholder="Ex: 923 000 000"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Palavra-passe</label>
                    <input
                      type="password"
                      className="form-control"
                      value={senha}
                      onChange={e => setSenha(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading}
                  >
                    {loading ? 'A entrar...' : 'Entrar como professor'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {/* COLUNA ESQUERDA: lista de alunos */}
          <div className="col-lg-4 mb-4">
            <div
              className={`${styles.selectionArea || ''} bg-white border rounded`}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0">Alunos</h5>
                <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={handleTeacherLogout}
                >
                  Terminar sessão
                </button>
              </div>
              {alunos.length === 0 ? (
                <p className="text-muted">
                  Ainda não há alunos registados ou não foi possível carregar a
                  lista.
                </p>
              ) : (
                <div className="list-group">
                  {alunos.map(a => (
                    <button
                      key={a.id}
                      type="button"
                      className={
                        'list-group-item list-group-item-action text-start ' +
                        (selectedAluno?.id === a.id ? 'active' : '')
                      }
                      onClick={() => seleccionarAluno(a)}
                    >
                      <div className="fw-semibold">{a.nomeCompleto}</div>
                      <small>
                        {a.curso} · Tel: {a.telefone}
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COLUNA DIREITA: programa do aluno seleccionado */}
          <div className="col-lg-8">
            <div className={styles.materialsArea || 'border rounded p-3'}>
              {selectedAluno ? (
                <>
                  <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3">
                    <div>
                      <h4 className="mb-1">
                        Programa – {selectedAluno.nomeCompleto}
                      </h4>
                      <p className="text-muted mb-0">
                        Curso: {selectedAluno.curso} · Tel:{' '}
                        {selectedAluno.telefone}
                      </p>
                    </div>
                    <div className="mt-3 mt-md-0">
                      <label className="form-label fw-semibold mb-1">
                        Progresso do aluno: {progresso}%
                      </label>
                      <div className="progress" style={{ minWidth: '200px' }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${progresso}%` }}
                          aria-valuenow={progresso}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        >
                          {progresso}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {programas.length === 0 ? (
                    <p className="text-muted">
                      Este aluno ainda não criou itens no programa de mentoria.
                    </p>
                  ) : (
                    <div className="list-group">
                      {programas.map(p => (
                        <div
                          key={p.id}
                          className="list-group-item d-flex flex-column flex-md-row justify-content-between align-items-start"
                        >
                          <div className="me-md-3">
                            <div className="d-flex align-items-center mb-1">
                              <h6 className="mb-0">
                                {p.tema}{' '}
                                {p.concluido && (
                                  <span className="badge bg-success ms-2">
                                    Concluído
                                  </span>
                                )}

                                {/* Prazo hoje / atrasado */}
                                {!p.concluido &&
                                  p.deadline &&
                                  (() => {
                                    const hoje = new Date()
                                    hoje.setHours(0, 0, 0, 0)
                                    const d = new Date(p.deadline)
                                    if (!isNaN(d)) {
                                      d.setHours(0, 0, 0, 0)
                                      if (d.getTime() === hoje.getTime()) {
                                        return (
                                          <span className="badge bg-warning text-dark ms-2">
                                            Prazo hoje
                                          </span>
                                        )
                                      }
                                      if (d < hoje) {
                                        return (
                                          <span className="badge bg-danger ms-2">
                                            Atrasado
                                          </span>
                                        )
                                      }
                                    }
                                    return null
                                  })()}
                              </h6>
                            </div>
                            <small className="text-muted">
                              Deadline: {p.deadline || 'Sem data definida'}
                            </small>
                            <p className="mb-1 mt-2">{p.descricao}</p>
                            {p.notas && (
                              <p className="mb-1">
                                <strong>Notas do aluno:</strong> {p.notas}
                              </p>
                            )}
                            {p.comentarioProfessor && (
                              <p className="mb-0">
                                <strong>Comentário do professor:</strong>{' '}
                                {p.comentarioProfessor}
                              </p>
                            )}
                          </div>
                          <div className="mt-2 mt-md-0">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => abrirComentario(p)}
                            >
                              {p.comentarioProfessor
                                ? 'Editar comentário'
                                : 'Adicionar comentário'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted">
                  Selecione um aluno na coluna à esquerda para ver o programa de
                  mentoria e adicionar comentários.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMENTÁRIO DO PROFESSOR */}
      {comentarioAberto && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Comentário – {comentarioAberto.tema}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setComentarioAberto(null)}
                ></button>
              </div>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows={6}
                  value={comentarioTemp}
                  onChange={e => setComentarioTemp(e.target.value)}
                  placeholder="Deixe aqui o seu feedback, orientações ou observações para o aluno."
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setComentarioAberto(null)}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={guardarComentario}
                >
                  Guardar comentário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}