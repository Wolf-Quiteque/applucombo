'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, FileUp, GraduationCap, Plus, Sparkles } from 'lucide-react'
import s from './trabalhos.module.css'
import { api } from './_components/api'
import { plural } from './_components/format'
import {
  EmptyState,
  Loading,
  Steps,
  TopBar,
  UserMenu,
  WrongRole,
  cx,
  useConfirm,
  useSession,
  useToast
} from './_components/ui'
import LoginScreen from './_components/LoginScreen'
import TrabalhoCard from './_components/TrabalhoCard'
import UploadDialog from './_components/UploadDialog'

const PASSOS = [
  { title: 'Envie o PDF', text: 'Clique em "Enviar trabalho" e escolha o ficheiro.' },
  { title: 'O professor corrige', text: 'Lê o PDF e escreve comentários em cada página.' },
  {
    title: 'Corrija e envie de novo',
    text: 'Veja os comentários por página, corrija e envie a versão nova. O professor confirma cada correcção.'
  }
]

export default function AlunoPage() {
  const { loading, sessao, setSessao, logout } = useSession()

  if (loading) return <Loading />
  if (!sessao) return <LoginScreen tipo="aluno" onDone={setSessao} />
  if (sessao.role !== 'aluno') {
    return <WrongRole sessao={sessao} onLogout={logout} href="/trabalhos/admin" label="Ir para a área do professor" />
  }
  return <Dashboard sessao={sessao} logout={logout} />
}

function Dashboard({ sessao, logout }) {
  const router = useRouter()
  const toast = useToast()
  const [confirmEl, confirm] = useConfirm()
  const [trabalhos, setTrabalhos] = useState(null)
  const [erro, setErro] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [versaoDe, setVersaoDe] = useState(null) // trabalho a receber uma versão corrigida

  const load = useCallback(async () => {
    try {
      const d = await api('/api/trabalhos')
      setTrabalhos(d.trabalhos)
      setErro('')
    } catch (e) {
      if (e.status === 401) logout()
      else setErro(e.message)
    }
  }, [logout])

  useEffect(() => {
    load()
    // Actualiza quando o aluno volta a este separador (ex.: para ver uma correcção nova).
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [load])

  const novos = trabalhos?.filter(t => t.novoParaAluno).length || 0
  const passo = !trabalhos?.length ? 0 : trabalhos.some(t => t.status === 'corrigido') ? 2 : 1

  function abrir(t, pagina, versao) {
    const qs = new URLSearchParams()
    if (pagina) qs.set('pagina', pagina)
    if (versao) qs.set('versao', versao)
    router.push(`/trabalhos/${t.id}${qs.toString() ? `?${qs}` : ''}`)
  }

  async function apagar(t) {
    const ok = await confirm({
      title: 'Apagar este trabalho?',
      text: `"${t.titulo}" vai ser apagado. Use isto se enviou o ficheiro errado.`,
      confirmLabel: 'Apagar',
      danger: true
    })
    if (!ok) return
    try {
      await api(`/api/trabalhos/${t.id}`, { method: 'DELETE' })
      setTrabalhos(list => list.filter(x => x.id !== t.id))
      toast('Trabalho apagado.')
    } catch (e) {
      toast(e.message, { error: true })
      load()
    }
  }

  function enviado(t) {
    if (versaoDe) {
      setVersaoDe(null)
      setTrabalhos(list => list.map(x => (x.id === t.id ? t : x)))
      toast(`Versão ${t.versao} enviada! O professor vai confirmar as correcções.`, { duration: 6000 })
      return
    }
    setUploadOpen(false)
    setTrabalhos(list => [t, ...(list || [])])
    toast('Trabalho enviado! Os comentários do professor vão aparecer aqui.', { duration: 6000 })
  }

  return (
    <>
      <TopBar icon={<GraduationCap size={22} />} title="Os meus trabalhos" subtitle={sessao.curso || 'Área do aluno'}>
        <UserMenu nome={sessao.nome} onLogout={logout} />
      </TopBar>

      <main className={s.main}>
        <Steps items={PASSOS} active={passo} />

        {novos > 0 && (
          <div
            className={s.tip}
            style={{ marginTop: 16, background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}
          >
            <Sparkles size={18} />
            <span>
              Tem {plural(novos, 'correcção nova', 'correcções novas')}. Abra o trabalho para ver os comentários do
              professor.
            </span>
          </div>
        )}

        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>
            Trabalhos enviados {trabalhos?.length ? <span className={s.muted}>({trabalhos.length})</span> : null}
          </h2>
          <button className={cx(s.btn, s.btnFilled, s.hideMobile)} onClick={() => setUploadOpen(true)}>
            <Plus size={18} /> Enviar trabalho
          </button>
        </div>

        {erro ? (
          <div className={s.errorBox}>
            <AlertCircle size={18} />
            <span style={{ flex: 1 }}>{erro}</span>
            <button className={cx(s.btn, s.btnText, s.btnSmall)} onClick={load}>
              Tentar outra vez
            </button>
          </div>
        ) : trabalhos === null ? (
          <div className={s.list}>
            <div className={s.skeleton} />
            <div className={s.skeleton} />
          </div>
        ) : trabalhos.length === 0 ? (
          <EmptyState
            icon={<FileUp size={32} />}
            title="Ainda não enviou nenhum trabalho"
            text="Envie o seu trabalho em PDF. O professor vai lê-lo e deixar comentários em cada página."
            action={
              <button className={cx(s.btn, s.btnFilled)} onClick={() => setUploadOpen(true)}>
                <Plus size={18} /> Enviar o primeiro trabalho
              </button>
            }
          />
        ) : (
          <div className={s.list}>
            {trabalhos.map(t => (
              <TrabalhoCard
                key={t.id}
                t={t}
                role="aluno"
                onOpen={(pagina, versao) => abrir(t, pagina, versao)}
                onDelete={() => apagar(t)}
                onNovaVersao={() => setVersaoDe(t)}
              />
            ))}
          </div>
        )}
      </main>

      <button className={s.fab} onClick={() => setUploadOpen(true)}>
        <Plus size={22} /> Enviar trabalho
      </button>

      <UploadDialog
        open={uploadOpen || !!versaoDe}
        trabalho={versaoDe}
        onClose={() => {
          setUploadOpen(false)
          setVersaoDe(null)
        }}
        onUploaded={enviado}
      />
      {confirmEl}
    </>
  )
}
