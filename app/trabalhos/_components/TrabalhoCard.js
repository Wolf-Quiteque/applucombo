'use client'

import { useState } from 'react'
import {
  Check,
  Download,
  FileDown,
  FileText,
  FileUp,
  Hourglass,
  MessageSquareText,
  PenLine,
  Trash2
} from 'lucide-react'
import s from '../trabalhos.module.css'
import { downloadUrl } from './api'
import {
  descarregarComentarios,
  fmtTamanho,
  labelPaginaCurta,
  plural,
  resumoCorreccoes,
  tempoRelativo
} from './format'
import { StatusChips, cx } from './ui'

const PREVIEW = 3

// onOpen(pagina?, versao?) abre o PDF; onNovaVersao (aluno) abre o envio da versão corrigida.
export default function TrabalhoCard({ t, role, onOpen, onDelete, onNovaVersao }) {
  const professor = role === 'professor'
  const [expandido, setExpandido] = useState(false)
  const comentarios = t.comentarios
  const visiveis = expandido ? comentarios : comentarios.slice(0, PREVIEW)
  const escondidos = comentarios.length - PREVIEW
  const destaque = professor ? t.novoParaProfessor : t.novoParaAluno
  const podeApagar = professor || (t.status === 'pendente' && t.versao === 1)
  const { pedidos, confirmados } = resumoCorreccoes(t)

  const meta = [
    t.versao > 1
      ? `Versão ${t.versao} enviada ${tempoRelativo(t.versaoEm)}`
      : `Enviado ${tempoRelativo(t.criadoEm)}`,
    t.paginas ? plural(t.paginas, 'página', 'páginas') : null,
    fmtTamanho(t.ficheiro.tamanho)
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className={cx(s.tCard, destaque && s.tCardNew)}>
      <div
        className={s.tHead}
        role="button"
        tabIndex={0}
        onClick={() => onOpen()}
        onKeyDown={e => e.key === 'Enter' && onOpen()}
        title="Abrir o PDF"
      >
        <div className={s.tIcon} aria-hidden>
          <FileText size={18} />
          PDF
        </div>
        <div className={s.tTitles}>
          <h3 className={s.tTitle}>{t.titulo}</h3>
          {professor && (
            <div className={s.tMeta} style={{ color: 'var(--on-surface)', fontWeight: 500 }}>
              {t.aluno.nome}
              {t.aluno.curso && <span className={s.muted} style={{ fontWeight: 400 }}> · {t.aluno.curso}</span>}
            </div>
          )}
          <div className={s.tMeta}>{meta}</div>
          <div className={s.tTags}>
            <StatusChips t={t} role={role} />
          </div>
        </div>
      </div>

      <div className={s.tBody}>
        {t.mensagem && (
          <p className={s.tMessage} title="Mensagem do aluno">
            {professor ? 'Mensagem: ' : 'A sua mensagem: '}“{t.mensagem}”
          </p>
        )}

        {comentarios.length > 0 ? (
          <div className={s.preview}>
            <div className={s.previewHead}>
              <MessageSquareText size={14} />
              {plural(comentarios.length, 'comentário', 'comentários')}
              {pedidos > 0 && ` · ${confirmados} de ${pedidos} correcções confirmadas`}
              {professor && t.status !== 'corrigido' && t.versao === 1 && ' · o aluno ainda não os vê'}
            </div>
            {visiveis.map(c => {
              const anterior = c.versao < t.versao
              return (
                <button
                  key={c.id}
                  className={s.previewRow}
                  onClick={() => onOpen(c.pagina || undefined, anterior ? c.versao : undefined)}
                  title={
                    anterior
                      ? `Pedido na versão ${c.versao}${c.confirmado ? ' — correcção confirmada' : ' — por confirmar'}`
                      : c.pagina
                        ? `Abrir o PDF na página ${c.pagina}`
                        : 'Abrir o PDF'
                  }
                >
                  <span
                    className={cx(
                      s.pageTag,
                      c.pagina === 0 && s.pageTagGeneral,
                      anterior && (c.confirmado ? s.pageTagDone : s.pageTagOpen)
                    )}
                  >
                    {anterior && c.confirmado && <Check size={12} style={{ marginRight: 2 }} />}
                    {t.versao > 1 && `v${c.versao} · `}
                    {labelPaginaCurta(c.pagina)}
                  </span>
                  <span
                    className={s.previewText}
                    style={expandido ? { whiteSpace: 'pre-wrap', overflow: 'visible' } : undefined}
                  >
                    {c.texto}
                  </span>
                </button>
              )
            })}
            {escondidos > 0 && (
              <button className={s.previewMore} onClick={() => setExpandido(v => !v)}>
                {expandido ? 'Mostrar menos' : `Ver todos os comentários (+${escondidos})`}
              </button>
            )}
          </div>
        ) : (
          <div className={s.previewEmpty}>
            <Hourglass size={16} />
            {professor
              ? 'Ainda sem comentários.'
              : 'O professor ainda não corrigiu. Os comentários vão aparecer aqui.'}
          </div>
        )}

        {professor && t.rascunho && (
          <button
            className={s.draftRow}
            onClick={() => onOpen(t.rascunho.pagina || undefined)}
            title="Abrir e continuar a escrever"
          >
            <PenLine size={14} style={{ flexShrink: 0 }} />
            <span className={s.previewText}>
              Por terminar ({labelPaginaCurta(t.rascunho.pagina)}): “{t.rascunho.texto}”
            </span>
          </button>
        )}

        {!professor && t.status === 'corrigido' && onNovaVersao && (
          <div className={s.nextStep}>
            <span style={{ flex: '1 1 200px' }}>
              Já fez as correcções? Envie o PDF novo — o professor confirma cada uma.
            </span>
            <button className={cx(s.btn, s.btnTonal, s.btnSmall)} onClick={onNovaVersao}>
              <FileUp size={16} /> Enviar versão corrigida
            </button>
          </div>
        )}
      </div>

      <div className={s.tActions}>
        <button className={cx(s.btn, s.btnFilled, s.btnSmall)} onClick={() => onOpen()}>
          {professor
            ? t.status === 'corrigido'
              ? 'Abrir'
              : t.versao > 1
                ? 'Abrir e confirmar'
                : 'Abrir e corrigir'
            : t.status === 'corrigido'
              ? 'Ver correcção'
              : 'Abrir PDF'}
        </button>
        {comentarios.length > 0 && (
          <button
            className={cx(s.btn, s.btnText, s.btnSmall)}
            onClick={() => descarregarComentarios(t)}
            title="Descarregar os comentários num ficheiro de texto"
          >
            <Download size={16} /> Comentários
          </button>
        )}
        <span className={s.tActionIcons}>
          <a
            className={s.iconBtn}
            href={downloadUrl(t.id)}
            title={t.versao > 1 ? `Descarregar o PDF (versão ${t.versao})` : 'Descarregar o PDF'}
            aria-label="Descarregar o PDF"
          >
            <FileDown size={20} />
          </a>
          {podeApagar && onDelete && (
            <button className={s.iconBtn} onClick={onDelete} title="Apagar trabalho" aria-label="Apagar trabalho">
              <Trash2 size={20} />
            </button>
          )}
        </span>
      </div>
    </article>
  )
}
