# Mentoring Admin APIs and Database Structure

This document explains the APIs used by `app/mentoring/admin/page.js` for the teacher dashboard. It includes endpoint details, request/response structures, and the underlying database schema in MongoDB.

## Database Collections Overview

The mentoring system uses the following MongoDB collections:

### `mentoring_mentorships`
- `_id`: ObjectId (primary key)
- `alunoId`: ObjectId (references `alunos._id`)
- `email`: String (optional)
- `tipoKey`: String (e.g., "doutoramento", "licenciatura", "mestrado")
- `anoInicioCurso`: Number (nullable)
- `anoInicioMentoria`: Number (nullable)
- `titulo`: String
- `teacherQueueStatus`: String ("pending" or "done")
- `teacherQueueUpdatedAt`: Date
- `createdAt`: Date
- `updatedAt`: Date

### `alunos`
- `_id`: ObjectId (primary key)
- `nomeCompleto`: String
- `telefone`: String
- `curso`: String
- Other fields may exist but not used in admin APIs

### `mentoring_documents`
- `_id`: ObjectId (primary key)
- `mentorshipId`: ObjectId (references `mentoring_mentorships._id`)
- `alunoId`: ObjectId (references `alunos._id`)
- `type`: String (e.g., "programa", "monografia", "tez", "dissertacao")
- `kind`: String ("submission", "correction", "resource")
- `version`: Number
- `parentDocumentId`: ObjectId (nullable, for corrections)
- `forDocumentVersion`: Number (nullable)
- `uploadedByRole`: String ("student" or "teacher")
- `original`: Object (file metadata)
  - `key`: String (S3 key)
  - `url`: String (public URL)
  - `filename`: String
  - `contentType`: String
  - `size`: Number (bytes)
  - `uploadedAt`: Date
- `pdf`: Object (nullable, same structure as `original`)
- `studentNote`: String
- `teacherNote`: String
- `teacherUnread`: Boolean
- `studentUnread`: Boolean
- `teacherUnreadAt`: Date (nullable)
- `studentUnreadAt`: Date (nullable)
- `teacherViewedAt`: Date (nullable)
- `teacherDownloadedAt`: Date (nullable)
- `studentViewedAt`: Date (nullable)
- `studentDownloadedAt`: Date (nullable)
- `createdAt`: Date
- `updatedAt`: Date

### `perguntas` (Questions)
- `_id`: ObjectId (primary key)
- `alunoId`: ObjectId (references `alunos._id`)
- `mentorshipId`: ObjectId (references `mentoring_mentorships._id`)
- `pergunta`: String
- `detalhe`: String (optional)
- `resposta`: String
- `respondida`: Boolean
- `teacherUnread`: Boolean
- `studentUnread`: Boolean
- `createdAt`: Date
- `updatedAt`: Date
- `respondidaEm`: Date (nullable)

### `mentoring_meetings`
- `_id`: ObjectId (primary key)
- `mentorshipId`: ObjectId (references `mentoring_mentorships._id`)
- `alunoId`: ObjectId (references `alunos._id`)
- `requestedBy`: String ("student" or "teacher")
- `datetime`: Date (nullable)
- `topic`: String
- `status`: String ("pending", "accepted", "rejected", "cancelled")
- `teacherUnread`: Boolean
- `studentUnread`: Boolean
- `createdAt`: Date
- `updatedAt`: Date
- `acceptedAt`: Date (nullable)
- `rejectedAt`: Date (nullable)
- `cancelledAt`: Date (nullable)

### `mentoring_progress`
- `_id`: ObjectId (primary key)
- `mentorshipId`: ObjectId (references `mentoring_mentorships._id`)
- `alunoId`: ObjectId (references `alunos._id`)
- `note`: String
- `createdAt`: Date
- `studentUnread`: Boolean

## API Endpoints

### Authentication

#### POST `/api/mentoring/admin/login`
Authenticates the teacher using environment variables.

**Request Body:**
```json
{
  "telefone": "string",
  "senha": "string"
}
```

**Response (Success - 200):**
```json
{
  "ok": true,
  "message": "Login de professor efectuado com sucesso.",
  "teacher": {
    "telefone": "string"
  }
}
```

**Response (Error - 401/500):**
```json
{
  "ok": false,
  "error": "string"
}
```

**Database Impact:** No direct DB interaction (uses env vars).

### Mentorships Management

#### GET `/api/mentoring/admin/mentorships`
Lists all mentorships with student details and unread counts.

**Response (200):**
```json
{
  "mentorships": [
    {
      "id": "string",
      "alunoId": "string",
      "email": "string",
      "tipoKey": "string",
      "anoInicioCurso": number | null,
      "anoInicioMentoria": number | null,
      "titulo": "string",
      "teacherQueueStatus": "pending" | "done",
      "teacherQueueUpdatedAt": "date" | null,
      "createdAt": "date" | null,
      "updatedAt": "date" | null,
      "pendingCounts": {
        "documents": number,
        "questions": number,
        "meetings": number,
        "total": number
      },
      "aluno": {
        "id": "string",
        "nomeCompleto": "string",
        "telefone": "string",
        "curso": "string"
      }
    }
  ]
}
```

**Database Query:** Aggregates `mentoring_mentorships` with `alunos`, counts unread items from `mentoring_documents`, `perguntas`, `mentoring_meetings`.

#### PATCH `/api/mentoring/mentorships/{id}`
Updates mentorship queue status.

**Request Body:**
```json
{
  "teacherQueueStatus": "pending" | "done"
}
```

**Response (200):**
```json
{
  "message": "Mentoria actualizada.",
  "mentorship": {
    "id": "string",
    "alunoId": "string",
    "email": "string",
    "tipoKey": "string",
    "anoInicioCurso": number | null,
    "anoInicioMentoria": number | null,
    "titulo": "string",
    "teacherQueueStatus": "string",
    "teacherQueueUpdatedAt": "date" | null,
    "createdAt": "date" | null,
    "updatedAt": "date" | null
  }
}
```

**Database Impact:** Updates `teacherQueueStatus`, `teacherQueueUpdatedAt`, `updatedAt` in `mentoring_mentorships`.

### Notifications

#### GET `/api/mentoring/notifications?role=teacher&mentorshipId={id}`
Gets notifications for teacher.

**Response (200):**
```json
{
  "count": number,
  "items": [
    {
      "type": "document" | "question" | "meeting" | "progress",
      "mentorshipId": "string",
      "alunoId": "string",
      "title": "string",
      "message": "string",
      "createdAt": "date",
      "refId": "string"
    }
  ]
}
```

**Database Query:** Counts and fetches unread items from `mentoring_documents`, `perguntas`, `mentoring_meetings`, `mentoring_progress`.

### Documents Management

#### GET `/api/mentoring/documents?mentorshipId={id}&type={type}&kind={kind}`
Lists documents for a mentorship.

**Response (200):**
```json
{
  "documents": [
    {
      "id": "string",
      "mentorshipId": "string",
      "alunoId": "string",
      "type": "string",
      "kind": "submission" | "correction" | "resource",
      "version": number,
      "parentDocumentId": "string" | null,
      "forDocumentVersion": number | null,
      "original": { /* file object */ },
      "pdf": { /* file object */ } | null,
      "studentNote": "string",
      "teacherNote": "string",
      "teacherUnread": boolean,
      "studentUnread": boolean,
      "teacherViewedAt": "date" | null,
      "teacherDownloadedAt": "date" | null,
      "studentViewedAt": "date" | null,
      "studentDownloadedAt": "date" | null,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ]
}
```

**Database Query:** Queries `mentoring_documents` by filters.

#### POST `/api/mentoring/documents`
Uploads documents, feedback, corrections, resources.

**Request:** Multipart form-data
- `mentorshipId`: string
- `alunoId`: string
- `type`: string
- `kind`: "submission" | "correction" | "resource"
- `parentDocumentId`: string (for corrections)
- `note`: string
- `file`: File (optional for note-only updates)
- `uploadedByRole`: "student" | "teacher"

**Response (201):**
```json
{
  "message": "Documento enviado.",
  "document": {
    "id": "string",
    "mentorshipId": "string",
    "alunoId": "string",
    "type": "string",
    "kind": "string",
    "version": number,
    "parentDocumentId": "string" | null,
    "forDocumentVersion": number | null,
    "original": { /* file object */ },
    "pdf": { /* file object */ } | null,
    "studentNote": "string",
    "teacherNote": "string",
    "createdAt": "date"
  }
}
```

**Database Impact:** Inserts into `mentoring_documents`, updates `mentoring_mentorships.updatedAt`, sets queue status for submissions.

#### PATCH `/api/mentoring/documents/{id}/event`
Records view/download events.

**Request Body:**
```json
{
  "role": "student" | "teacher",
  "action": "view" | "download" | "markRead"
}
```

**Response (200):**
```json
{
  "message": "Evento registado.",
  "document": {
    "id": "string",
    "teacherUnread": boolean,
    "studentUnread": boolean,
    "teacherViewedAt": "date" | null,
    "teacherDownloadedAt": "date" | null,
    "studentViewedAt": "date" | null,
    "studentDownloadedAt": "date" | null,
    "updatedAt": "date"
  }
}
```

**Database Impact:** Updates timestamps and unread flags in `mentoring_documents`.

### Questions Management

#### GET `/api/mentoring/questions?alunoId={id}&mentorshipId={id}`
Lists questions for a student/mentorship.

**Response (200):**
```json
{
  "perguntas": [
    {
      "id": "string",
      "alunoId": "string",
      "mentorshipId": "string" | null,
      "pergunta": "string",
      "detalhe": "string",
      "resposta": "string",
      "respondida": boolean,
      "teacherUnread": boolean,
      "studentUnread": boolean,
      "createdAt": "date",
      "updatedAt": "date",
      "respondidaEm": "date" | null
    }
  ]
}
```

**Database Query:** Queries `perguntas` by filters.

#### PATCH `/api/mentoring/questions/{id}`
Updates question response or marks as read.

**Request Body:**
```json
{
  "resposta": "string", // to reply
  "action": "markTeacherRead" | "markStudentRead" // to mark read
}
```

**Response (200):**
```json
{
  "message": "Pergunta actualizada.",
  "pergunta": { /* same as GET item */ }
}
```

**Database Impact:** Updates `resposta`, `respondida`, `respondidaEm`, unread flags in `perguntas`.

### Meetings Management

#### GET `/api/mentoring/meetings?mentorshipId={id}`
Lists meetings for a mentorship.

**Response (200):**
```json
{
  "meetings": [
    {
      "id": "string",
      "mentorshipId": "string",
      "alunoId": "string",
      "requestedBy": "student" | "teacher",
      "datetime": "date" | null,
      "topic": "string",
      "status": "pending" | "accepted" | "rejected" | "cancelled",
      "teacherUnread": boolean,
      "studentUnread": boolean,
      "createdAt": "date",
      "updatedAt": "date",
      "acceptedAt": "date" | null,
      "rejectedAt": "date" | null,
      "cancelledAt": "date" | null
    }
  ]
}
```

**Database Query:** Queries `mentoring_meetings` by `mentorshipId`.

#### POST `/api/mentoring/meetings`
Creates new meetings.

**Request Body:**
```json
{
  "mentorshipId": "string",
  "alunoId": "string",
  "requestedBy": "student" | "teacher",
  "datetime": "date" | null,
  "topic": "string",
  "allMentorships": boolean // creates for all if true
}
```

**Response (201):**
```json
{
  "message": "Reunião criada.",
  "meeting": { /* same as GET item */ }
}
```

**Database Impact:** Inserts into `mentoring_meetings`, updates `mentoring_mentorships` queue status.

#### PATCH `/api/mentoring/meetings/{id}`
Updates meeting status.

**Request Body:**
```json
{
  "action": "accept" | "reject" | "cancel" | "markTeacherRead" | "markStudentRead"
}
```

**Response (200):**
```json
{
  "message": "Reunião actualizada.",
  "meeting": { /* same as GET item */ }
}
```

**Database Impact:** Updates `status`, timestamps, unread flags in `mentoring_meetings`.

### Progress Notes

#### GET `/api/mentoring/progress?mentorshipId={id}`
Lists progress notes.

**Response (200):**
```json
{
  "progress": [
    {
      "id": "string",
      "mentorshipId": "string",
      "alunoId": "string",
      "note": "string",
      "createdAt": "date",
      "studentUnread": boolean
    }
  ]
}
```

**Database Query:** Queries `mentoring_progress` by `mentorshipId`.

#### POST `/api/mentoring/progress`
Adds progress note.

**Request Body:**
```json
{
  "mentorshipId": "string",
  "alunoId": "string",
  "note": "string"
}
```

**Response (201):**
```json
{
  "message": "Nota de progresso adicionada.",
  "progress": { /* same as GET item */ }
}
```

**Database Impact:** Inserts into `mentoring_progress`, updates `mentoring_mentorships.updatedAt`.

## Usage in Admin Page

The admin page (`app/mentoring/admin/page.js`) integrates these APIs as follows:

- **Login:** Authenticates teacher
- **Dashboard Load:** Fetches mentorships, notifications, and data for selected mentorship
- **Document Management:** Upload feedback, corrections, resources; track views/downloads
- **Question Handling:** Reply to questions, mark as read
- **Meeting Scheduling:** Create, accept/reject meetings
- **Progress Tracking:** Add notes for students
- **Queue Management:** Mark mentorships as done/pending

All operations maintain unread flags and update timestamps to ensure proper notification flow between teacher and students.
