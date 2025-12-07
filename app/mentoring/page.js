// app/mentoring/page.js
'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from '../page.module.css' // estilos globais de cards/áreas

const cursosDisponiveis = [
  'Crescimento e Desenvolvimento Económico',
  'Finanças Corporativas',
  'CBC/FT/FP',
  'Teoria dos Jogos',
  'Investimento Estrangeiro Directo',
  'Baiao FT',
  'Inteligência BC'
]

export default function MentoringPage() {
  const [modo, setModo] = useState('login') // 'login' ou 'signup'

  // aluno autenticado
  const [user, setUser] = useState(null)

  // form de registo
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [curso, setCurso] = useState(cursosDisponiveis[0])

  // form de login
  const [loginTelefone, setLoginTelefone] = useState('')
  const [loginSenha, setLoginSenha] = useState('')

  // programa de aluno
  const [programas, setProgramas] = useState([])
  const [tema, setTema] = useState('')
  const [descricao, setDescricao] = useState('')
  const [deadline, setDeadline] = useState('')
  const [notas, setNotas] = useState('')

  // modal / dropdown de notas
  const [notaAberta, setNotaAberta] = useState(null)
  const [notaTemp, setNotaTemp] = useState('')

  // modal de edição de tarefa
  const [editPrograma, setEditPrograma] = useState(null)
  const [editTema, setEditTema] = useState('')
  const [editDescricao, setEditDescricao] = useState('')
  const [editDeadline, setEditDeadline] = useState('')

  // perguntas ao professor
  const [perguntas, setPerguntas] = useState([])
  const [perguntaTitulo, setPerguntaTitulo] = useState('')
  const [perguntaDetalhe, setPerguntaDetalhe] = useState('')

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [info, setInfo] = useState('')

  // tentar carregar aluno da storage
  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = window.localStorage.getItem('mentoringUser')
    if (saved) {
      const parsed = JSON.parse(saved)
      setUser(parsed)
      carregarProgramas(parsed.id)
      carregarPerguntas(parsed.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

      const newUser = res.data.user
      setUser(newUser)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentoringUser', JSON.stringify(newUser))
      }
      setInfo('Conta criada com sucesso. Já pode criar o seu programa.')
      setModo('login') // se preferir que tenha de entrar de novo, basta remover setUser(newUser)
    } catch (err) {
      setErro(
        err.response?.data?.error ||
          'Ocorreu um erro ao criar a conta.'
      )
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
        telefone: loginTelefone,
        senha: loginSenha
      })

      const loggedUser = res.data.user
      setUser(loggedUser)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('mentoringUser', JSON.stringify(loggedUser))
      }
      setInfo('Sessão iniciada com sucesso.')
      carregarProgramas(loggedUser.id)
      carregarPerguntas(loggedUser.id)
    } catch (err) {
      setErro(
        err.response?.data?.error ||
          'Ocorreu um erro ao iniciar sessão.'
      )
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    setUser(null)
    setProgramas([])
    setPerguntas([])
    setNotaAberta(null)
    setEditPrograma(null)
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('mentoringUser')
    }
  }

  async function carregarProgramas(alunoId) {
    if (!alunoId) return
    try {
      const res = await axios.get('/api/mentoring/programas', {
        params: { alunoId }
      })
      setProgramas(res.data.programas || [])
    } catch (err) {
      console.error(err)
      setErro('Não foi possível carregar o seu programa.')
    }
  }

  async function carregarPerguntas(alunoId) {
    if (!alunoId) return
    try {
      const res = await axios.get('/api/mentoring/questions', {
        params: { alunoId }
      })
      setPerguntas(res.data.perguntas || [])
    } catch (err) {
      console.error(err)
      setErro('Não foi possível carregar as perguntas.')
    }
  }

  async function handleCriarPrograma(e) {
    e.preventDefault()
    if (!user) {
      setErro('Inicie sessão para criar o seu programa.')
      return
    }
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.post('/api/mentoring/programas', {
        alunoId: user.id,
        tema,
        descricao,
        deadline,
        notas
      })

      setProgramas(prev => [res.data.programa, ...prev])
      setTema('')
      setDescricao('')
      setDeadline('')
      setNotas('')
      setInfo('Entrada adicionada ao programa.')
    } catch (err) {
      console.error(err)
      setErro(
        err.response?.data?.error ||
          'Erro ao adicionar entrada ao programa.'
      )
    } finally {
      setLoading(false)
    }
  }

  // só deixa marcar concluído na data do deadline ou depois
  async function toggleConcluido(programa) {
    setErro('')
    setInfo('')

    if (!programa.concluido && programa.deadline) {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)

      const deadlineDate = new Date(programa.deadline)
      if (!isNaN(deadlineDate)) {
        deadlineDate.setHours(0, 0, 0, 0)

        if (deadlineDate > hoje) {
          setErro(
            'Só pode marcar esta tarefa como concluída na data do deadline ou depois.'
          )
          return
        }
      }
    }

    try {
      const res = await axios.put(
        `/api/mentoring/programas/${programa.id}`,
        { concluido: !programa.concluido }
      )
      const updated = res.data.programa
      setProgramas(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      )
    } catch (err) {
      console.error(err)
      setErro(
        err.response?.data?.error ||
          'Não foi possível actualizar o status.'
      )
    }
  }

  function abrirNotas(programa) {
    setNotaAberta(programa)
    setNotaTemp(programa.notas || '')
  }

  async function guardarNotas() {
    if (!notaAberta) return
    try {
      const res = await axios.put(
        `/api/mentoring/programas/${notaAberta.id}`,
        { notas: notaTemp }
      )
      const updated = res.data.programa
      setProgramas(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      )
      setNotaAberta(null)
      setNotaTemp('')
    } catch (err) {
      console.error(err)
      setErro('Não foi possível guardar as anotações.')
    }
  }

  function abrirEditar(programa) {
    setEditPrograma(programa)
    setEditTema(programa.tema || '')
    setEditDescricao(programa.descricao || '')
    setEditDeadline(programa.deadline || '')
  }

  async function guardarEdicao() {
    if (!editPrograma) return
    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.put(
        `/api/mentoring/programas/${editPrograma.id}`,
        {
          tema: editTema,
          descricao: editDescricao,
          deadline: editDeadline
        }
      )
      const updated = res.data.programa
      setProgramas(prev =>
        prev.map(p => (p.id === updated.id ? updated : p))
      )
      setEditPrograma(null)
    } catch (err) {
      console.error(err)
      setErro(
        err.response?.data?.error ||
          'Não foi possível actualizar a tarefa.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function apagarPrograma(programa) {
    if (!window.confirm('Tem a certeza que quer apagar esta tarefa?')) return
    setErro('')
    setInfo('')

    try {
      await axios.delete(`/api/mentoring/programas/${programa.id}`)
      setProgramas(prev => prev.filter(p => p.id !== programa.id))
      setInfo('Tarefa removida do programa.')
    } catch (err) {
      console.error(err)
      setErro(
        err.response?.data?.error ||
          'Não foi possível apagar a tarefa.'
      )
    }
  }

  async function handleCriarPergunta(e) {
    e.preventDefault()
    if (!user) {
      setErro('Inicie sessão para enviar perguntas.')
      return
    }
    if (!perguntaTitulo.trim()) {
      setErro('Escreva a pergunta antes de enviar.')
      return
    }

    setErro('')
    setInfo('')
    setLoading(true)

    try {
      const res = await axios.post('/api/mentoring/questions', {
        alunoId: user.id,
        pergunta: perguntaTitulo,
        detalhe: perguntaDetalhe
      })

      // respondidas primeiro
      setPerguntas(prev => [res.data.pergunta, ...prev])
      setPerguntaTitulo('')
      setPerguntaDetalhe('')
      setInfo('Pergunta enviada ao professor.')
    } catch (err) {
      console.error(err)
      setErro(
        err.response?.data?.error ||
          'Erro ao enviar pergunta ao professor.'
      )
    } finally {
      setLoading(false)
    }
  }

  const totalPerguntas = perguntas.length
  const perguntasRespondidas = perguntas.filter(q => q.respondida).length
  const perguntasPendentes = totalPerguntas - perguntasRespondidas

  const progresso =
    programas.length === 0
      ? 0
      : Math.round(
          (programas.filter(p => p.concluido).length / programas.length) * 100
        )

  return (
    <div className="container py-5">
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className={styles.pageTitle || 'h2 fw-bold'}>
            Programa de Mentoria do Aluno
          </h1>
          <p className="text-muted">
            Organize os seus temas, tarefas e prazos. O objectivo é ter tudo
            claro, num só lugar, para si e para o professor.
          </p>
        </div>
      </div>

      {/* ALERTAS */}
      {(erro || info) && (
        <div className="row mb-3">
          <div className="col-12">
            {erro && <div className="alert alert-danger">{erro}</div>}
            {info && <div className="alert alert-success">{info}</div>}
          </div>
        </div>
      )}

      <div className="row">
        {/* COLUNA ESQUERDA: LOGIN/REGISTO / SESSÃO */}
        <div className="col-lg-4 mb-4">
          <div
            className={`${styles.selectionArea || ''} bg-white border rounded`}
          >
            {!user ? (
              <>
                {/* Toggle entre login e signup */}
                <div className="d-flex justify-content-between mb-3">
                  <button
                    className={
                      'btn btn-sm ' +
                      (modo === 'login'
                        ? 'btn-primary'
                        : 'btn-outline-primary')
                    }
                    onClick={() => setModo('login')}
                  >
                    Entrar
                  </button>
                  <button
                    className={
                      'btn btn-sm ' +
                      (modo === 'signup'
                        ? 'btn-primary'
                        : 'btn-outline-primary')
                    }
                    onClick={() => setModo('signup')}
                  >
                    Criar conta
                  </button>
                </div>

                {modo === 'signup' && (
                  <form onSubmit={handleSignup}>
                    <h5 className="mb-3">Criar conta de aluno</h5>
                    <div className="mb-3">
                      <label className="form-label">Nome completo</label>
                      <input
                        type="text"
                        className="form-control"
                        value={nomeCompleto}
                        onChange={e => setNomeCompleto(e.target.value)}
                        required
                      />
                    </div>
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
                    <div className="mb-3">
                      <label className="form-label">Curso actual</label>
                      <select
                        className="form-select"
                        value={curso}
                        onChange={e => setCurso(e.target.value)}
                      >
                        {cursosDisponiveis.map(c => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? 'A criar conta...' : 'Criar conta'}
                    </button>
                  </form>
                )}

                {modo === 'login' && (
                  <form onSubmit={handleLogin}>
                    <h5 className="mb-3">Entrar</h5>
                    <div className="mb-3">
                      <label className="form-label">Telefone</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={loginTelefone}
                        onChange={e => setLoginTelefone(e.target.value)}
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Palavra-passe</label>
                      <input
                        type="password"
                        className="form-control"
                        value={loginSenha}
                        onChange={e => setLoginSenha(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary w-100"
                      disabled={loading}
                    >
                      {loading ? 'A entrar...' : 'Entrar'}
                    </button>
                  </form>
                )}
              </>
            ) : (
              <div>
                <h5 className="mb-3">Sessão</h5>
                <p className="mb-1">
                  <strong>Aluno:</strong> {user.nomeCompleto}
                </p>
                <p className="mb-1">
                  <strong>Curso:</strong> {user.curso}
                </p>
                <button
                  className="btn btn-outline-danger btn-sm mt-2"
                  onClick={handleLogout}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA */}
        <div className="col-lg-8">
          {/* PROGRAMA DO ALUNO */}
          <div className={styles.materialsArea || 'border rounded p-3'}>
            <h4 className="mb-3">Programa de aluno</h4>

            {user ? (
              <>
                {/* PROGRESSO */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Progresso geral: {progresso}%
                  </label>
                  <div className="progress">
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
                  <small className="text-muted">
                    {progresso === 0
                      ? 'Comece adicionando o primeiro tema.'
                      : progresso < 50
                      ? 'Boa, já começou. Continue a avançar passo a passo.'
                      : progresso < 100
                      ? 'Já fez mais de metade do plano, mantenha o ritmo.'
                      : 'Parabéns, concluiu todo o programa!'}
                  </small>
                </div>

                {/* FORM NOVA ENTRADA */}
                <form onSubmit={handleCriarPrograma} className="mb-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Tema</label>
                      <input
                        type="text"
                        className="form-control"
                        value={tema}
                        onChange={e => setTema(e.target.value)}
                        placeholder="Ex: Revisão de Teoria dos Jogos"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Deadline</label>
                      <input
                        type="date"
                        className="form-control"
                        value={deadline}
                        onChange={e => setDeadline(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">
                        O que vai fazer (descrição)
                      </label>
                      <textarea
                        className="form-control"
                        rows={3}
                        value={descricao}
                        onChange={e => setDescricao(e.target.value)}
                        placeholder="Ex: Ler capítulo 3, responder exercícios 1-5 e preparar resumo."
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">
                        Notas / anotações (opcional)
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={notas}
                        onChange={e => setNotas(e.target.value)}
                        placeholder="Ex: Dúvidas que quero discutir com o professor."
                      />
                    </div>
                    <div className="col-12 text-end">
                      <button
                        type="submit"
                        className="btn btn-success"
                        disabled={loading}
                      >
                        {loading ? 'A guardar...' : 'Adicionar ao programa'}
                      </button>
                    </div>
                  </div>
                </form>

                {/* LISTA DE ENTRADAS */}
                {programas.length === 0 ? (
                  <p className="text-muted">
                    Ainda não tem itens no programa. Comece adicionando um
                    tema com deadline.
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
                            <input
                              type="checkbox"
                              className="form-check-input me-2"
                              checked={!!p.concluido}
                              onChange={() => toggleConcluido(p)}
                            />
                            <h6 className="mb-0">
                              {p.tema}{' '}
                              {p.concluido && (
                                <span className="badge bg-success ms-2">
                                  Concluído
                                </span>
                              )}

                              {/* Badge extra consoante o prazo */}
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
                              <strong>Minhas anotações:</strong> {p.notas}
                            </p>
                          )}
                          {p.comentarioProfessor && (
                            <p className="mb-0">
                              <strong>Anotações do professor:</strong>{' '}
                              {p.comentarioProfessor}
                            </p>
                          )}
                        </div>
                        <div className="mt-3 mt-md-0 d-flex flex-wrap gap-2 justify-content-end">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => abrirNotas(p)}
                          >
                            Anotações
                          </button>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => abrirEditar(p)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => apagarPrograma(p)}
                          >
                            Apagar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted">
                Para ver e editar o seu programa, primeiro crie uma conta ou
                inicie sessão na coluna ao lado.
              </p>
            )}
          </div>

          {/* PERGUNTAS AO PROFESSOR – só visível se estiver logado */}
          {user && (
            <div
              className={
                styles.materialsArea || 'border rounded p-3 mt-4'
              }
            >
              <h4 className="mb-3">Perguntas ao professor</h4>

              <div className="mb-3 d-flex flex-wrap align-items-center gap-2">
                <span className="badge bg-secondary">
                  Total: {totalPerguntas}
                </span>
                <span className="badge bg-success">
                  Respondidas: {perguntasRespondidas}
                </span>
                <span className="badge bg-warning text-dark">
                  Pendentes: {perguntasPendentes}
                </span>
              </div>

              {/* FORM NOVA PERGUNTA */}
              <form onSubmit={handleCriarPergunta} className="mb-4">
                <div className="mb-3">
                  <label className="form-label">Pergunta</label>
                  <input
                    type="text"
                    className="form-control"
                    value={perguntaTitulo}
                    onChange={e => setPerguntaTitulo(e.target.value)}
                    placeholder="Ex: Não entendi a parte dos multiplicadores fiscais..."
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">
                    Detalhe / contexto (opcional)
                  </label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={perguntaDetalhe}
                    onChange={e => setPerguntaDetalhe(e.target.value)}
                    placeholder="Explique melhor onde ficou a dúvida, página, exercício, etc."
                  />
                </div>
                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-outline-primary"
                    disabled={loading}
                  >
                    {loading ? 'A enviar...' : 'Enviar pergunta'}
                  </button>
                </div>
              </form>

              {/* LISTA DE PERGUNTAS */}
              {perguntas.length === 0 ? (
                <p className="text-muted">
                  Ainda não enviou nenhuma pergunta ao professor.
                </p>
              ) : (
                <div className="list-group">
                  {perguntas.map(q => (
                    <div
                      key={q.id}
                      className="list-group-item d-flex flex-column"
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <h6 className="mb-1">
                          {q.pergunta}{' '}
                          {q.respondida ? (
                            <span className="badge bg-success ms-2">
                              Respondida
                            </span>
                          ) : (
                            <span className="badge bg-warning text-dark ms-2">
                              Pendente
                            </span>
                          )}
                        </h6>
                        <small className="text-muted ms-2">
                          {q.createdAt
                            ? new Date(q.createdAt).toLocaleDateString(
                                'pt-PT'
                              )
                            : ''}
                        </small>
                      </div>
                      {q.detalhe && (
                        <p className="mb-1">
                          <strong>Detalhe:</strong> {q.detalhe}
                        </p>
                      )}
                      {q.respondida && (
                        <p className="mb-0">
                          <strong>Resposta do professor:</strong>{' '}
                          {q.resposta}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL SIMPLES DE NOTAS */}
      {notaAberta && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Anotações – {notaAberta.tema}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setNotaAberta(null)}
                ></button>
              </div>
              <div className="modal-body">
                <textarea
                  className="form-control"
                  rows={6}
                  value={notaTemp}
                  onChange={e => setNotaTemp(e.target.value)}
                  placeholder="Escreva as suas anotações, reflexões, dúvidas, etc."
                />
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setNotaAberta(null)}
                >
                  Fechar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={guardarNotas}
                >
                  Guardar notas
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE TAREFA */}
      {editPrograma && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Editar tarefa – {editPrograma.tema}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditPrograma(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Tema</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editTema}
                      onChange={e => setEditTema(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Deadline</label>
                    <input
                      type="date"
                      className="form-control"
                      value={editDeadline}
                      onChange={e => setEditDeadline(e.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Descrição</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={editDescricao}
                      onChange={e =>
                        setEditDescricao(e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditPrograma(null)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={guardarEdicao}
                  disabled={loading}
                >
                  {loading ? 'A guardar...' : 'Guardar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}