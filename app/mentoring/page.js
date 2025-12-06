// app/mentoring/page.js
'use client'

import { useEffect, useState } from 'react'
import axios from 'axios'
import styles from '../page.module.css' // já tem bons estilos de cards/áreas

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
    }
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
      setModo('login') // se preferir, pode deixar já logado
      // opcional: carregarProgramas(newUser.id)
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

  async function toggleConcluido(programa) {
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
      setErro('Não foi possível actualizar o status.')
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
            Organize os seus temas, tarefas e prazos. O objectivo é ter tudo claro,
            num só lugar, para si e para o professor.
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
        {/* COLUNA ESQUERDA: LOGIN/REGISTO */}
        <div className="col-lg-4 mb-4">
          <div
            className={`${styles.selectionArea || ''} bg-white border rounded`}
          >
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

            {!user && modo === 'signup' && (
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

            {!user && modo === 'login' && (
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

            {user && (
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

        {/* COLUNA DIREITA: PROGRAMA DO ALUNO */}
        <div className="col-lg-8">
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
                        {loading
                          ? 'A guardar...'
                          : 'Adicionar ao programa'}
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
                            </h6>
                          </div>
                          <small className="text-muted">
                            Deadline:{' '}
                            {p.deadline ||
                              'Sem data definida'}
                          </small>
                          <p className="mb-1 mt-2">
                            {p.descricao}
                          </p>
                        </div>
                        <div className="mt-2 mt-md-0">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => abrirNotas(p)}
                          >
                            Anotações
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
    </div>
  )
}