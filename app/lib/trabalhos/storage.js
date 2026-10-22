// Ficheiros dos trabalhos no Cloudflare R2 (privados: só se acedem pela API).

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export const MAX_PDF_BYTES = 50 * 1024 * 1024 // 50 MB

let client

function env(name) {
  const value = process.env[name]
  if (!value) throw new Error('Defina a variável de ambiente ' + name)
  return value
}

function getClient() {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: env('R2_ENDPOINT'),
      credentials: {
        accessKeyId: env('R2_ACCESS_KEY_ID'),
        secretAccessKey: env('R2_SECRET_ACCESS_KEY')
      },
      // Evita checksums automáticos que partem os links assinados no R2.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED'
    })
  }
  return client
}

const bucket = () => env('R2_BUCKET_NAME')

export function newPdfKey(alunoId) {
  return `trabalhos/${alunoId}/${Date.now()}-${crypto.randomUUID()}.pdf`
}

// Link para o browser enviar o PDF directamente para o R2.
export function presignUpload(key) {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: 'application/pdf' }),
    { expiresIn: 60 * 15 }
  )
}

// Link temporário para descarregar o PDF com o nome original.
export function presignDownload(key, filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '')
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({
      Bucket: bucket(),
      Key: key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    }),
    { expiresIn: 60 * 5 }
  )
}

export async function putPdf(key, body) {
  await getClient().send(
    new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: 'application/pdf' })
  )
}

export async function headObject(key) {
  try {
    return await getClient().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }))
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === 'NotFound') return null
    throw err
  }
}

// range: valor do cabeçalho HTTP Range (ex.: "bytes=0-65535") ou undefined.
export function getObject(key, range) {
  return getClient().send(new GetObjectCommand({ Bucket: bucket(), Key: key, Range: range }))
}

export async function startsWithPdfSignature(key) {
  const obj = await getObject(key, 'bytes=0-4')
  const bytes = await obj.Body.transformToByteArray()
  return Buffer.from(bytes).toString('latin1').startsWith('%PDF')
}

export async function deleteObject(key) {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }))
  } catch (err) {
    console.error('Falha ao apagar ficheiro do R2:', key, err?.message)
  }
}
