'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Eye, EyeOff, GraduationCap, ShieldCheck } from 'lucide-react'
import s from '../trabalhos.module.css'
import { api } from './api'
import { TextField, cx } from './ui'

export default function LoginScreen({ tipo, onDone }) {
  const professor = tipo === 'professor'
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [ver, setVer] = useState(false)
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState('')

  async function submit(e) {
    e.preventDefault()
    setErro('')
    setBusy(true)
    try {
      const d = await api('/api/trabalhos/sessao', { method: 'POST', body: { tipo, telefone, senha } })
      onDone(d.sessao)
    } catch (err) {
      setErro(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={s.loginWrap}>
      <div className={s.loginCard}>
        <div className={s.loginIcon}>
          {professor ? <ShieldCheck size={28} /> : <GraduationCap size={28} />}
        </div>
        <h1 className={s.loginTitle}>{professor ? 'Área do professor' : 'Os meus trabalhos'}</h1>
        <p className={s.loginText}>
          {professor
            ? 'Entre para ver e corrigir os trabalhos enviados pelos alunos.'
            : 'Entre com a mesma conta que usa na Mentoria (telefone e palavra-passe).'}
        </p>

        <form className={s.loginForm} onSubmit={submit}>
          <TextField
            label={professor ? 'Email ou telefone' : 'Número de telefone'}
            type={professor ? 'text' : 'tel'}
            inputMode={professor ? 'email' : 'tel'}
            autoCapitalize="none"
            autoComplete="username"
            value={telefone}
            onChange={e => setTelefone(e.target.value)}
            placeholder={professor ? 'Ex.: nome@email.com' : 'Ex.: 923 000 000'}
            autoFocus
            required
          />
          <TextField
            label="Palavra-passe"
            type={ver ? 'text' : 'password'}
            autoComplete="current-password"
            value={senha}
            onChange={e => setSenha(e.target.value)}
            required
            trailing={
              <button
                type="button"
                className={s.iconBtn}
                onClick={() => setVer(v => !v)}
                aria-label={ver ? 'Esconder palavra-passe' : 'Mostrar palavra-passe'}
                title={ver ? 'Esconder' : 'Mostrar'}
              >
                {ver ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            }
          />

          {erro && (
            <div className={s.errorBox} role="alert" style={{ marginTop: 0 }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{erro}</span>
            </div>
          )}

          <button className={cx(s.btn, s.btnFilled, s.btnBlock)} disabled={busy} style={{ height: 48 }}>
            {busy && <span className={cx(s.spinner, s.spinnerSmall)} />}
            {busy ? 'A entrar…' : 'Entrar'}
          </button>
        </form>

        <div className={s.loginFoot}>
          {professor ? (
            <>
              É aluno? <Link href="/trabalhos">Entrar como aluno</Link>
            </>
          ) : (
            <>
              Ainda não tem conta? <Link href="/mentoring">Crie na Mentoria</Link>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
