'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  ChevronLeft,
  History,
  ChevronRight,
  Download,
  Hourglass,
  Link2,
  Link2Off,
  MessageSquareText,
  Pencil,
  Send,
  Trash2,
  X
} from 'lucide-react'
import s from '../trabalhos.module.css'
import { agruparComentarios, descarregarComentarios, labelPagina, plural, tempoRelativo } from './format'
import { cx } from './ui'

function PageStepper({ value, max, onChange }) {
  return (
    <span className={s.composerPage}>
      <button
        type="button"
        className={s.iconBtn}
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label="Página anterior"
        title="Página anterior"
      >
        <ChevronLeft size={16} />
      </button>
      <span>{labelPagina(value)}</span>
      <button
        type="button"
        className={s.iconBtn}
        onClick={() => onChange(Math.min(max || 1, value + 1))}
        disabled={value >= (max || 1)}
        aria-label="Página seguinte"
        title="Página seguinte"
      >
        <ChevronRight size={16} />
      </button>
    </span>
  )
}

function SaveStatus({ state, onRetry }) {
  const box = { flex: 1, display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 0 }
  if (state === 'pending' || state === 'saving') return <span style={box}>A guardar…</span>
  if (state === 'saved') {
    return (
      <span style={box} title="Fica guardado mesmo que saia. Clique em Adicionar para o pôr na lista.">
        <Check size={14} /> Guardado automaticamente
      </span>
    )
  }
  if (state === 'restored') {
    return (
      <span style={{ ...box, color: 'var(--primary)' }}>
        <History size={14} /> Recuperámos o que estava a escrever
      </span>
    )
  }
  if (state === 'error') {
    return (
      <span style={{ ...box, color: 'var(--error)' }}>
        <AlertCircle size={14} /> Não guardado.
        <button className={cx(s.btn, s.btnText, s.btnSmall)} style={{ height: 24, padding: '0 6px' }} onClick={onRetry}>
          Tentar outra vez
        </button>
      </span>
    )
  }
  return (
    <span style={box}>
      <span className={s.hideMobile}>Guarda sozinho · Ctrl + Enter para adicionar</span>
      <span className={s.onlyMobile}>Guarda sozinho enquanto escreve</span>
    </span>
  )
}

function Comment({ c, editable, numPages, onGoto, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [texto, setTexto] = useState(c.texto)
  const [pagina, setPagina] = useState(c.pagina)
  const [estado, setEstado] = useState('') // '' | pending | saving | saved | error
  const original = useRef(null)
  const latest = useRef({ texto, pagina, c })
  latest.current = { texto, pagina, c }

  // A mudança de página só se aplica ao concluir (senão o comentário saltava de grupo a meio da edição).
  const mudou = () => {
    const l = latest.current
    return !!l.texto.trim() && (l.texto !== l.c.texto || l.pagina !== l.c.pagina)
  }

  // Guardar o texto sozinho 0,8 s depois de parar de escrever
  useEffect(() => {
    if (!editing || !texto.trim() || texto === c.texto) return
    setEstado('pending')
    const timer = setTimeout(async () => {
      setEstado('saving')
      const ok = await onUpdate(c, { texto, pagina: c.pagina }, { silent: true })
      setEstado(ok ? 'saved' : 'error')
    }, 800)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, texto, c.texto])

  // Se sair da página a meio de uma edição, guarda o que lá está
  useEffect(
    () => () => {
      if (mudou()) {
        const l = latest.current
        onUpdate(l.c, { texto: l.texto, pagina: l.pagina }, { silent: true })
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  async function concluir() {
    if (mudou()) {
      setEstado('saving')
      const ok = await onUpdate(c, { texto, pagina }, { silent: true })
      if (!ok) return setEstado('error')
    }
    setEditing(false)
  }

  async function cancelar() {
    const o = original.current
    if (o && (c.texto !== o.texto || c.pagina !== o.pagina)) {
      await onUpdate(c, o, { silent: true })
    }
    setTexto(o?.texto ?? c.texto)
    setPagina(o?.pagina ?? c.pagina)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className={s.comment}>
        <div className={s.commentEdit}>
          <div className={s.composerHead} style={{ marginBottom: 0 }}>
            Página: <PageStepper value={pagina} max={numPages} onChange={setPagina} />
          </div>
          <textarea
            className={s.composerText}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            ref={el => {
              // Ao abrir a edição: foco com o cursor no fim do texto
              if (el && !el.dataset.focado) {
                el.dataset.focado = '1'
                el.focus()
                el.setSelectionRange(el.value.length, el.value.length)
              }
            }}
            onKeyDown={e => {
              if ((e.key === 'Enter' && (e.metaKey || e.ctrlKey)) || e.key === 'Escape') concluir()
            }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--on-surface-variant)' }}>
            <span style={{ flex: 1 }}>
              {estado === 'pending' || estado === 'saving'
                ? 'A guardar…'
                : estado === 'saved'
                  ? 'Guardado automaticamente'
                  : estado === 'error'
                    ? 'Não guardado — verifique a internet'
                    : 'As alterações guardam-se sozinhas'}
            </span>
            <button className={cx(s.btn, s.btnText, s.btnSmall)} onClick={cancelar} title="Voltar ao texto original">
              Cancelar
            </button>
            <button className={cx(s.btn, s.btnFilled, s.btnSmall)} onClick={concluir} disabled={!texto.trim()}>
              Concluído
            </button>
          </div>
        </div>
      </div>
    )
  }

  const editado = c.actualizadoEm && c.criadoEm && new Date(c.actualizadoEm) - new Date(c.criadoEm) > 1000

  return (
    <div className={s.comment}>
      <div className={s.commentText}>{c.texto}</div>
      <div className={s.commentFoot}>
        <span style={{ flex: 1 }}>
          {tempoRelativo(c.actualizadoEm || c.criadoEm)}
          {editado && ' · editado'}
        </span>
        {c.pagina > 0 && (
          <button
            className={cx(s.btn, s.btnText, s.btnSmall)}
            style={{ height: 28 }}
            onClick={() => onGoto(c.pagina)}
          >
            Ver página
          </button>
        )}
        {editable && (
          <>
            <button
              className={cx(s.iconBtn, s.iconBtnSmall)}
              onClick={() => {
                original.current = { texto: c.texto, pagina: c.pagina }
                setTexto(c.texto)
                setPagina(c.pagina)
                setEstado('')
                setEditing(true)
              }}
              title="Editar"
              aria-label="Editar comentário"
            >
              <Pencil size={16} />
            </button>
            <button
              className={cx(s.iconBtn, s.iconBtnSmall)}
              onClick={() => onDelete(c)}
              title="Apagar"
              aria-label="Apagar comentário"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CommentsPanel({
  t,
  role,
  numPages,
  currentPage,
  composerPage,
  locked,
  onComposerPage,
  onUnlock,
  draft,
  onDraft,
  saveState,
  onRetrySave,
  textareaRef,
  focusGroup,
  open,
  onClose,
  onGoto,
  onAdd,
  onUpdate,
  onDelete
}) {
  const professor = role === 'professor'
  const groups = agruparComentarios(t.comentarios)
  const groupEls = useRef(new Map())
  const [sending, setSending] = useState(false)

  // Mostrar o grupo de uma página quando se clica no contador da página
  useEffect(() => {
    if (!focusGroup) return
    const el = groupEls.current.get(focusGroup.page)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focusGroup])

  async function send() {
    if (!draft.trim() || sending) return
    setSending(true)
    await onAdd()
    setSending(false)
  }

  return (
    <>
      {open && <div className={s.sheetScrim} onClick={onClose} />}
      <aside className={cx(s.panel, open && s.panelOpen)} aria-label="Comentários">
        <div className={s.panelHead}>
          <MessageSquareText size={20} style={{ color: 'var(--primary)' }} />
          <div className={s.panelTitle}>
            {professor ? 'Comentários' : 'Comentários do professor'}
            {t.comentarios.length > 0 && <span className={s.muted}> ({t.comentarios.length})</span>}
          </div>
          {t.comentarios.length > 0 && (
            <button
              className={cx(s.btn, s.btnText, s.btnSmall)}
              onClick={() => descarregarComentarios(t)}
              title="Descarregar os comentários num ficheiro de texto"
            >
              <Download size={16} /> Descarregar
            </button>
          )}
          <button className={cx(s.iconBtn, s.panelClose)} onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {professor && (
          <div className={s.composer}>
            <div className={s.composerHead}>
              Comentar na
              <PageStepper value={composerPage} max={numPages} onChange={onComposerPage} />
              <span className={s.spacer} />
              {locked ? (
                <button
                  className={cx(s.btn, s.btnText, s.btnSmall)}
                  style={{ height: 28 }}
                  onClick={onUnlock}
                  title="Voltar a acompanhar a página que está a ler"
                >
                  <Link2Off size={14} /> Fixada
                </button>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }} title="Muda sozinho para a página que está a ler">
                  <Link2 size={14} /> segue a leitura
                </span>
              )}
            </div>
            <textarea
              ref={textareaRef}
              className={s.composerText}
              value={draft}
              onChange={e => onDraft(e.target.value)}
              placeholder={
                composerPage === 0
                  ? 'Comentário geral sobre o trabalho…'
                  : `Escreva o que corrigir na página ${composerPage}…`
              }
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault()
                  send()
                }
              }}
            />
            <div className={s.composerFoot}>
              <SaveStatus state={saveState} onRetry={onRetrySave} />
              <button
                className={cx(s.btn, s.btnFilled, s.btnSmall)}
                onClick={send}
                disabled={!draft.trim() || sending}
              >
                <Send size={16} /> Adicionar
              </button>
            </div>
          </div>
        )}

        <div className={s.groups}>
          {!professor && t.status !== 'corrigido' ? (
            <div className={s.panelEmpty}>
              <Hourglass size={32} />
              <div style={{ fontWeight: 500, color: 'var(--on-surface)' }}>Ainda não foi corrigido</div>
              <div>Quando o professor terminar a correcção, os comentários de cada página aparecem aqui.</div>
            </div>
          ) : groups.length === 0 ? (
            <div className={s.panelEmpty}>
              <MessageSquareText size={32} />
              {professor ? (
                <>
                  <div style={{ fontWeight: 500, color: 'var(--on-surface)' }}>Ainda sem comentários</div>
                  <div>
                    Leia o PDF e escreva no campo acima. O comentário fica ligado à página que está a ver
                    — ou clique em <b>Comentar</b> por cima de uma página.
                  </div>
                </>
              ) : (
                <div>O professor não deixou comentários neste trabalho.</div>
              )}
            </div>
          ) : (
            groups.map(g => (
              <section
                key={g.pagina}
                ref={el => {
                  if (el) groupEls.current.set(g.pagina, el)
                  else groupEls.current.delete(g.pagina)
                }}
                className={cx(s.group, g.pagina === currentPage && s.groupActive)}
              >
                <button
                  className={s.groupHead}
                  onClick={() => g.pagina > 0 && onGoto(g.pagina)}
                  title={g.pagina > 0 ? `Ir para a página ${g.pagina}` : undefined}
                >
                  <span className={cx(s.pageTag, g.pagina === 0 && s.pageTagGeneral)}>{labelPagina(g.pagina)}</span>
                  <span style={{ flex: 1 }}>{plural(g.itens.length, 'comentário', 'comentários')}</span>
                  {g.pagina === currentPage && <span style={{ color: 'var(--primary)' }}>a ler agora</span>}
                </button>
                {g.itens.map(c => (
                  <Comment
                    key={c.id}
                    c={c}
                    editable={professor}
                    numPages={numPages}
                    onGoto={onGoto}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                  />
                ))}
              </section>
            ))
          )}
        </div>
      </aside>
    </>
  )
}
