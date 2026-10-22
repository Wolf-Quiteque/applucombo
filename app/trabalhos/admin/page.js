'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  SearchX,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  X
} from 'lucide-react'
import s from '../trabalhos.module.css'
import { api } from '../_components/api'
import { iniciais, plural, tempoRelativo } from '../_components/format'
import {
  EmptyState,
  Loading,
  Steps,
  TopBar,
  UserMenu,
  cx,
  useConfirm,
  useDebounced,
  useSession,
  useToast
} from '../_components/ui'
import LoginScreen from '../_components/LoginScreen'
import TrabalhoCard from '../_components/TrabalhoCard'

const PASSOS = [
  { title: 'Escolha um trabalho', text: 'Os que estão "Por corrigir" aparecem primeiro, do mais antigo para o mais recente.' },
  {
    title: 'Abra e comente',
    text: 'Cada comentário fica ligado a uma página. Numa versão nova, confirme cada correcção pedida.'
  },
  { title: 'Envie a correcção', text: 'O aluno passa a ver os comentários na conta dele.' }
]

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Admin />
    </Suspense>
  )
}

function Admin() {
  const { loading, sessao, setSessao, logout } = useSession()
  if (loading) return <Loading />
  if (sessao?.role !== 'professor') return <LoginScreen tipo="professor" onDone={setSessao} />
  return <Painel logout={logout} />
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className={s.search}>
      <Search size={20} />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button className={cx(s.iconBtn, s.searchClear)} onClick={() => onChange('')} aria-label="Limpar pesquisa">
          <X size={18} />
        </button>
      )}
    </div>
  )
}

function Painel({ logout }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const toast = useToast()
  const [confirmEl, confirm] = useConfirm()

  // Filtros guardados no URL (voltar do PDF mantém a mesma vista)
  const vista = params.get('vista') === 'alunos' ? 'alunos' : 'trabalhos'
  const estado = params.get('estado') || 'pendente'
  const alunoId = params.get('aluno') || ''
  const alunoNome = params.get('nome') || ''
  const qUrl = params.get('q') || ''

  const setParams = useCallback(
    patch => {
      const next = new URLSearchParams(params.toString())
      Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)))
      const qs = next.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  // ----- Trabalhos -----
  const [q, setQ] = useState(qUrl)
  const qDebounced = useDebounced(q, 300)
  const [data, setData] = useState(null)
  const [erro, setErro] = useState('')
  const reqId = useRef(0)

  useEffect(() => {
    if (qDebounced !== qUrl) setParams({ q: qDebounced })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced])

  const loadTrabalhos = useCallback(async () => {
    const id = ++reqId.current
    const qs = new URLSearchParams()
    if (estado !== 'todos') qs.set('estado', estado)
    if (alunoId) qs.set('alunoId', alunoId)
    if (qUrl) qs.set('q', qUrl)
    try {
      const d = await api(`/api/trabalhos?${qs}`)
      if (id !== reqId.current) return
      setData(d)
      setErro('')
    } catch (e) {
      if (id !== reqId.current) return
      if (e.status === 401 || e.status === 403) logout()
      else setErro(e.message)
    }
  }, [estado, alunoId, qUrl, logout])

  useEffect(() => {
    if (vista === 'trabalhos') loadTrabalhos()
  }, [vista, loadTrabalhos])

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && vista === 'trabalhos' && loadTrabalhos()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [vista, loadTrabalhos])

  function abrir(t, pagina, versao) {
    try {
      sessionStorage.setItem('trabalhos:voltar', `${pathname}?${params.toString()}`)
    } catch {}
    const qs = new URLSearchParams()
    if (pagina) qs.set('pagina', pagina)
    if (versao) qs.set('versao', versao)
    router.push(`/trabalhos/${t.id}${qs.toString() ? `?${qs}` : ''}`)
  }

  async function apagar(t) {
    const ok = await confirm({
      title: 'Apagar este trabalho?',
      text: `"${t.titulo}" de ${t.aluno.nome} e os seus comentários vão ser apagados para sempre.`,
      confirmLabel: 'Apagar',
      danger: true
    })
    if (!ok) return
    try {
      await api(`/api/trabalhos/${t.id}`, { method: 'DELETE' })
      toast('Trabalho apagado.')
      loadTrabalhos()
    } catch (e) {
      toast(e.message, { error: true })
    }
  }

  // ----- Alunos -----
  const [qa, setQa] = useState('')
  const qaDebounced = useDebounced(qa, 300)
  const [alunos, setAlunos] = useState(null)
  const [erroAlunos, setErroAlunos] = useState('')

  useEffect(() => {
    if (vista !== 'alunos') return
    let alive = true
    setErroAlunos('')
    api(`/api/trabalhos/alunos?q=${encodeURIComponent(qaDebounced.trim())}`)
      .then(d => alive && setAlunos(d.alunos))
      .catch(e => alive && setErroAlunos(e.message))
    return () => {
      alive = false
    }
  }, [vista, qaDebounced])

  function verAluno(a) {
    setQ('')
    setParams({ vista: '', aluno: a.id, nome: a.nome, estado: 'todos', q: '' })
  }

  const contagens = data?.contagens || { pendente: 0, corrigido: 0, total: 0 }
  const filtros = [
    { key: 'pendente', label: 'Por corrigir', n: contagens.pendente },
    { key: 'corrigido', label: 'Corrigidos', n: contagens.corrigido },
    { key: 'todos', label: 'Todos', n: contagens.total }
  ]
  const semFiltros = !qUrl && !alunoId

  return (
    <>
      <TopBar icon={<ShieldCheck size={22} />} title="Correcção de trabalhos" subtitle="Área do professor">
        <UserMenu nome="Professor" onLogout={logout} />
      </TopBar>

      <main className={s.main}>
        <Steps items={PASSOS} active={0} />

        <div className={s.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={vista === 'trabalhos'}
            className={cx(s.tab, vista === 'trabalhos' && s.tabActive)}
            onClick={() => setParams({ vista: '' })}
          >
            <FileText size={18} /> Trabalhos
            {contagens.pendente > 0 && semFiltros && <span className={s.chipCount}>{contagens.pendente}</span>}
          </button>
          <button
            role="tab"
            aria-selected={vista === 'alunos'}
            className={cx(s.tab, vista === 'alunos' && s.tabActive)}
            onClick={() => setParams({ vista: 'alunos' })}
          >
            <Users size={18} /> Alunos
          </button>
        </div>

        {vista === 'trabalhos' ? (
          <>
            <div className={s.toolbar}>
              <SearchBox value={q} onChange={setQ} placeholder="Procurar por aluno, título ou curso" />
              <div className={s.chips} role="radiogroup" aria-label="Filtrar por estado">
                {filtros.map(f => (
                  <button
                    key={f.key}
                    role="radio"
                    aria-checked={estado === f.key}
                    className={cx(s.chip, estado === f.key && s.chipSelected)}
                    onClick={() => setParams({ estado: f.key === 'pendente' ? '' : f.key })}
                  >
                    {estado === f.key && <CheckCircle2 size={16} />}
                    {f.label}
                    <span className={s.chipCount}>{f.n}</span>
                  </button>
                ))}
                {alunoId && (
                  <button
                    className={cx(s.chip, s.chipInput)}
                    onClick={() => setParams({ aluno: '', nome: '' })}
                    title="Mostrar trabalhos de todos os alunos"
                  >
                    <UserRound size={16} /> {alunoNome || 'Aluno'} <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {erro ? (
              <div className={s.errorBox}>
                <AlertCircle size={18} />
                <span style={{ flex: 1 }}>{erro}</span>
                <button className={cx(s.btn, s.btnText, s.btnSmall)} onClick={loadTrabalhos}>
                  Tentar outra vez
                </button>
              </div>
            ) : !data ? (
              <div className={s.list}>
                <div className={s.skeleton} />
                <div className={s.skeleton} />
                <div className={s.skeleton} />
              </div>
            ) : data.trabalhos.length === 0 ? (
              estado === 'pendente' && semFiltros ? (
                <EmptyState
                  icon={<CheckCircle2 size={32} />}
                  title="Tudo em dia!"
                  text="Não há trabalhos por corrigir. Quando um aluno enviar um trabalho, ele aparece aqui."
                  action={
                    contagens.corrigido > 0 && (
                      <button className={cx(s.btn, s.btnTonal)} onClick={() => setParams({ estado: 'corrigido' })}>
                        Ver os corrigidos
                      </button>
                    )
                  }
                />
              ) : (
                <EmptyState
                  icon={<SearchX size={32} />}
                  title="Nenhum trabalho encontrado"
                  text={qUrl ? `Não há resultados para "${qUrl}" neste filtro.` : 'Não há trabalhos neste filtro.'}
                  action={
                    <button
                      className={cx(s.btn, s.btnTonal)}
                      onClick={() => {
                        setQ('')
                        setParams({ q: '', aluno: '', nome: '', estado: 'todos' })
                      }}
                    >
                      Ver todos os trabalhos
                    </button>
                  }
                />
              )
            ) : (
              <div className={s.list}>
                {data.trabalhos.map(t => (
                  <TrabalhoCard
                    key={t.id}
                    t={t}
                    role="professor"
                    onOpen={(pagina, versao) => abrir(t, pagina, versao)}
                    onDelete={() => apagar(t)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className={s.toolbar}>
              <SearchBox value={qa} onChange={setQa} placeholder="Procurar aluno por nome, telefone ou curso" />
            </div>
            <p className={s.muted} style={{ margin: '-4px 0 12px' }}>
              {qaDebounced.trim()
                ? `Resultados para "${qaDebounced.trim()}" (todos os alunos registados)`
                : 'Alunos que já enviaram trabalhos. Pesquise para encontrar qualquer aluno.'}
            </p>

            {erroAlunos ? (
              <div className={s.errorBox}>
                <AlertCircle size={18} />
                <span>{erroAlunos}</span>
              </div>
            ) : !alunos ? (
              <Loading />
            ) : alunos.length === 0 ? (
              <EmptyState
                icon={<Users size={32} />}
                title={qaDebounced.trim() ? 'Nenhum aluno encontrado' : 'Ainda nenhum aluno enviou trabalhos'}
                text={qaDebounced.trim() ? 'Tente outro nome ou número de telefone.' : undefined}
              />
            ) : (
              <div className={s.rows}>
                {alunos.map(a => (
                  <div key={a.id} className={s.alunoRow}>
                    <div className={cx(s.avatar, s.avatarLarge)}>{iniciais(a.nome)}</div>
                    <div className={s.alunoInfo}>
                      <div className={s.alunoName}>{a.nome}</div>
                      <div className={s.alunoMeta}>
                        {[a.telefone, a.curso, a.ultimo ? `último envio ${tempoRelativo(a.ultimo)}` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      </div>
                    </div>
                    {a.pendentes > 0 && (
                      <span className={cx(s.status, s.statusPending, s.hideMobile)}>{a.pendentes} por corrigir</span>
                    )}
                    {a.total > 0 ? (
                      <button className={cx(s.btn, s.btnTonal, s.btnSmall)} onClick={() => verAluno(a)}>
                        {plural(a.total, 'trabalho', 'trabalhos')}
                      </button>
                    ) : (
                      <span className={cx(s.status, s.statusNeutral)}>Sem trabalhos</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      {confirmEl}
    </>
  )
}
