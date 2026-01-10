// app/api/mentoring/documents/route.js
import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/app/lib/mongodb'
import { uploadBuffer } from '@/app/lib/r2'

export const runtime = 'nodejs'

const MAX_FILE_BYTES = 25 * 1024 * 1024 // 25MB

function getExt(filename) {
  const idx = (filename || '').lastIndexOf('.')
  return idx === -1 ? '' : filename.slice(idx).toLowerCase()
}

function contentTypeFromExt(ext) {
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.doc') return 'application/msword'
  if (ext === '.docx') {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
  return 'application/octet-stream'
}

function sanitizeForKey(filename) {
  // apenas para o key no bucket (sem espaços estranhos)
  return (filename || 'ficheiro')
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('..', '.')
    .replaceAll('/', '_')
}



// GET /api/mentoring/documents?alunoId=...  (opcional: type=programa|monografia)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const alunoId = searchParams.get('alunoId')
    const type = searchParams.get('type')

    if (!alunoId) {
      return NextResponse.json(
        { error: 'alunoId é obrigatório.' },
        { status: 400 }
      )
    }

    const filter = { alunoId: new ObjectId(alunoId) }
    if (type) filter.type = type

    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const docs = await col
      .find(filter)
      .sort({ updatedAt: -1 })
      .toArray()

    const documents = docs.map(d => ({
      id: d._id.toString(),
      alunoId: d.alunoId.toString(),
      type: d.type,
      version: d.version || 1,
      original: d.original || null,
      pdf: d.pdf || null,
      pdfConversionError: d.pdfConversionError || null,
      studentNote: d.studentNote || '',
      teacherNote: d.teacherNote || '',
      teacherUnread: !!d.teacherUnread,
      teacherLastOpenedAt: d.teacherLastOpenedAt || null,
      createdAt: d.createdAt || null,
      updatedAt: d.updatedAt || null
    }))

    return NextResponse.json({ documents }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar documentos:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar documentos.' },
      { status: 500 }
    )
  }
}

// POST /api/mentoring/documents
// form-data: alunoId, type (programa|monografia), note (opcional), file (opcional)
export async function POST(request) {
  try {
    const form = await request.formData()
    const alunoId = form.get('alunoId')
    const type = form.get('type')
    const note = (form.get('note') || '').toString()
    const file = form.get('file') // File | null

    if (!alunoId || !type) {
      return NextResponse.json(
        { error: 'alunoId e type são obrigatórios.' },
        { status: 400 }
      )
    }

    if (type !== 'programa' && type !== 'monografia') {
      return NextResponse.json(
        { error: 'type inválido. Use programa ou monografia.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const filter = { alunoId: new ObjectId(alunoId), type }
    const existing = await col.findOne(filter)

    const now = new Date()

    // Regras de extensão por tipo - ambos permitem PDF e Word
    const allowedExts = ['.doc', '.docx', '.pdf']

    const updateDoc = {
      updatedAt: now
    }

    // Se o aluno mexer em algo (nota ou upload), o professor deve ver "Novo"
    const setTeacherUnread = () => {
      updateDoc.teacherUnread = true
      updateDoc.teacherUnreadAt = now
      updateDoc.teacherLastOpenedAt = null
    }

    // --- NOTA (pode ser sem ficheiro) ---
    if (typeof note === 'string') {
      updateDoc.studentNote = note
      updateDoc.studentNoteUpdatedAt = now
      setTeacherUnread()
    }

    // --- FICHEIRO (opcional) ---
    if (file && typeof file === 'object' && 'arrayBuffer' in file) {
      const filename = file.name || 'documento'
      const ext = getExt(filename)

      if (!allowedExts.includes(ext)) {
        return NextResponse.json(
          {
            error: `${type === 'programa' ? 'Programa' : 'Monografia'}: envie apenas Word (.doc/.docx) ou PDF (.pdf).`
          },
          { status: 400 }
        )
      }

      const arrayBuf = await file.arrayBuffer()
      const buf = Buffer.from(arrayBuf)

      if (buf.length > MAX_FILE_BYTES) {
        return NextResponse.json(
          { error: 'Ficheiro demasiado grande (máx: 25MB).' },
          { status: 400 }
        )
      }

      const safeName = sanitizeForKey(filename)
      const random = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : Math.random().toString(16).slice(2)

      const baseKey = `mentoring/${alunoId}/${type}/${Date.now()}_${random}`
      const originalKey = `${baseKey}_${safeName}`

      const originalContentType = file.type || contentTypeFromExt(ext)

      const uploadedOriginal = await uploadBuffer({
        key: originalKey,
        body: buf,
        contentType: originalContentType
      })

      updateDoc.original = {
        key: uploadedOriginal.key,
        url: uploadedOriginal.url,
        filename,
        contentType: originalContentType,
        size: buf.length,
        uploadedAt: now
      }

      // Para PDFs, usamos o ficheiro original directamente
      // Para Word docs, usaremos Google Docs Viewer para pré-visualização
      if (ext === '.pdf') {
        updateDoc.pdf = {
          key: uploadedOriginal.key,
          url: uploadedOriginal.url,
          filename,
          contentType: 'application/pdf',
          size: buf.length,
          generatedAt: now,
          source: 'original'
        }
      }
      // Para Word docs, não há necessidade de conversão - usaremos Google Docs Viewer

      updateDoc.version = (existing?.version || 0) + 1
      setTeacherUnread()
    } else {
      // Sem ficheiro: precisa existir um doc para permitir apenas editar nota
      if (!existing) {
        return NextResponse.json(
          {
            error:
              'Envie um ficheiro primeiro. Depois poderá actualizar apenas a nota.'
          },
          { status: 400 }
        )
      }
    }

    const result = await col.findOneAndUpdate(
      filter,
      {
        $set: updateDoc,
        $setOnInsert: {
          alunoId: new ObjectId(alunoId),
          type,
          createdAt: now,
          teacherNote: ''
        }
      },
      { upsert: true, returnDocument: 'after' }
    )

    const doc = result.value || result

    return NextResponse.json(
      {
        message: 'Documento actualizado.',
        document: {
          id: doc._id.toString(),
          alunoId: doc.alunoId.toString(),
          type: doc.type,
          version: doc.version || 1,
          original: doc.original || null,
          pdf: doc.pdf || null,
          pdfConversionError: doc.pdfConversionError || null,
          studentNote: doc.studentNote || '',
          teacherNote: doc.teacherNote || '',
          teacherUnread: !!doc.teacherUnread,
          teacherLastOpenedAt: doc.teacherLastOpenedAt || null,
          createdAt: doc.createdAt || null,
          updatedAt: doc.updatedAt || null
        }
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Erro ao criar/actualizar documento:', error)
    return NextResponse.json(
      { error: 'Erro ao guardar documento.' },
      { status: 500 }
    )
  }
}
