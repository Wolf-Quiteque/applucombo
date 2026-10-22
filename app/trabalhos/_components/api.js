'use client'

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  })
  let data = null
  try {
    data = await res.json()
  } catch {}
  if (!res.ok) {
    const err = new Error(data?.error || 'Algo correu mal. Tente novamente.')
    err.status = res.status
    throw err
  }
  return data
}

// XMLHttpRequest para termos a percentagem de envio.
function xhr({ method, url, body, headers = {}, onProgress }) {
  return new Promise(resolve => {
    const req = new XMLHttpRequest()
    req.open(method, url)
    Object.entries(headers).forEach(([k, v]) => req.setRequestHeader(k, v))
    req.upload.onprogress = e => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total)
    }
    req.onload = () => resolve({ status: req.status, text: req.responseText })
    req.onerror = () => resolve({ status: 0, text: '' })
    req.send(body)
  })
}

// 1) tenta enviar directo para o R2 (rápido, sem limite de tamanho)
// 2) se falhar, envia pelo servidor
export async function uploadTrabalho(file, { titulo, mensagem }, onProgress) {
  const { key, url } = await api('/api/trabalhos/upload', {
    method: 'POST',
    body: { tamanho: file.size }
  })

  const direct = await xhr({
    method: 'PUT',
    url,
    body: file,
    headers: { 'Content-Type': 'application/pdf' },
    onProgress: p => onProgress?.(p * 0.97)
  })

  if (direct.status >= 200 && direct.status < 300) {
    const data = await api('/api/trabalhos', {
      method: 'POST',
      body: { key, titulo, mensagem, nomeFicheiro: file.name }
    })
    onProgress?.(1)
    return data.trabalho
  }

  onProgress?.(0)
  const form = new FormData()
  form.append('file', file)
  form.append('titulo', titulo || '')
  form.append('mensagem', mensagem || '')
  const res = await xhr({ method: 'POST', url: '/api/trabalhos', body: form, onProgress })

  let data = null
  try {
    data = JSON.parse(res.text)
  } catch {}
  if (res.status === 201 && data?.trabalho) return data.trabalho
  if (res.status === 413) {
    throw new Error('O ficheiro é demasiado grande para ser enviado agora. Tente um PDF mais pequeno.')
  }
  throw new Error(data?.error || 'Não foi possível enviar o trabalho. Verifique a internet e tente outra vez.')
}

export const fileUrl = id => `/api/trabalhos/${id}/ficheiro`
export const downloadUrl = id => `/api/trabalhos/${id}/ficheiro?download=1`
