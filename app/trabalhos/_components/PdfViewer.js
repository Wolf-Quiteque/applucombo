'use client'

// Visualizador de PDF com pdf.js: desenha só as páginas perto do ecrã,
// informa a página actual e mostra quantos comentários tem cada página.

import { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileDown,
  MessageSquarePlus,
  MessageSquareText,
  Minus,
  MoveHorizontal,
  Plus
} from 'lucide-react'
import s from '../trabalhos.module.css'
import { cx } from './ui'

let pdfjsPromise = null
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.min.mjs')
      .then(lib => {
        lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs'
        return lib
      })
      .catch(err => {
        pdfjsPromise = null
        throw err
      })
  }
  return pdfjsPromise
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3]
const MAX_FIT_WIDTH = 900

function PdfPage({ doc, n, width, defaultRatio, scrollRef, target }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [ratio, setRatio] = useState(defaultRatio)
  const [drawn, setDrawn] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      root: scrollRef.current,
      rootMargin: '150% 0px'
    })
    io.observe(wrapRef.current)
    return () => io.disconnect()
  }, [scrollRef])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!visible) {
      // Liberta memória das páginas longe do ecrã.
      if (canvas) {
        canvas.width = 0
        canvas.height = 0
      }
      setDrawn(false)
      return
    }
    if (!doc || !width) return

    let cancelled = false
    let task = null
    ;(async () => {
      try {
        const page = await doc.getPage(n)
        if (cancelled) return
        const base = page.getViewport({ scale: 1 })
        setRatio(base.height / base.width)
        const viewport = page.getViewport({ scale: width / base.width })
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.floor(viewport.width * dpr)
        canvas.height = Math.floor(viewport.height * dpr)
        task = page.render({
          canvasContext: canvas.getContext('2d'),
          canvas,
          viewport,
          transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null
        })
        await task.promise
        if (!cancelled) setDrawn(true)
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') console.error('Erro na página', n, err)
      }
    })()

    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [visible, doc, n, width])

  return (
    <div
      ref={wrapRef}
      className={cx(s.page, target && s.pageTarget)}
      style={{ width, height: Math.round(width * ratio) }}
    >
      <canvas ref={canvasRef} aria-label={`Página ${n}`} />
      {!drawn && <div className={s.pageLoading}>Página {n}</div>}
    </div>
  )
}

export default function PdfViewer({
  ref,
  url,
  downloadHref,
  initialPage,
  targetPage,
  counts,
  canComment,
  onPageChange,
  onLoaded,
  onCommentPage,
  onShowComments
}) {
  const scrollRef = useRef(null)
  const pageEls = useRef(new Map())
  const callbacks = useRef({})
  callbacks.current = { onPageChange, onLoaded }

  const [doc, setDoc] = useState(null)
  const [numPages, setNumPages] = useState(0)
  const [ratio, setRatio] = useState(1.414)
  const [load, setLoad] = useState({ status: 'loading', progress: 0 })
  const [containerWidth, setContainerWidth] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [current, setCurrent] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const anchor = useRef(null)
  const initialDone = useRef(false)
  const raf = useRef(0)

  // Abrir o documento
  useEffect(() => {
    let cancelled = false
    let task = null
    setLoad({ status: 'loading', progress: 0 })
    setDoc(null)
    initialDone.current = false

    loadPdfjs()
      .then(lib => {
        if (cancelled) return null
        task = lib.getDocument({
          url,
          cMapUrl: '/pdfjs/cmaps/',
          cMapPacked: true,
          standardFontDataUrl: '/pdfjs/standard_fonts/',
          wasmUrl: '/pdfjs/wasm/',
          iccUrl: '/pdfjs/iccs/',
          isEvalSupported: false
        })
        task.onProgress = ({ loaded, total }) => {
          if (total) setLoad(st => (st.status === 'loading' ? { ...st, progress: loaded / total } : st))
        }
        return task.promise
      })
      .then(async pdf => {
        if (cancelled || !pdf) return
        const first = await pdf.getPage(1)
        const vp = first.getViewport({ scale: 1 })
        if (cancelled) return
        setRatio(vp.height / vp.width)
        setDoc(pdf)
        setNumPages(pdf.numPages)
        setLoad({ status: 'ready' })
        callbacks.current.onLoaded?.(pdf.numPages)
      })
      .catch(err => {
        if (cancelled) return
        console.error('Erro ao abrir PDF:', err)
        setLoad({
          status: 'error',
          message:
            err?.name === 'PasswordException'
              ? 'Este PDF está protegido por palavra-passe e não pode ser pré-visualizado.'
              : 'Não foi possível abrir o PDF aqui.'
        })
      })

    return () => {
      cancelled = true
      task?.destroy()
    }
  }, [url])

  // Largura disponível para as páginas (sem o padding)
  useEffect(() => {
    const el = scrollRef.current
    let t = null
    let first = true
    const measure = () => {
      const cs = getComputedStyle(el)
      setContainerWidth(el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight))
    }
    const ro = new ResizeObserver(() => {
      clearTimeout(t)
      if (first) {
        first = false
        measure()
      } else {
        t = setTimeout(measure, 120)
      }
    })
    ro.observe(el)
    return () => {
      clearTimeout(t)
      ro.disconnect()
    }
  }, [])

  const pageWidth = containerWidth
    ? Math.max(200, Math.floor(Math.min(containerWidth, MAX_FIT_WIDTH) * zoom))
    : 0

  const scrollToPage = useCallback((n, behavior = 'smooth') => {
    const el = scrollRef.current
    const p = pageEls.current.get(n)
    if (!el || !p) return
    el.scrollTo({ top: Math.max(0, p.offsetTop - 12), behavior })
  }, [])

  useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage])

  // Página inicial (ex.: ?pagina=5)
  useEffect(() => {
    if (load.status !== 'ready' || !pageWidth || initialDone.current) return
    initialDone.current = true
    if (initialPage > 1) requestAnimationFrame(() => scrollToPage(Math.min(initialPage, numPages), 'auto'))
  }, [load.status, pageWidth, initialPage, numPages, scrollToPage])

  // Manter a mesma página ao mudar o zoom
  useLayoutEffect(() => {
    if (anchor.current) {
      scrollToPage(anchor.current, 'auto')
      anchor.current = null
    }
  }, [zoom, scrollToPage])

  const changeZoom = z => {
    anchor.current = current
    setZoom(z)
  }

  const onScroll = useCallback(() => {
    if (raf.current) return
    raf.current = requestAnimationFrame(() => {
      raf.current = 0
      const el = scrollRef.current
      if (!el) return
      const mark = el.scrollTop + el.clientHeight * 0.3
      let page = 1
      for (let n = 1; n <= numPages; n++) {
        const p = pageEls.current.get(n)
        if (!p) continue
        if (p.offsetTop <= mark) page = n
        else break
      }
      setCurrent(page)
    })
  }, [numPages])

  useEffect(() => {
    setPageInput(String(current))
    callbacks.current.onPageChange?.(current)
  }, [current])

  function goToInput() {
    const n = parseInt(pageInput, 10)
    if (n >= 1 && n <= numPages) scrollToPage(n)
    else setPageInput(String(current))
  }

  const zoomIndex = ZOOMS.indexOf(zoom)

  return (
    <div className={s.pdfArea}>
      <div className={s.pdfToolbar}>
        <button
          className={cx(s.iconBtn, s.iconBtnSmall)}
          onClick={() => scrollToPage(Math.max(1, current - 1))}
          disabled={current <= 1}
          title="Página anterior"
          aria-label="Página anterior"
        >
          <ChevronUp size={18} />
        </button>
        <button
          className={cx(s.iconBtn, s.iconBtnSmall)}
          onClick={() => scrollToPage(Math.min(numPages, current + 1))}
          disabled={!numPages || current >= numPages}
          title="Página seguinte"
          aria-label="Página seguinte"
        >
          <ChevronDown size={18} />
        </button>
        <span className={s.pageCounter}>
          <span className={s.hideMobile}>Página</span>
          <input
            className={s.pageInput}
            value={pageInput}
            inputMode="numeric"
            aria-label="Ir para a página"
            title="Escreva o número da página e carregue Enter"
            onChange={e => setPageInput(e.target.value.replace(/\D/g, ''))}
            onKeyDown={e => e.key === 'Enter' && goToInput()}
            onBlur={goToInput}
            disabled={!numPages}
          />
          de {numPages || '–'}
        </span>
        <span className={s.spacer} />
        <button
          className={cx(s.iconBtn, s.iconBtnSmall)}
          onClick={() => changeZoom(ZOOMS[zoomIndex - 1])}
          disabled={zoomIndex <= 0}
          title="Diminuir"
          aria-label="Diminuir zoom"
        >
          <Minus size={18} />
        </button>
        <span className={s.zoomLabel}>{Math.round(zoom * 100)}%</span>
        <button
          className={cx(s.iconBtn, s.iconBtnSmall)}
          onClick={() => changeZoom(ZOOMS[zoomIndex + 1])}
          disabled={zoomIndex >= ZOOMS.length - 1}
          title="Aumentar"
          aria-label="Aumentar zoom"
        >
          <Plus size={18} />
        </button>
        <button
          className={cx(s.iconBtn, s.iconBtnSmall, s.hideMobile)}
          onClick={() => changeZoom(1)}
          disabled={zoom === 1}
          title="Ajustar à largura"
          aria-label="Ajustar à largura"
        >
          <MoveHorizontal size={18} />
        </button>
      </div>

      <div className={s.pdfScroll} ref={scrollRef} onScroll={onScroll}>
        {load.status === 'loading' && (
          <div className={s.center}>
            <div className={s.spinner} />
            <div>A abrir o PDF… {load.progress ? `${Math.round(load.progress * 100)}%` : ''}</div>
          </div>
        )}

        {load.status === 'error' && (
          <div className={s.pdfError}>
            <AlertTriangle size={40} />
            <div style={{ fontSize: 16, fontWeight: 500 }}>{load.message}</div>
            <div>Pode descarregar o ficheiro e abri-lo no seu computador.</div>
            {downloadHref && (
              <a className={cx(s.btn, s.btnFilled)} href={downloadHref}>
                <FileDown size={18} /> Descarregar PDF
              </a>
            )}
          </div>
        )}

        {load.status === 'ready' && pageWidth > 0 && (
          <div className={s.pages}>
            {Array.from({ length: numPages }, (_, i) => i + 1).map(n => (
              <div
                key={n}
                className={s.pageWrap}
                ref={el => {
                  if (el) pageEls.current.set(n, el)
                  else pageEls.current.delete(n)
                }}
              >
                <div className={s.pageLabelRow} style={{ width: pageWidth }}>
                  <span>Página {n}</span>
                  <span style={{ display: 'flex', gap: 6 }}>
                    {counts?.[n] > 0 && (
                      <button
                        className={s.pageBadge}
                        onClick={() => onShowComments?.(n)}
                        title="Ver os comentários desta página"
                      >
                        <MessageSquareText size={14} />
                        {counts[n]}
                      </button>
                    )}
                    {canComment && (
                      <button
                        className={s.pageAddBtn}
                        onClick={() => onCommentPage?.(n)}
                        title={`Escrever um comentário na página ${n}`}
                      >
                        <MessageSquarePlus size={14} /> Comentar
                      </button>
                    )}
                  </span>
                </div>
                <PdfPage
                  doc={doc}
                  n={n}
                  width={pageWidth}
                  defaultRatio={ratio}
                  scrollRef={scrollRef}
                  target={targetPage === n}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
