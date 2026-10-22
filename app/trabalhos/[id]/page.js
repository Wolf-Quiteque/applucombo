'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
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
import { fmtDataHora, labelPagina, plural } from '../_components/format'
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
  const { loading, sessao } = useSession()
  const toast = useToast()
  const [confirmEl, confirm] = useConfirm()
  const pdfRef = useRef(null)
  const textareaRef = useRef(null)

  const [t, setT] = useState(null)
  const [erro, setErro] = useState('')
  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [lockedPage, setLockedPage] = useState(null)
  const [draft, setDraft] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const [focusGroup, setFocusGroup] = useState(null)
  const [backHref, setBackHref] = useState('/trabalhos')
  const [notaFechada, setNotaFechada] = useState(false)
  const marked = useRef(false)

  const role = sessao?.role
  const professor = role === 'professor'

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

  // Avisar antes de sair com um comentário por adicionar
  useEffect(() => {
    if (!draft.trim()) return
    const onBefore = e => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [draft])

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

  const composerPage = Math.min(lockedPage ?? currentPage, numPages || Infinity)
  const counts = {}
  for (const c of t.comentarios) counts[c.pagina] = (counts[c.pagina] || 0) + 1

  function onLoaded(n) {
    setNumPages(n)
    if (!t.paginas) {
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
    setFocusGroup({ page: n, at: Date.now() })
  }

  function goto(n) {
    pdfRef.current?.scrollToPage(n)
    if (isMobile()) setPanelOpen(false)
  }

  async function addComment() {
    const pagina = composerPage
    try {
      const d = await api(`/api/trabalhos/${id}/comentarios`, {
        method: 'POST',
        body: { pagina, texto: draft }
      })
      setT(d.trabalho)
      setDraft('')
      setLockedPage(null)
      toast(`Comentário adicionado: ${labelPagina(pagina).toLowerCase()}.`)
    } catch (e) {
      toast(e.message, { error: true })
    }
  }

  async function updateComment(c, body) {
    try {
      const d = await api(`/api/trabalhos/${id}/comentarios/${c.id}`, { method: 'PATCH', body })
      setT(d.trabalho)
      toast('Comentário actualizado.')
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
    const n = t.comentarios.length
    const partes = [
      n
        ? `${t.aluno.nome} vai passar a ver ${plural(n, 'comentário', 'comentários')}.`
        : `Ainda não escreveu comentários. ${t.aluno.nome} vai ver o trabalho como corrigido, sem comentários.`,
      'Pode continuar a editar depois — o aluno é avisado das alterações.'
    ]
    if (draft.trim()) partes.unshift('Atenção: o comentário que está a escrever ainda não foi adicionado.')
    const ok = await confirm({
      title: 'Enviar a correcção ao aluno?',
      text: partes.join(' '),
      confirmLabel: 'Enviar correcção'
    })
    if (!ok) return
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
  if (professor && t.status !== 'corrigido') {
    nota = 'Os seus comentários só ficam visíveis para o aluno depois de clicar em "Enviar correcção".'
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
            {professor ? `${t.aluno.nome} · ` : ''}Enviado {fmtDataHora(t.criadoEm)}
          </div>
        </div>
        <div className={cx(s.tTags, s.hideMobile)} style={{ marginTop: 0 }}>
          <StatusChips t={t} role={role} />
        </div>
        <div className={s.viewerActions}>
          <a className={s.iconBtn} href={downloadUrl(id)} title="Descarregar o PDF" aria-label="Descarregar o PDF">
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

      <div className={s.viewerBody}>
        <PdfViewer
          ref={pdfRef}
          url={fileUrl(id)}
          downloadHref={downloadUrl(id)}
          initialPage={initialPage}
          targetPage={professor ? composerPage : null}
          counts={counts}
          canComment={professor}
          onPageChange={setCurrentPage}
          onLoaded={onLoaded}
          onCommentPage={commentOnPage}
          onShowComments={showComments}
        />
        <CommentsPanel
          t={t}
          role={role}
          numPages={numPages}
          currentPage={currentPage}
          composerPage={composerPage}
          locked={lockedPage != null}
          onComposerPage={setLockedPage}
          onUnlock={() => setLockedPage(null)}
          draft={draft}
          onDraft={onDraft}
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
        {professor && (
          <button className={cx(s.btn, s.btnFilled)} onClick={() => commentOnPage(currentPage)}>
            <MessageSquarePlus size={18} /> Comentar pág. {currentPage}
          </button>
        )}
      </div>

      {confirmEl}
    </div>
  )
}
