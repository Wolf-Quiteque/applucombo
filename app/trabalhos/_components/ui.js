'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { Check, Clock, LogOut, PenLine, Sparkles, X } from 'lucide-react'
import s from '../trabalhos.module.css'
import { api } from './api'
import { iniciais } from './format'

export const cx = (...names) => names.filter(Boolean).join(' ')

/* ---------- Snackbar ---------- */
const ToastCtx = createContext(() => {})

export function Toaster({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((message, opts = {}) => {
    clearTimeout(timer.current)
    setToast({ message, ...opts, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), opts.duration || 4500)
  }, [])

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.key}
          role="status"
          aria-live="polite"
          className={cx(s.snackbar, toast.error && s.snackbarError)}
        >
          <span style={{ flex: 1 }}>{toast.message}</span>
          {toast.action && (
            <button
              className={cx(s.btn, s.btnText, s.btnSmall)}
              onClick={() => {
                toast.action.onClick()
                setToast(null)
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button className={cx(s.iconBtn, s.iconBtnSmall)} style={{ color: 'inherit' }} onClick={() => setToast(null)} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
      )}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)

/* ---------- Session ---------- */
export function useSession() {
  const [state, setState] = useState({ loading: true, sessao: null })

  useEffect(() => {
    let alive = true
    api('/api/trabalhos/sessao')
      .then(d => alive && setState({ loading: false, sessao: d.sessao }))
      .catch(() => alive && setState({ loading: false, sessao: null }))
    return () => {
      alive = false
    }
  }, [])

  const setSessao = useCallback(sessao => setState({ loading: false, sessao }), [])
  const logout = useCallback(async () => {
    await api('/api/trabalhos/sessao', { method: 'DELETE' }).catch(() => {})
    setState({ loading: false, sessao: null })
  }, [])

  return { ...state, setSessao, logout }
}

/* ---------- Dialogs ---------- */
export function Dialog({ open, onClose, title, children, actions, small, busy }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => {
      if (e.key === 'Escape' && !busy) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, busy])

  if (!open) return null
  return (
    <div
      className={s.scrim}
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onClose?.()
      }}
    >
      <div className={cx(s.dialog, small && s.dialogSmall)} role="dialog" aria-modal="true" aria-label={title}>
        {title && <h2 className={s.dialogTitle}>{title}</h2>}
        {children}
        {actions && <div className={s.dialogActions}>{actions}</div>}
      </div>
    </div>
  )
}

// const [confirmEl, confirm] = useConfirm();  if (await confirm({...})) ...
export function useConfirm() {
  const [req, setReq] = useState(null)

  const confirm = useCallback(
    opts => new Promise(resolve => setReq({ ...opts, resolve })),
    []
  )

  const close = value => {
    req?.resolve(value)
    setReq(null)
  }

  const el = (
    <Dialog
      open={!!req}
      small
      title={req?.title}
      onClose={() => close(false)}
      actions={
        <>
          <button className={cx(s.btn, s.btnText)} onClick={() => close(false)}>
            {req?.cancelLabel || 'Cancelar'}
          </button>
          <button
            className={cx(s.btn, req?.danger ? s.btnDanger : s.btnFilled)}
            onClick={() => close(true)}
            autoFocus
          >
            {req?.confirmLabel || 'Confirmar'}
          </button>
        </>
      }
    >
      {req?.text && <p className={s.dialogText}>{req.text}</p>}
    </Dialog>
  )

  return [el, confirm]
}

/* ---------- Top bar ---------- */
export function TopBar({ icon, title, subtitle, children }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={cx(s.topBar, scrolled && s.topBarScrolled)}>
      <div className={s.topBarInner}>
        {icon && <div className={s.brandIcon}>{icon}</div>}
        <div className={s.topTitles}>
          <h1 className={s.topTitle}>{title}</h1>
          {subtitle && <div className={s.topSub}>{subtitle}</div>}
        </div>
        {children}
      </div>
    </header>
  )
}

export function UserMenu({ nome, onLogout }) {
  return (
    <>
      <div className={s.userChip} title={nome}>
        <span>{nome}</span>
        <div className={s.avatar}>{iniciais(nome)}</div>
      </div>
      <button className={s.iconBtn} onClick={onLogout} title="Sair" aria-label="Sair">
        <LogOut size={20} />
      </button>
    </>
  )
}

/* ---------- Status ---------- */
// O professor já começou a rever a versão actual? (comentários novos, rascunho ou confirmações)
function emRevisao(t) {
  const desde = new Date(t.versaoEm).getTime()
  return (
    !!t.rascunho ||
    t.comentarios.some(
      c => c.versao === t.versao || (c.confirmadoEm && new Date(c.confirmadoEm).getTime() >= desde)
    )
  )
}

export function StatusChips({ t, role }) {
  const chips = []
  if (t.status === 'corrigido') {
    if (role === 'aluno' && t.novoParaAluno) {
      chips.push(
        <span key="s" className={cx(s.status, s.statusNew)}>
          <Sparkles size={14} /> Correcção nova
        </span>
      )
    } else {
      chips.push(
        <span key="s" className={cx(s.status, s.statusDone)}>
          <Check size={14} /> Corrigido
        </span>
      )
    }
  } else if (role === 'professor' && emRevisao(t)) {
    chips.push(
      <span key="s" className={cx(s.status, s.statusDraft)} title="Já começou, mas o aluno ainda não vê.">
        <PenLine size={14} /> Em correcção
      </span>
    )
  } else {
    chips.push(
      <span key="s" className={cx(s.status, s.statusPending)}>
        <Clock size={14} /> {role === 'professor' ? 'Por corrigir' : 'Aguarda correcção'}
      </span>
    )
  }
  if (role === 'professor' && t.novoParaProfessor) {
    chips.push(
      <span key="n" className={cx(s.status, s.statusNew)}>
        {t.versao > 1 ? 'Nova versão' : 'Novo'}
      </span>
    )
  }
  if (t.versao > 1) {
    chips.push(
      <span key="v" className={cx(s.status, s.statusNeutral)} title={`O aluno já enviou ${t.versao} versões`}>
        Versão {t.versao}
      </span>
    )
  }
  return <>{chips}</>
}

/* ---------- How it works ---------- */
export function Steps({ items, active }) {
  return (
    <ol className={s.steps} aria-label="Como funciona" style={{ listStyle: 'none', margin: '8px 0 0' }}>
      {items.map((item, i) => (
        <li key={item.title} className={cx(s.step, i === active && s.stepActive)}>
          <span className={s.stepNum}>{i + 1}</span>
          <div>
            <div className={s.stepTitle}>{item.title}</div>
            <div className={s.stepText}>{item.text}</div>
          </div>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Empty state ---------- */
export function EmptyState({ icon, title, text, action }) {
  return (
    <div className={s.empty}>
      <div className={s.emptyIcon}>{icon}</div>
      <div className={s.emptyTitle}>{title}</div>
      {text && <p className={s.emptyText}>{text}</p>}
      {action}
    </div>
  )
}

export function Loading({ label = 'A carregar…' }) {
  return (
    <div className={s.center}>
      <div className={s.spinner} />
      <div>{label}</div>
    </div>
  )
}

/* ---------- Text field (outlined) ---------- */
export function TextField({ label, hint, multiline, trailing, id, ...props }) {
  const Tag = multiline ? 'textarea' : 'input'
  const fieldId = id || `f-${label?.replace(/\W+/g, '-').toLowerCase()}`
  return (
    <div>
      <div className={s.field}>
        <Tag
          id={fieldId}
          className={s.fieldInput}
          placeholder={props.placeholder || ' '}
          style={trailing ? { paddingRight: 52 } : undefined}
          {...props}
        />
        <label htmlFor={fieldId} className={s.fieldLabel}>
          {label}
        </label>
        {trailing && <div className={s.fieldTrailing}>{trailing}</div>}
      </div>
      {hint && <div className={s.fieldHint}>{hint}</div>}
    </div>
  )
}

export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}

// Quando alguém abre a área errada (ex.: professor na página do aluno).
export function WrongRole({ sessao, onLogout, href, label }) {
  return (
    <div className={s.loginWrap}>
      <div className={s.loginCard} style={{ textAlign: 'center' }}>
        <h1 className={s.loginTitle}>Já tem sessão iniciada</h1>
        <p className={s.loginText}>
          Entrou como <b>{sessao.role === 'professor' ? 'professor' : sessao.nome}</b>. Esta página é para outro tipo
          de conta.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <a className={cx(s.btn, s.btnFilled)} href={href}>
            {label}
          </a>
          <button className={cx(s.btn, s.btnText)} onClick={onLogout}>
            Sair e entrar com outra conta
          </button>
        </div>
      </div>
    </div>
  )
}
