# SEC-09: Magic Bytes File Validation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Validate uploaded file content via magic bytes to prevent executables disguised as images/documents from being accepted.

**Architecture:** Add a `validateFileContent()` function in the document application layer that checks file extension blocklist + `file-type` magic bytes detection against an allowlist. Called in `UploadDocument.execute()` before storage. New `InvalidFileTypeError` domain error mapped to HTTP 422.

**Tech Stack:** `file-type` (ESM-native, zero deps) for magic bytes detection, Vitest for tests.

---

### Task 1: Add `file-type` dependency

**Files:**

- Modify: `packages/core/package.json`

- [ ] **Step 1: Install file-type in @repo/core**

```bash
cd /home/artur/projects && pnpm add file-type -F @repo/core
```

- [ ] **Step 2: Verify installation**

```bash
cd /home/artur/projects && pnpm ls file-type --filter @repo/core
```

Expected: `file-type` listed in dependencies.

- [ ] **Step 3: Commit**

```bash
git add packages/core/package.json pnpm-lock.yaml
git commit -m "chore: add file-type dependency to @repo/core"
```

---

### Task 2: Add `InvalidFileTypeError` domain error

**Files:**

- Modify: `packages/core/src/modules/document/domain/document-errors.ts`
- Modify: `packages/core/src/modules/document/index.ts`

- [ ] **Step 1: Add error class to document-errors.ts**

Append after the existing `DocumentNotFoundError` class:

```typescript
export class InvalidFileTypeError extends Error {
  readonly code = 'INVALID_FILE_TYPE' as const
  constructor(detectedType: string) {
    super(`Tipo de arquivo não permitido: ${detectedType}`)
    this.name = 'InvalidFileTypeError'
  }
}
```

Update `DocumentErrors` to include the new factory:

```typescript
export const DocumentErrors = {
  notFound: (id: string) => new DocumentNotFoundError(id),
  invalidFileType: (type: string) => new InvalidFileTypeError(type),
}
```

- [ ] **Step 2: Export from module index**

In `packages/core/src/modules/document/index.ts`, update the errors export:

```typescript
export {
  DocumentNotFoundError,
  InvalidFileTypeError,
  DocumentErrors,
} from './domain/document-errors.js'
```

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/document/domain/document-errors.ts packages/core/src/modules/document/index.ts
git commit -m "feat(document): add InvalidFileTypeError domain error"
```

---

### Task 3: Create `validateFileContent` with tests (TDD)

**Files:**

- Create: `packages/core/src/modules/document/application/validate-file-content.ts`
- Create: `packages/core/src/modules/document/application/validate-file-content.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `packages/core/src/modules/document/application/validate-file-content.spec.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import { InvalidFileTypeError } from '../domain/document-errors.js'
import { validateFileContent } from './validate-file-content.js'

// Real JPEG magic bytes: FF D8 FF
const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
// Real PNG magic bytes: 89 50 4E 47
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
// Real PDF magic bytes: %PDF
const PDF_HEADER = Buffer.from('%PDF-1.4 fake content')
// EXE magic bytes: MZ
const EXE_HEADER = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])

describe('validateFileContent', () => {
  it('accepts a valid JPEG file', async () => {
    await expect(
      validateFileContent(JPEG_HEADER, 'photo.jpg')
    ).resolves.toBeUndefined()
  })

  it('accepts a valid PNG file', async () => {
    await expect(
      validateFileContent(PNG_HEADER, 'image.png')
    ).resolves.toBeUndefined()
  })

  it('accepts a valid PDF file', async () => {
    await expect(
      validateFileContent(PDF_HEADER, 'contract.pdf')
    ).resolves.toBeUndefined()
  })

  it('rejects a file with blocked extension regardless of content', async () => {
    await expect(
      validateFileContent(JPEG_HEADER, 'malware.exe')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects a file with blocked .bat extension', async () => {
    await expect(
      validateFileContent(Buffer.from('echo hello'), 'script.bat')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects an EXE disguised as .jpg', async () => {
    await expect(validateFileContent(EXE_HEADER, 'photo.jpg')).rejects.toThrow(
      InvalidFileTypeError
    )
  })

  it('allows a plain text file (no detectable magic bytes)', async () => {
    const textBuffer = Buffer.from('Hello, this is a plain text file.')
    await expect(
      validateFileContent(textBuffer, 'notes.txt')
    ).resolves.toBeUndefined()
  })

  it('allows a CSV file (no detectable magic bytes)', async () => {
    const csvBuffer = Buffer.from('name,email\nJohn,john@test.com')
    await expect(
      validateFileContent(csvBuffer, 'clients.csv')
    ).resolves.toBeUndefined()
  })

  it('rejects .sh extension', async () => {
    await expect(
      validateFileContent(Buffer.from('#!/bin/bash'), 'deploy.sh')
    ).rejects.toThrow(InvalidFileTypeError)
  })

  it('rejects .ps1 extension', async () => {
    await expect(
      validateFileContent(Buffer.from('Write-Host "hi"'), 'script.ps1')
    ).rejects.toThrow(InvalidFileTypeError)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /home/artur/projects && pnpm --filter @repo/core test -- validate-file-content
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `validateFileContent`**

Create `packages/core/src/modules/document/application/validate-file-content.ts`:

```typescript
import { fileTypeFromBuffer } from 'file-type'
import { InvalidFileTypeError } from '../domain/document-errors.js'

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  // Documents
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Media
  'video/mp4',
  'audio/mpeg',
  'audio/ogg',
])

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'msi',
  'dll',
  'com',
  'scr',
  'vbs',
  'wsf',
  'jar',
])

export async function validateFileContent(
  buffer: Buffer,
  fileName: string
): Promise<void> {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''

  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new InvalidFileTypeError(ext)
  }

  const detected = await fileTypeFromBuffer(buffer)

  // No magic bytes detected (e.g. plain text, CSV) — allow through
  if (!detected) {
    return
  }

  if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
    throw new InvalidFileTypeError(detected.mime)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /home/artur/projects && pnpm --filter @repo/core test -- validate-file-content
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/modules/document/application/validate-file-content.ts packages/core/src/modules/document/application/validate-file-content.spec.ts
git commit -m "feat(document): add magic bytes file validation with tests"
```

---

### Task 4: Integrate validation into `UploadDocument` use case

**Files:**

- Modify: `packages/core/src/modules/document/application/upload-document.ts`

- [ ] **Step 1: Add validation call before storage upload**

Add import at top of `upload-document.ts`:

```typescript
import { validateFileContent } from './validate-file-content.js'
```

In the `execute()` method, add validation as the first line before storage key generation:

```typescript
async execute(dto: UploadDocumentInput): Promise<DocumentData> {
  await validateFileContent(dto.buffer, dto.fileName)

  const storageKey = `${dto.organizationId}/${dto.entityType}/${dto.entityId}/${randomUUID()}-${dto.fileName}`
  // ... rest unchanged
```

- [ ] **Step 2: Run all core tests**

```bash
cd /home/artur/projects && pnpm --filter @repo/core test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/modules/document/application/upload-document.ts
git commit -m "feat(document): integrate magic bytes validation in upload flow"
```

---

### Task 5: Map error to HTTP 422 in document routes

**Files:**

- Modify: `apps/server/src/routes/v1/document-routes.ts`

- [ ] **Step 1: Update error handler and imports**

Update the import to include `InvalidFileTypeError`:

```typescript
import {
  UploadDocument,
  ListDocuments,
  GetDocumentUrl,
  DeleteDocument,
  DocumentNotFoundError,
  InvalidFileTypeError,
} from '@repo/core'
```

Update `handleDocumentError` to handle the new error:

```typescript
function handleDocumentError(error: unknown, reply: FastifyReply) {
  if (error instanceof DocumentNotFoundError) {
    return reply.status(404).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  if (error instanceof InvalidFileTypeError) {
    return reply.status(422).send({
      success: false,
      error: { code: error.code, message: error.message },
    })
  }
  throw error
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /home/artur/projects && pnpm typecheck
```

Expected: Zero errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/document-routes.ts
git commit -m "feat(document): map InvalidFileTypeError to HTTP 422"
```

---

### Task 6: Verify full build and lint

- [ ] **Step 1: Run lint**

```bash
cd /home/artur/projects && pnpm lint
```

Expected: Zero errors.

- [ ] **Step 2: Run full build**

```bash
cd /home/artur/projects && pnpm build
```

Expected: Successful build.

- [ ] **Step 3: Run all tests**

```bash
cd /home/artur/projects && pnpm test
```

Expected: All tests pass.

- [ ] **Step 4: Final commit (if any lint/build fixes needed)**

```bash
git add -u
git commit -m "fix(document): lint/build fixes for magic bytes validation"
```
