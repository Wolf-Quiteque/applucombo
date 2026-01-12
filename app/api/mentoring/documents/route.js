// app/api/mentoring/documents/route.js

import { NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getDb } from '@/app/lib/mongodb'
import { uploadBuffer } from '@/app/lib/r2'

export const runtime = 'nodejs'

const ALLOWED_TYPES = new Set([
  'programa',
  'monografia',
  'tez',
  'dissertacao',
  'pesquisa',
  'outras_pesquisa'
])

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
])

function oid(id) {
  if (!id) return null
  try {
    return new ObjectId(id)
  } catch {
    return null
  }
}

function safeName(name) {
  const base = (name || 'documento').toString().trim().replace(/\s+/g, '_')
  return base.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function randomId() {
  try {
    return crypto.randomUUID()
  } catch {
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`
  }
}

// GET
// - Novo: /api/mentoring/documents?mentorshipId=...&type=...&kind=submission,correction
// - Legacy: /api/mentoring/documents?alunoId=...
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const mentorshipId = searchParams.get('mentorshipId')

    // v2
    if (mentorshipId) {
      const mentorshipOid = oid(mentorshipId)
      if (!mentorshipOid) {
        return NextResponse.json({ error: 'mentorshipId inválido.' }, { status: 400 })
      }

      const type = (searchParams.get('type') || '').toString().trim()
      const kindParam = (searchParams.get('kind') || '').toString().trim()
      const alunoId = searchParams.get('alunoId')
      const alunoOid = alunoId ? oid(alunoId) : null

      const filter = { mentorshipId: mentorshipOid }
      if (alunoOid) filter.alunoId = alunoOid

      if (type) {
        if (!ALLOWED_TYPES.has(type)) {
          return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 })
        }
        filter.type = type
      }

      if (kindParam) {
        const kinds = kindParam
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
        if (kinds.length === 1) filter.kind = kinds[0]
        else filter.kind = { $in: kinds }
      }

      const db = await getDb()
      const col = db.collection('mentoring_documents')

      const docs = await col
        .find(filter)
        .sort({ createdAt: -1, version: -1 })
        .toArray()

      const documents = docs.map(d => ({
        id: d._id.toString(),
        mentorshipId: d.mentorshipId?.toString(),
        alunoId: d.alunoId?.toString(),
        type: d.type,
        kind: d.kind || 'submission',
        version: d.version || 1,
        parentDocumentId: d.parentDocumentId ? d.parentDocumentId.toString() : null,
        forDocumentVersion: d.forDocumentVersion ?? null,
        original: d.original || null,
        pdf: d.pdf || null,
        studentNote: d.studentNote || '',
        teacherNote: d.teacherNote || '',
        teacherUnread: !!d.teacherUnread,
        studentUnread: !!d.studentUnread,
        teacherViewedAt: d.teacherViewedAt || d.teacherLastOpenedAt || null,
        teacherDownloadedAt: d.teacherDownloadedAt || null,
        studentViewedAt: d.studentViewedAt || null,
        studentDownloadedAt: d.studentDownloadedAt || null,
        createdAt: d.createdAt || null,
        updatedAt: d.updatedAt || null
      }))

      return NextResponse.json({ documents }, { status: 200 })
    }

    // legacy
    const { searchParams: sp } = new URL(request.url)
    const alunoId = sp.get('alunoId')
    const alunoOid = oid(alunoId)
    if (!alunoOid) {
      return NextResponse.json(
        { error: 'alunoId é obrigatório.' },
        { status: 400 }
      )
    }

    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const docs = await col
      .find({ alunoId: alunoOid })
      .sort({ updatedAt: -1, createdAt: -1 })
      .toArray()

    const documents = docs.map(doc => ({
      id: doc._id.toString(),
      type: doc.type,
      original: doc.original || null,
      pdf: doc.pdf || null,
      studentNote: doc.studentNote || '',
      teacherNote: doc.teacherNote || '',
      teacherUnread: !!doc.teacherUnread,
      createdAt: doc.createdAt || null,
      updatedAt: doc.updatedAt || null,
      version: doc.version || 1
    }))

    return NextResponse.json({ documents }, { status: 200 })
  } catch (error) {
    console.error('Erro ao listar documentos:', error)
    return NextResponse.json({ error: 'Erro ao carregar documentos.' }, { status: 500 })
  }
}

// POST
// - Novo: multipart form-data com mentorshipId
//   campos: mentorshipId, alunoId, type, kind=submission|correction|resource, parentDocumentId?, note, file
// - Legacy: campos: alunoId, type, note, file (faz upsert)
export async function POST(request) {
  try {
    const formData = await request.formData()

    const mentorshipId = formData.get('mentorshipId')

    // v2
    if (mentorshipId) {
      const mentorshipOid = oid(mentorshipId)
      const alunoId = formData.get('alunoId')
      const alunoOid = oid(alunoId)
      const type = (formData.get('type') || '').toString().trim()
      const kindRaw = (formData.get('kind') || 'submission').toString().trim()
      const kind = ['submission', 'correction', 'resource'].includes(kindRaw)
        ? kindRaw
        : 'submission'

      const note = (formData.get('note') || '').toString()
      const file = formData.get('file')

      if (!mentorshipOid || !alunoOid) {
        return NextResponse.json({ error: 'mentorshipId/alunoId inválido.' }, { status: 400 })
      }

      if (!ALLOWED_TYPES.has(type)) {
        return NextResponse.json({ error: 'Tipo de documento inválido.' }, { status: 400 })
      }

      const db = await getDb()
      const col = db.collection('mentoring_documents')
      const mentorshipsCol = db.collection('mentoring_mentorships')

      const now = new Date()

      // Se não veio ficheiro (apenas nota) -> actualiza a última submissão
      // Suporta nota do aluno (studentNote) e feedback do professor (teacherNote)
      // via uploadedByRole/role = 'student' | 'teacher'
      if (!file || typeof file === 'string') {
        if (!note.trim()) {
          return NextResponse.json(
            { error: 'Envie um ficheiro ou escreva uma nota.' },
            { status: 400 }
          )
        }

        const role = (formData.get('uploadedByRole') || formData.get('role') || 'student')
          .toString()
          .trim()
          .toLowerCase()
        const isTeacher = role === 'teacher'

        const latest = await col
          .find({ mentorshipId: mentorshipOid, alunoId: alunoOid, type, kind: 'submission' })
          .sort({ version: -1, createdAt: -1 })
          .limit(1)
          .toArray()
          .then(arr => arr[0])

        if (!latest) {
          return NextResponse.json(
            { error: 'Ainda não existe uma versão para actualizar a nota. Envie o ficheiro primeiro.' },
            { status: 400 }
          )
        }

        if (isTeacher) {
          await col.updateOne(
            { _id: latest._id },
            {
              $set: {
                teacherNote: note,
                studentUnread: true,
                studentUnreadAt: now,
                teacherUnread: false,
                updatedAt: now
              }
            }
          )

          await mentorshipsCol.updateOne(
            { _id: mentorshipOid },
            { $set: { updatedAt: now } }
          )
        } else {
          await col.updateOne(
            { _id: latest._id },
            {
              $set: {
                studentNote: note,
                teacherUnread: true,
                teacherUnreadAt: now,
                updatedAt: now
              }
            }
          )

          await mentorshipsCol.updateOne(
            { _id: mentorshipOid },
            {
              $set: {
                teacherQueueStatus: 'pending',
                teacherQueueUpdatedAt: now,
                updatedAt: now
              }
            }
          )
        }

        return NextResponse.json(
          {
            message: 'Nota actualizada.',
            documentId: latest._id.toString(),
            updatedRole: isTeacher ? 'teacher' : 'student'
          },
          { status: 200 }
        )
      }

      // ficheiro presente
      const contentType = file.type || 'application/octet-stream'
      if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
        return NextResponse.json(
          { error: 'Formato inválido. Apenas PDF, DOC e DOCX.' },
          { status: 400 }
        )
      }

      const filename = safeName(file.name)
      const bytes = Buffer.from(await file.arrayBuffer())

      // calcula versão
      let version = 1
      let parentDocumentId = null
      let forDocumentVersion = null

      if (kind === 'submission') {
        const last = await col
          .find({ mentorshipId: mentorshipOid, alunoId: alunoOid, type, kind: 'submission' })
          .sort({ version: -1 })
          .limit(1)
          .toArray()
          .then(arr => arr[0])

        version = (last?.version || 0) + 1
      } else if (kind === 'correction') {
        const parentId = formData.get('parentDocumentId')
        const parentOid = oid(parentId)
        if (!parentOid) {
          return NextResponse.json(
            { error: 'parentDocumentId é obrigatório para correcções.' },
            { status: 400 }
          )
        }

        const parent = await col.findOne({ _id: parentOid })
        if (!parent) {
          return NextResponse.json({ error: 'Documento base não encontrado.' }, { status: 404 })
        }

        parentDocumentId = parentOid
        forDocumentVersion = parent.version || null

        const lastCorr = await col
          .find({ parentDocumentId: parentOid, kind: 'correction' })
          .sort({ createdAt: -1 })
          .limit(1)
          .toArray()
          .then(arr => arr[0])

        // versão de correção (1,2,3...) por documento base
        version = (lastCorr?.version || 0) + 1
      } else if (kind === 'resource') {
        const lastRes = await col
          .find({ mentorshipId: mentorshipOid, type, kind: 'resource' })
          .sort({ createdAt: -1, version: -1 })
          .limit(1)
          .toArray()
          .then(arr => arr[0])
        version = (lastRes?.version || 0) + 1
      }

      const key = `mentoring/${alunoOid.toString()}/${mentorshipOid.toString()}/${type}/${kind}/${Date.now()}_${randomId()}_${filename}`
      const upload = await uploadBuffer({ key, body: bytes, contentType })

      const original = {
        key: upload.key,
        url: upload.url,
        filename,
        contentType,
        size: bytes.length,
        uploadedAt: now
      }

      const pdf = contentType === 'application/pdf'
        ? { ...original, generatedAt: now, source: 'original' }
        : null

      const uploadedByRole = kind === 'submission' ? 'student' : 'teacher'

      const doc = {
        mentorshipId: mentorshipOid,
        alunoId: alunoOid,
        type,
        kind,
        version,
        uploadedByRole,
        parentDocumentId,
        forDocumentVersion,
        original,
        pdf,
        studentNote: kind === 'submission' ? note : '',
        teacherNote: kind !== 'submission' ? note : '',
        teacherUnread: kind === 'submission',
        studentUnread: kind !== 'submission',
        teacherUnreadAt: kind === 'submission' ? now : null,
        studentUnreadAt: kind !== 'submission' ? now : null,
        createdAt: now,
        updatedAt: now
      }

      const ins = await col.insertOne(doc)

      if (kind === 'submission') {
        await mentorshipsCol.updateOne(
          { _id: mentorshipOid },
          {
            $set: {
              teacherQueueStatus: 'pending',
              teacherQueueUpdatedAt: now,
              updatedAt: now
            }
          }
        )
      } else {
        await mentorshipsCol.updateOne(
          { _id: mentorshipOid },
          { $set: { updatedAt: now } }
        )
      }

      return NextResponse.json(
        {
          message: 'Documento enviado.',
          document: {
            id: ins.insertedId.toString(),
            mentorshipId: mentorshipId.toString(),
            alunoId: alunoId.toString(),
            type,
            kind,
            version,
            parentDocumentId: parentDocumentId ? parentDocumentId.toString() : null,
            forDocumentVersion,
            original,
            pdf,
            studentNote: doc.studentNote,
            teacherNote: doc.teacherNote,
            createdAt: now
          }
        },
        { status: 201 }
      )
    }

    // legacy upsert (mantido para compatibilidade)
    const alunoId = formData.get('alunoId')
    const type = formData.get('type')
    const note = formData.get('note') || ''
    const file = formData.get('file')

    if (!alunoId || !type) {
      return NextResponse.json(
        { error: 'alunoId e type são obrigatórios.' },
        { status: 400 }
      )
    }

    const alunoOid = oid(alunoId)
    if (!alunoOid) {
      return NextResponse.json({ error: 'alunoId inválido.' }, { status: 400 })
    }

    if (type !== 'programa' && type !== 'monografia') {
      return NextResponse.json(
        { error: 'Tipo inválido. Use "programa" ou "monografia".' },
        { status: 400 }
      )
    }

    if (!file) {
      return NextResponse.json({ error: 'Ficheiro é obrigatório.' }, { status: 400 })
    }

    const contentType = file.type || 'application/octet-stream'
    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: 'Formato inválido. Apenas PDF, DOC e DOCX.' },
        { status: 400 }
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const filename = safeName(file.name)

    const now = new Date()
    const key = `mentoring/${alunoOid.toString()}/${type}/${Date.now()}_${randomId()}_${filename}`

    const upload = await uploadBuffer({ key, body: bytes, contentType })

    const original = {
      key: upload.key,
      url: upload.url,
      filename,
      contentType,
      size: bytes.length,
      uploadedAt: now
    }

    const pdf = contentType === 'application/pdf'
      ? { ...original, generatedAt: now, source: 'original' }
      : null

    const db = await getDb()
    const col = db.collection('mentoring_documents')

    const result = await col.findOneAndUpdate(
      { alunoId: alunoOid, type },
      {
        $set: {
          original,
          pdf,
          studentNote: note.toString(),
          teacherUnread: true,
          updatedAt: now
        },
        $setOnInsert: {
          alunoId: alunoOid,
          type,
          createdAt: now,
          version: 0
        },
        $inc: { version: 1 }
      },
      { upsert: true, returnDocument: 'after' }
    )

    const doc = result.value || result

    return NextResponse.json(
      {
        message: 'Documento enviado com sucesso.',
        document: {
          id: doc._id.toString(),
          type: doc.type,
          original: doc.original,
          pdf: doc.pdf,
          studentNote: doc.studentNote,
          teacherUnread: !!doc.teacherUnread,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          version: doc.version
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro ao enviar documento:', error)
    return NextResponse.json(
      { error: 'Erro ao enviar documento.' },
      { status: 500 }
    )
  }
}
