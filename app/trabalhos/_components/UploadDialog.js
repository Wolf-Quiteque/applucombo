'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertCircle, FileText, Lightbulb, UploadCloud, X } from 'lucide-react'
import s from '../trabalhos.module.css'
import { uploadTrabalho, uploadVersao } from './api'
import { fmtTamanho } from './format'
import { Dialog, TextField, cx } from './ui'

const MAX = 50 * 1024 * 1024

function tituloDoFicheiro(nome) {
  return nome.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim()
}

// `trabalho` definido = enviar a versão corrigida desse trabalho.
export default function UploadDialog({ open, onClose, onUploaded, trabalho }) {
  const novaVersao = trabalho ? trabalho.versao + 1 : null
  const [file, setFile] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [erro, setErro] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setFile(null)
      setTitulo('')
      setMensagem('')
      setErro('')
      setProgress(0)
      setBusy(false)
    }
  }, [open])

  function escolher(f) {
    if (!f) return
    if (!(f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) {
      setErro('Escolha um ficheiro PDF. Se o trabalho está em Word, abra-o e use "Guardar como" → PDF.')
      return
    }
    if (f.size > MAX) {
      setErro(`O PDF tem ${fmtTamanho(f.size)}. O máximo é 50 MB.`)
      return
    }
    setErro('')
    setFile(f)
    if (!trabalho) setTitulo(prev => prev || tituloDoFicheiro(f.name))
  }

  async function enviar() {
    if (!file) return
    setErro('')
    setBusy(true)
    setProgress(0)
    try {
      const t = trabalho
        ? await uploadVersao(trabalho.id, file, { mensagem }, setProgress)
        : await uploadTrabalho(file, { titulo, mensagem }, setProgress)
      onUploaded(t)
    } catch (err) {
      setErro(err.message)
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={trabalho ? 'Enviar versão corrigida' : 'Enviar trabalho'}
      actions={
        <>
          <button className={cx(s.btn, s.btnText)} onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className={cx(s.btn, s.btnFilled)} onClick={enviar} disabled={!file || busy}>
            {busy ? (
              <>
                <span className={cx(s.spinner, s.spinnerSmall)} /> A enviar…
              </>
            ) : (
              <>
                <UploadCloud size={18} /> {trabalho ? `Enviar versão ${novaVersao}` : 'Enviar ao professor'}
              </>
            )}
          </button>
        </>
      }
    >
      <div className={s.dialogBody}>
        {trabalho && (
          <div className={s.tip}>
            <Lightbulb size={16} />
            <span>
              <b>{trabalho.titulo}</b> — escolha o PDF já com as correcções feitas. Os comentários do professor
              ficam guardados como estão, e ele vai confirmar cada correcção na versão {novaVersao}.
            </span>
          </div>
        )}
        {!file ? (
          <div
            className={cx(s.drop, drag && s.dropActive)}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault()
              setDrag(true)
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => {
              e.preventDefault()
              setDrag(false)
              escolher(e.dataTransfer.files?.[0])
            }}
          >
            <div className={s.dropIcon}>
              <UploadCloud size={28} />
            </div>
            <div className={s.dropTitle}>{trabalho ? 'Escolha o PDF corrigido' : 'Escolha o PDF do trabalho'}</div>
            <div className={s.muted}>Clique aqui ou arraste o ficheiro para esta caixa</div>
            <div className={s.muted} style={{ fontSize: 12 }}>
              Apenas PDF · até 50 MB
            </div>
          </div>
        ) : (
          <div className={s.fileRow}>
            <div className={s.tIcon} aria-hidden>
              <FileText size={16} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className={s.fileName}>{file.name}</div>
              <div className={s.muted} style={{ fontSize: 12 }}>
                {fmtTamanho(file.size)}
              </div>
            </div>
            {!busy && (
              <button
                className={s.iconBtn}
                onClick={() => setFile(null)}
                title="Escolher outro ficheiro"
                aria-label="Escolher outro ficheiro"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={e => {
            escolher(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        {!trabalho && (
          <TextField
            label="Título do trabalho"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            maxLength={200}
            disabled={busy}
            hint="Ex.: Capítulo 2 — Revisão da literatura"
          />
        )}
        <TextField
          label={trabalho ? 'O que mudou? (opcional)' : 'Mensagem para o professor (opcional)'}
          multiline
          rows={3}
          value={mensagem}
          onChange={e => setMensagem(e.target.value)}
          maxLength={2000}
          disabled={busy}
        />

        {busy && (
          <div>
            <div className={s.progressLabel}>
              <span>A enviar o ficheiro…</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className={s.progress}>
              <div className={s.progressBar} style={{ width: `${Math.max(3, progress * 100)}%` }} />
            </div>
          </div>
        )}

        {erro && (
          <div className={s.errorBox} role="alert" style={{ marginTop: 0 }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{erro}</span>
          </div>
        )}

        {!busy && !erro && !trabalho && (
          <div className={s.tip}>
            <Lightbulb size={16} />
            <span>Depois de enviar, o professor lê o PDF e deixa comentários por página. Vai vê-los nesta página.</span>
          </div>
        )}
      </div>
    </Dialog>
  )
}
