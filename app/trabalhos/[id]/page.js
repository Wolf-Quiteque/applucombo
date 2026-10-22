'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Check,
  History,
  X,
  FileDown,
  Info,
  MessageSquarePlus,
  MessageSquareText,
  RotateCcw,
  Send
} from 'lucide-react'
import s from '../trabalhos.module.css'
import { api, downloadUrl, fileUrl } from '../_components/api'
import { fmtData, fmtDataHora, labelPagina, plural, resumoCorreccoes } from '../_components/format'
import { Loading, StatusChips, cx, useConfirm, useSession, useToast } from '../_components/ui'
import PdfViewer from '../_components/PdfViewer'
import CommentsPanel from '../_components/CommentsPanel'

export default function TrabalhoPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Viewer />
    </Suspense>
  )
}

const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches

function Viewer() {
  const { id } = useParams()
  const search = useSearchParams()
  const router = useRouter()
  const initialPage = Math.max(1, parseInt(search.get('pagina') || '1', 10) || 1)
  const versaoUrl = parseInt(search.get('versao') || '', 10) || null
  const { loading, sessao } = useSession()
  const toast = useToast()
  const [confirmEl, confirm] = useConfirm()
  const pdfRef = useRef(null)
  const textareaRef = useRef(null)

  const [t, setT] = useState(null)
  const [erro, setErro] = useState('')
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [paginaInicial, setPaginaInicial] = useState(initialPage)
  const [verVersao, setVerVersao] = useState(versaoUrl) // null = versão actual
  const [lockedPage, setLockedPage] = useState(null)
  const [draft, setDraft] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [focusGroup, setFocusGroup] = useState(null)
  const [backHref, setBackHref] = useState('/trabalhos')
  const [notaFechada, setNotaFechada] = useState(false)
  const marked = useRef(false)

  // Guardar automático do comentário que está a ser escrito (rascunho)
  const [saveState, setSaveState] = useState('idle') // idle | pending | saving | saved | error
  const [draftRestored, setDraftRestored] = useState(false)
  const lastSaved = useRef({ texto: '', pagina: 0 })
  const pendingDraft = useRef(null)
  const saveTimer = useRef(null)
  const inflight = useRef(null)

  const role = sessao?.role
  const professor = role === 'professor'
  // Versão do PDF que está aberta (pode ser uma anterior, para comparar).
  const versaoVista = t ? Math.min(verVersao || t.versao, t.versao) : null
  const aVerActual = !t || versaoVista === t.versao
  // Os comentários novos são sempre na versão actual.
  const paginasActual = aVerActual ? numPages : t?.paginas || 0
  const composerPage = Math.min(lockedPage ?? currentPage, paginasActual || Infinity)

  useEffect(() => {
    if (!role) return
    let href = role === 'professor' ? '/trabalhos/admin' : '/trabalhos'
    try {
      const saved = sessionStorage.getItem('trabalhos:voltar')
      if (role === 'professor' && saved?.startsWith('/trabalhos/admin')) href = saved
    } catch {}
    setBackHref(href)
  }, [role])

  useEffect(() => {
    if (!sessao) return
    api(`/api/trabalhos/${id}`)
      .then(d => setT(d.trabalho))
      .catch(e => setErro(e.message))
  }, [sessao, id])

  // Marca como visto (tira o "Novo" da lista)
  useEffect(() => {
    if (!t || marked.current) return
    marked.current = true
    if (professor ? t.novoParaProfessor : t.novoParaAluno) {
      api(`/api/trabalhos/${id}`, { method: 'PATCH', body: { accao: 'aberto' } })
        .then(d => setT(d.trabalho))
        .catch(() => {})
    }
  }, [t, professor, id])

  const saveDraftNow = useCallback(
    (payload, { keepalive = false } = {}) => {
      clearTimeout(saveTimer.current)
      pendingDraft.current = null
      setSaveState('saving')
      const p = fetch(`/api/trabalhos/${id}/rascunho`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive
      })
        .then(res => {
          if (!res.ok) throw new Error()
          lastSaved.current = payload
          setSaveState(payload.texto.trim() ? 'saved' : 'idle')
        })
        .catch(() => setSaveState('error'))
      inflight.current = p
      return p
    },
    [id]
  )

  // Recuperar o rascunho guardado da última vez
  useEffect(() => {
    if (!professor || !t || draftRestored) return
    setDraftRestored(true)
    if (t.rascunho?.texto) {
      lastSaved.current = { texto: t.rascunho.texto, pagina: t.rascunho.pagina }
      setDraft(t.rascunho.texto)
      setLockedPage(t.rascunho.pagina)
      setSaveState('restored')
    }
  }, [professor, t, draftRestored])

  // Guardar 0,8 s depois de parar de escrever
  useEffect(() => {
    if (!professor || !draftRestored) return
    const payload = { texto: draft, pagina: draft.trim() ? composerPage : 0 }
    if (payload.texto === lastSaved.current.texto && payload.pagina === lastSaved.current.pagina) return
    pendingDraft.current = payload
    setSaveState('pending')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveDraftNow(payload), 800)
  }, [draft, composerPage, professor, draftRestored, saveDraftNow])

  // Ao sair (voltar à lista, fechar o separador, mudar de app): guardar já
  useEffect(() => {
    const flush = () => {
      if (pendingDraft.current) saveDraftNow(pendingDraft.current, { keepalive: true })
    }
    const onHidden = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      flush()
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHidden)
    }
  }, [saveDraftNow])

  // Só avisa ao fechar se o último guardar falhou (ex.: sem internet)
  useEffect(() => {
    if (saveState !== 'error') return
    const onBefore = e => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [saveState])

  if (loading) return <Loading />

  if (!sessao) {
    return (
      <div className={s.loginWrap}>
        <div className={s.loginCard} style={{ textAlign: 'center' }}>
          <h1 className={s.loginTitle}>Entre para ver o trabalho</h1>
          <p className={s.loginText}>A sua sessão terminou ou ainda não entrou.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            <Link className={cx(s.btn, s.btnFilled)} href="/trabalhos">
              Entrar como aluno
            </Link>
            <Link className={cx(s.btn, s.btnText)} href="/trabalhos/admin">
              Entrar como professor
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className={s.center}>
        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--on-surface)' }}>{erro}</div>
        <Link className={cx(s.btn, s.btnFilled)} href={backHref}>
          <ArrowLeft size={18} /> Voltar à lista
        </Link>
      </div>
    )
  }

  if (!t) return <Loading label="A abrir o trabalho…" />

  const counts = {}
  for (const c of t.comentarios) {
    if (c.versao === versaoVista) counts[c.pagina] = (counts[c.pagina] || 0) + 1
  }
  const { pedidos, confirmados } = resumoCorreccoes(t)

  function onLoaded(n) {
    setNumPages(n)
    if (aVerActual && !t.paginas) {
      setT(prev => ({ ...prev, paginas: n }))
      api(`/api/trabalhos/${id}`, { method: 'PATCH', body: { paginas: n } }).catch(() => {})
    }
  }

  function onDraft(v) {
    setDraft(v)
    if (v && lockedPage == null) setLockedPage(currentPage)
  }

  function commentOnPage(n) {
    setLockedPage(n)
    setPanelOpen(true)
    setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), isMobile() ? 260 : 0)
  }

  function showComments(n) {
    setPanelOpen(true)
    setFocusGroup({ page: n, versao: versaoVista, at: Date.now() })
  }

  // Abre outra versão do PDF (opcionalmente numa página).
  function trocarVersao(v, pagina = 1) {
    const actual = v >= t.versao
    setVerVersao(actual ? null : v)
    setPaginaInicial(pagina)
    setCurrentPage(pagina)
    setNumPages(0)
    const qs = new URLSearchParams()
    if (!actual) qs.set('versao', v)
    if (pagina > 1) qs.set('pagina', pagina)
    router.replace(`/trabalhos/${id}${qs.toString() ? `?${qs}` : ''}`, { scroll: false })
  }

  function goto(n, versao) {
    if (versao && versao !== versaoVista) trocarVersao(versao, n || 1)
    else if (n) pdfRef.current?.scrollToPage(n)
    if (isMobile()) setPanelOpen(false)
  }

  async function confirmarCorreccao(c, confirmado) {
    try {
      const d = await api(`/api/trabalhos/${id}/comentarios/${c.id}`, { method: 'PATCH', body: { confirmado } })
      setT(d.trabalho)
    } catch (e) {
      toast(e.message, { error: true })
    }
  }

  async function addComment() {
    const pagina = composerPage
    const texto = draft
    // Não deixar um guardar automático atrasado recriar o rascunho.
    clearTimeout(saveTimer.current)
    pendingDraft.current = null
    await inflight.current
    try {
      const d = await api(`/api/trabalhos/${id}/comentarios`, {
        method: 'POST',
        body: { pagina, texto, limparRascunho: true }
      })
      lastSaved.current = { texto: '', pagina: 0 }
      setT(d.trabalho)
      setDraft('')
      setLockedPage(null)
      setSaveState('idle')
      toast(`Comentário adicionado: ${labelPagina(pagina).toLowerCase()}.`)
      return true
    } catch (e) {
      toast(e.message, { error: true })
      saveDraftNow({ texto, pagina })
      return false
    }
  }

  async function updateComment(c, body, { silent = false } = {}) {
    try {
      const d = await api(`/api/trabalhos/${id}/comentarios/${c.id}`, { method: 'PATCH', body })
      setT(d.trabalho)
      if (!silent) toast('Comentário actualizado.')
      return true
    } catch (e) {
      toast(e.message, { error: true })
      return false
    }
  }

  async function deleteComment(c) {
    try {
      const d = await api(`/api/trabalhos/${id}/comentarios/${c.id}`, { method: 'DELETE' })
      setT(d.trabalho)
      toast('Comentário apagado.', {
        action: {
          label: 'Desfazer',
          onClick: async () => {
            try {
              const r = await api(`/api/trabalhos/${id}/comentarios`, {
                method: 'POST',
                body: { pagina: c.pagina, texto: c.texto }
              })
              setT(r.trabalho)
            } catch (e) {
              toast(e.message, { error: true })
            }
          }
        }
      })
    } catch (e) {
      toast(e.message, { error: true })
    }
  }

  async function enviarCorreccao() {
    const temRascunho = !!draft.trim()
    const n = t.comentarios.filter(c => c.versao === t.versao).length + (temRascunho ? 1 : 0)
    const partes = []
    if (pedidos > 0) {
      partes.push(
        `Confirmou ${confirmados} de ${pedidos} correcções pedidas.` +
          (confirmados < pedidos ? ' As restantes ficam marcadas "por corrigir" para o aluno.' : '')
      )
      partes.push(n ? `Há ${plural(n, 'comentário novo', 'comentários novos')} nesta versão.` : '')
    } else {
      partes.push(
        n
          ? `${t.aluno.nome} vai passar a ver ${plural(n, 'comentário', 'comentários')}.`
          : `Ainda não escreveu comentários. ${t.aluno.nome} vai ver o trabalho como corrigido, sem comentários.`
      )
    }
    partes.push('Pode continuar a editar depois — o aluno é avisado das alterações.')
    if (temRascunho) {
      partes.unshift(`O comentário que está a escrever (${labelPagina(composerPage).toLowerCase()}) também vai ser adicionado.`)
    }
    const ok = await confirm({
      title: 'Enviar a correcção ao aluno?',
      text: partes.filter(Boolean).join(' '),
      confirmLabel: 'Enviar correcção'
    })
    if (!ok) return
    if (temRascunho && !(await addComment())) return
    try {
      const d = await api(`/api/trabalhos/${id}`, { method: 'PATCH', body: { estado: 'corrigido' } })
      setT(d.trabalho)
      toast('Correcção enviada. O aluno já pode ver os comentários.', {
        action: { label: 'Voltar à lista', onClick: () => router.push(backHref) },
        duration: 7000
      })
    } catch (e) {
      toast(e.message, { error: true })
    }
  }

  async function reabrir() {
    const ok = await confirm({
      title: 'Voltar a pôr "Por corrigir"?',
      text: 'O aluno deixa de ver os comentários até enviar a correcção outra vez.',
      confirmLabel: 'Sim, voltar'
    })
    if (!ok) return
    try {
      const d = await api(`/api/trabalhos/${id}`, { method: 'PATCH', body: { estado: 'pendente' } })
      setT(d.trabalho)
      toast('O trabalho voltou para "Por corrigir".')
    } catch (e) {
      toast(e.message, { error: true })
    }
  }

  let nota = null
  if (professor && t.status !== 'corrigido' && pedidos > 0) {
    nota = `Versão ${t.versao}: no painel, confirme (✓) cada correcção que o aluno fez e comente o que ainda faltar. Tudo fica guardado automaticamente.`
  } else if (professor && t.status !== 'corrigido') {
    nota = 'Tudo o que escreve fica guardado automaticamente. O aluno só vê os comentários depois de clicar em "Enviar correcção".'
  } else if (!professor && t.status !== 'corrigido' && t.versao > 1) {
    nota = `O professor ainda não reviu a versão ${t.versao}. Os comentários da versão anterior continuam aqui.`
  } else if (!professor && t.status === 'corrigido' && t.comentarios.length) {
    nota = 'Clique num comentário para ir à página. As páginas com comentários têm um contador azul.'
  }

  return (
    <div className={s.viewer}>
      <header className={s.viewerTop}>
        <Link href={backHref} className={s.iconBtn} title="Voltar à lista" aria-label="Voltar à lista">
          <ArrowLeft size={22} />
        </Link>
        <div className={s.topTitles}>
          <h1 className={s.topTitle} style={{ fontSize: 18 }} title={t.titulo}>
            {t.titulo}
          </h1>
          <div className={s.topSub}>
            {professor ? `${t.aluno.nome} · ` : ''}
            {t.versao > 1 ? `Versão ${t.versao} enviada ${fmtDataHora(t.versaoEm)}` : `Enviado ${fmtDataHora(t.criadoEm)}`}
          </div>
        </div>
        <div className={cx(s.tTags, s.hideMobile)} style={{ marginTop: 0 }}>
          <StatusChips t={t} role={role} />
        </div>
        <div className={s.viewerActions}>
          <a
            className={s.iconBtn}
            href={downloadUrl(id, aVerActual ? null : versaoVista)}
            title={`Descarregar o PDF (versão ${versaoVista})`}
            aria-label="Descarregar o PDF"
          >
            <FileDown size={20} />
          </a>
          {professor &&
            (t.status === 'corrigido' ? (
              <button className={cx(s.btn, s.btnOutlined)} onClick={reabrir} title='Voltar a pôr "Por corrigir"'>
                <RotateCcw size={18} />
                <span className={s.hideMobile}>Por corrigir</span>
              </button>
            ) : (
              <button className={cx(s.btn, s.btnFilled)} onClick={enviarCorreccao}>
                <Send size={18} />
                <span className={s.hideMobile}>Enviar correcção ao aluno</span>
                <span className={s.onlyMobile}>Enviar</span>
              </button>
            ))}
        </div>
      </header>

      {(nota || t.mensagem) && !notaFechada && (
        <div className={s.viewerNote}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            {t.mensagem && (
              <div>
                <b>{professor ? 'Mensagem do aluno:' : 'A sua mensagem:'}</b> “{t.mensagem}”
              </div>
            )}
            {nota && <div>{nota}</div>}
          </div>
          <button className={s.iconBtn} onClick={() => setNotaFechada(true)} title="Fechar" aria-label="Fechar aviso">
            <X size={18} />
          </button>
        </div>
      )}

      {t.versoes.length > 1 && (
        <div className={s.versionBar}>
          <History size={16} style={{ flexShrink: 0 }} />
          <span className={s.hideMobile}>Versões:</span>
          <div className={s.chips} role="radiogroup" aria-label="Escolher a versão do PDF">
            {t.versoes.map(v => (
              <button
                key={v.numero}
                role="radio"
                aria-checked={v.numero === versaoVista}
                className={cx(s.chip, v.numero === versaoVista && s.chipSelected)}
                onClick={() => v.numero !== versaoVista && trocarVersao(v.numero)}
                title={`Enviada ${fmtDataHora(v.enviadoEm)} · ${v.nome}`}
              >
                {v.numero === versaoVista && <Check size={14} />}
                Versão {v.numero}
                {v.numero === t.versao ? ' (actual)' : ''}
              </button>
            ))}
          </div>
          {!aVerActual && (
            <span className={s.versionHint}>
              A ver a versão {versaoVista}, de {fmtData(t.versoes.find(v => v.numero === versaoVista)?.enviadoEm)}.
              As páginas dos comentários desta versão referem-se a este PDF.
            </span>
          )}
        </div>
      )}

      <div className={s.viewerBody}>
        <PdfViewer
          ref={pdfRef}
          url={fileUrl(id, aVerActual ? null : versaoVista)}
          downloadHref={downloadUrl(id, aVerActual ? null : versaoVista)}
          initialPage={paginaInicial}
          targetPage={professor && aVerActual ? composerPage : null}
          counts={counts}
          canComment={professor && aVerActual}
          onPageChange={setCurrentPage}
          onLoaded={onLoaded}
          onCommentPage={commentOnPage}
          onShowComments={showComments}
        />
        <CommentsPanel
          t={t}
          role={role}
          numPages={paginasActual}
          currentPage={currentPage}
          versaoVista={versaoVista}
          onVerActual={() => trocarVersao(t.versao)}
          onConfirm={confirmarCorreccao}
          composerPage={composerPage}
          locked={lockedPage != null}
          onComposerPage={setLockedPage}
          onUnlock={() => setLockedPage(null)}
          draft={draft}
          onDraft={onDraft}
          saveState={saveState}
          onRetrySave={() => saveDraftNow({ texto: draft, pagina: draft.trim() ? composerPage : 0 })}
          textareaRef={textareaRef}
          focusGroup={focusGroup}
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          onGoto={goto}
          onAdd={addComment}
          onUpdate={updateComment}
          onDelete={deleteComment}
        />
      </div>

      <div className={s.mobileBar}>
        <button className={cx(s.btn, s.btnTonal)} onClick={() => setPanelOpen(true)}>
          <MessageSquareText size={18} /> Comentários ({t.comentarios.length})
        </button>
        {professor && aVerActual && (
          <button className={cx(s.btn, s.btnFilled)} onClick={() => commentOnPage(currentPage)}>
            <MessageSquarePlus size={18} /> Comentar pág. {currentPage}
          </button>
        )}
      </div>

      {confirmEl}
    </div>
  )
}
