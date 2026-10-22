// Sessão simples para a área de Trabalhos (aluno ou professor).
// Guardada num cookie httpOnly assinado com HMAC (SESSION_SECRET).

import crypto from 'node:crypto'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const COOKIE_NAME = 'trabalhos_sessao'
const MAX_AGE = 60 * 60 * 24 * 14 // 14 dias

function getSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('Defina SESSION_SECRET no .env (pelo menos 16 caracteres).')
  }
  return secret
}

function sign(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url')
}

function createToken(session) {
  const payload = Buffer.from(
    JSON.stringify({ ...session, exp: Date.now() + MAX_AGE * 1000 })
  ).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function readToken(token) {
  if (!token || typeof token !== 'string') return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  const a = Buffer.from(sig)
  const b = Buffer.from(sign(payload))
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.exp || data.exp < Date.now()) return null
    return data
  } catch {
    return null
  }
}

export async function getSession() {
  const store = await cookies()
  return readToken(store.get(COOKIE_NAME)?.value)
}

export function setSessionCookie(res, session) {
  res.cookies.set(COOKIE_NAME, createToken(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: MAX_AGE
  })
}

export function clearSessionCookie(res) {
  res.cookies.set(COOKIE_NAME, '', { path: '/', maxAge: 0 })
}

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

// Devolve { session } ou { error } (resposta pronta a devolver).
export async function requireSession(role) {
  const session = await getSession()
  if (!session) return { error: jsonError('A sua sessão terminou. Entre novamente.', 401) }
  if (role && session.role !== role) return { error: jsonError('Sem permissão para esta acção.', 403) }
  return { session }
}

// Compara textos sem revelar diferenças pelo tempo de resposta.
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}
