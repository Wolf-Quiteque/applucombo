// app/lib/r2.js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

function required(name) {
  const v = process.env[name]
  if (!v) throw new Error('Defina a variável de ambiente ' + name)
  return v
}

function stripTrailingSlash(input) {
  let s = input || ''
  while (s.endsWith('/')) s = s.slice(0, -1)
  return s
}

const R2_ENDPOINT = required('R2_ENDPOINT')
const R2_ACCESS_KEY_ID = required('R2_ACCESS_KEY_ID')
const R2_SECRET_ACCESS_KEY = required('R2_SECRET_ACCESS_KEY')
const R2_BUCKET_NAME = required('R2_BUCKET_NAME')
const R2_PUBLIC_URL = stripTrailingSlash(required('R2_PUBLIC_URL'))

export const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
})

export function publicUrl(key) {
  return `${R2_PUBLIC_URL}/${key}`
}

export async function uploadBuffer({ key, body, contentType, cacheControl }) {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl || 'public, max-age=31536000'
    })
  )

  return {
    key,
    url: publicUrl(key)
  }
}
