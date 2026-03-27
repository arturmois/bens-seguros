# Document Type Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to select the document type (CNH, CRLV, etc.) when uploading documents in the proposal flow, filtered by insurance branch.

**Architecture:** The backend and schema already support document types. This is a frontend-only change: add a staged upload flow (file select → type select → confirm) to `DocumentUpload`, with a new mapping constant for branch-specific document types. The `proposal-detail.tsx` passes the proposal's `branch` prop down.

**Tech Stack:** React 19, Base UI Select (shadcn), TanStack React Query, Tailwind CSS 4

---

### Task 1: Add new DocumentType enum values to Prisma schema

**Files:**

- Modify: `packages/db/prisma/schema.prisma:222-231`

- [ ] **Step 1: Add new enum values**

In `packages/db/prisma/schema.prisma`, add new values to the `DocumentType` enum:

```prisma
enum DocumentType {
  DRIVER_LICENSE
  VEHICLE_REGISTRATION
  HEALTH_DECLARATION
  PROOF_OF_ADDRESS
  SOCIAL_CONTRACT
  CNPJ_CARD
  POLICY_PDF
  CLAIM_PHOTO
  CLAIM_REPORT
  PROOF_OF_PAYMENT
  CONTRACT
  OTHER
}
```

- [ ] **Step 2: Generate migration**

Run: `cd packages/db && pnpm prisma migrate dev --name add-document-type-values`

Expected: Migration created and applied successfully.

- [ ] **Step 3: Verify generated Prisma client**

Run: `cd packages/db && pnpm prisma generate`

Expected: Prisma client regenerated with new enum values.

- [ ] **Step 4: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add HEALTH_DECLARATION, PROOF_OF_ADDRESS, SOCIAL_CONTRACT, CNPJ_CARD to DocumentType enum"
```

---

### Task 2: Update backend Zod schema to accept new document types

**Files:**

- Modify: `apps/server/src/schemas/document.schemas.ts`

- [ ] **Step 1: Add new values to DOCUMENT_TYPE_VALUES**

In `apps/server/src/schemas/document.schemas.ts`, update the array:

```typescript
const DOCUMENT_TYPE_VALUES = [
  'DRIVER_LICENSE',
  'VEHICLE_REGISTRATION',
  'HEALTH_DECLARATION',
  'PROOF_OF_ADDRESS',
  'SOCIAL_CONTRACT',
  'CNPJ_CARD',
  'POLICY_PDF',
  'CLAIM_PHOTO',
  'CLAIM_REPORT',
  'PROOF_OF_PAYMENT',
  'CONTRACT',
  'OTHER',
] as const
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter server typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/schemas/document.schemas.ts
git commit -m "feat(server): accept new document types in upload schema"
```

---

### Task 3: Update frontend DocumentType and constants

**Files:**

- Modify: `apps/web/src/features/documents/types/index.ts`
- Modify: `apps/web/src/features/documents/lib/constants.ts`
- Modify: `apps/web/src/features/documents/components/document-type-badge.tsx`

- [ ] **Step 1: Add new types to DocumentType union**

In `apps/web/src/features/documents/types/index.ts`, update the type:

```typescript
export type DocumentType =
  | 'DRIVER_LICENSE'
  | 'VEHICLE_REGISTRATION'
  | 'HEALTH_DECLARATION'
  | 'PROOF_OF_ADDRESS'
  | 'SOCIAL_CONTRACT'
  | 'CNPJ_CARD'
  | 'POLICY_PDF'
  | 'CLAIM_PHOTO'
  | 'CLAIM_REPORT'
  | 'PROOF_OF_PAYMENT'
  | 'CONTRACT'
  | 'OTHER'
```

- [ ] **Step 2: Add labels for new types**

In `apps/web/src/features/documents/lib/constants.ts`, update `DOCUMENT_TYPE_LABELS`:

```typescript
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  DRIVER_LICENSE: 'CNH',
  VEHICLE_REGISTRATION: 'CRLV',
  HEALTH_DECLARATION: 'Declaração de Saúde',
  PROOF_OF_ADDRESS: 'Comprovante de Endereço',
  SOCIAL_CONTRACT: 'Contrato Social',
  CNPJ_CARD: 'Cartão CNPJ',
  POLICY_PDF: 'Apólice PDF',
  CLAIM_PHOTO: 'Foto Sinistro',
  CLAIM_REPORT: 'Laudo Sinistro',
  PROOF_OF_PAYMENT: 'Comprovante Pagamento',
  CONTRACT: 'Contrato',
  OTHER: 'Outro',
}
```

- [ ] **Step 3: Add badge colors for new types**

In `apps/web/src/features/documents/components/document-type-badge.tsx`, update `DOCUMENT_TYPE_COLORS`:

```typescript
const DOCUMENT_TYPE_COLORS: Record<DocumentType, string> = {
  DRIVER_LICENSE:
    'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  VEHICLE_REGISTRATION:
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300',
  HEALTH_DECLARATION:
    'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  PROOF_OF_ADDRESS:
    'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  SOCIAL_CONTRACT:
    'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  CNPJ_CARD:
    'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900 dark:text-fuchsia-300',
  POLICY_PDF:
    'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  CLAIM_PHOTO:
    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  CLAIM_REPORT:
    'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  PROOF_OF_PAYMENT:
    'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  CONTRACT:
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter web typecheck`

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/documents/types/index.ts apps/web/src/features/documents/lib/constants.ts apps/web/src/features/documents/components/document-type-badge.tsx
git commit -m "feat(web): add labels and badge colors for new document types"
```

---

### Task 4: Create branch-to-document-types mapping

**Files:**

- Create: `apps/web/src/features/documents/lib/branch-document-types.ts`

- [ ] **Step 1: Create the mapping file**

Create `apps/web/src/features/documents/lib/branch-document-types.ts`:

```typescript
import type { DocumentType } from '../types'

type InsuranceBranch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER'

interface DocumentTypeOption {
  readonly value: DocumentType
  readonly label: string
}

const AUTO_TYPES: readonly DocumentTypeOption[] = [
  { value: 'DRIVER_LICENSE', label: 'CNH — Carteira de Habilitação' },
  { value: 'VEHICLE_REGISTRATION', label: 'CRLV — Registro do Veículo' },
  { value: 'OTHER', label: 'Outro' },
] as const

const LIFE_TYPES: readonly DocumentTypeOption[] = [
  { value: 'HEALTH_DECLARATION', label: 'Declaração de Saúde' },
  { value: 'OTHER', label: 'Outro' },
] as const

const RESIDENTIAL_TYPES: readonly DocumentTypeOption[] = [
  { value: 'PROOF_OF_ADDRESS', label: 'Comprovante de Endereço' },
  { value: 'OTHER', label: 'Outro' },
] as const

const BUSINESS_TYPES: readonly DocumentTypeOption[] = [
  { value: 'SOCIAL_CONTRACT', label: 'Contrato Social' },
  { value: 'CNPJ_CARD', label: 'Cartão CNPJ' },
  { value: 'OTHER', label: 'Outro' },
] as const

const DEFAULT_TYPES: readonly DocumentTypeOption[] = [
  { value: 'OTHER', label: 'Outro' },
] as const

const BRANCH_DOCUMENT_TYPES: Record<
  InsuranceBranch,
  readonly DocumentTypeOption[]
> = {
  AUTO: AUTO_TYPES,
  LIFE: LIFE_TYPES,
  RESIDENTIAL: RESIDENTIAL_TYPES,
  CONDOMINIUM: RESIDENTIAL_TYPES,
  BUSINESS: BUSINESS_TYPES,
  OTHER: DEFAULT_TYPES,
}

export function getDocumentTypesForBranch(
  branch: InsuranceBranch
): readonly DocumentTypeOption[] {
  return BRANCH_DOCUMENT_TYPES[branch]
}
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter web typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/documents/lib/branch-document-types.ts
git commit -m "feat(web): add branch-to-document-types mapping"
```

---

### Task 5: Refactor DocumentUpload to staged upload with type selector

**Files:**

- Modify: `apps/web/src/features/documents/components/document-upload.tsx`

This is the main change. The component goes from immediate upload on file selection to a staged flow: file select → inline card with type selector → confirm upload.

- [ ] **Step 1: Rewrite document-upload.tsx**

Replace the entire contents of `apps/web/src/features/documents/components/document-upload.tsx`:

```tsx
'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import type { DocumentEntityType, DocumentType } from '../types'
import { useUploadDocument } from '../hooks/use-documents'
import { getDocumentTypesForBranch } from '../lib/branch-document-types'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

type InsuranceBranch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER'

interface DocumentUploadProps {
  readonly entityType: DocumentEntityType
  readonly entityId: string
  readonly branch?: InsuranceBranch
  readonly onUploadSuccess?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${String((bytes / (1024 * 1024)).toFixed(1))} MB`
}

function isAllowedMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return true
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function DocumentUpload({
  entityType,
  entityId,
  branch,
  onUploadSuccess,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedType, setSelectedType] = useState<DocumentType | ''>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadDocument = useUploadDocument()

  const documentTypeOptions = branch
    ? getDocumentTypesForBranch(branch)
    : [{ value: 'OTHER' as const, label: 'Outro' }]

  const validateFile = useCallback((file: File): boolean => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(
        `Arquivo muito grande: ${formatFileSize(file.size)}. Maximo: 10 MB.`
      )
      return false
    }

    if (!isAllowedMimeType(file.type)) {
      toast.error(
        'Tipo de arquivo nao permitido. Use imagens, PDF ou documentos Office.'
      )
      return false
    }

    return true
  }, [])

  function handleFileSelected(file: File) {
    if (!validateFile(file)) return

    if (documentTypeOptions.length === 1) {
      uploadDocument.mutate(
        {
          entityType,
          entityId,
          file,
          type: documentTypeOptions[0].value,
        },
        { onSuccess: () => onUploadSuccess?.() }
      )
      return
    }

    setPendingFile(file)
    setSelectedType('')
  }

  function handleConfirmUpload() {
    if (!pendingFile || selectedType === '') return

    uploadDocument.mutate(
      {
        entityType,
        entityId,
        file: pendingFile,
        type: selectedType,
      },
      {
        onSuccess: () => {
          setPendingFile(null)
          setSelectedType('')
          onUploadSuccess?.()
        },
      }
    )
  }

  function handleCancel() {
    setPendingFile(null)
    setSelectedType('')
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!pendingFile) setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)

    if (pendingFile) return
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelected(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelected(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClick() {
    if (pendingFile) return
    fileInputRef.current?.click()
  }

  const isUploading = uploadDocument.isPending

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Arraste arquivos ou clique para enviar"
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
          pendingFile && 'pointer-events-none opacity-40',
          isUploading && 'pointer-events-none opacity-60',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={handleFileInputChange}
        />

        {isUploading ? (
          <UploadingIndicator />
        ) : (
          <>
            <Upload className="text-muted-foreground size-8" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {pendingFile
                  ? 'Conclua ou cancele o envio abaixo'
                  : 'Arraste arquivos ou clique para enviar'}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Imagens, PDF ou documentos Office. Maximo 10 MB.
              </p>
            </div>
          </>
        )}
      </div>

      {pendingFile && !isUploading && (
        <PendingFileCard
          file={pendingFile}
          documentTypeOptions={documentTypeOptions}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          onConfirm={handleConfirmUpload}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

interface PendingFileCardProps {
  readonly file: File
  readonly documentTypeOptions: readonly {
    readonly value: DocumentType
    readonly label: string
  }[]
  readonly selectedType: DocumentType | ''
  readonly onTypeChange: (type: DocumentType | '') => void
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

function PendingFileCard({
  file,
  documentTypeOptions,
  selectedType,
  onTypeChange,
  onConfirm,
  onCancel,
}: PendingFileCardProps) {
  return (
    <div className="rounded-lg border p-4 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-lg">
          <FileText className="text-muted-foreground size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-muted-foreground text-xs">
            {formatFileSize(file.size)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          aria-label="Cancelar envio"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-medium">
          Tipo do documento <span className="text-destructive">*</span>
        </label>
        <Select
          value={selectedType}
          onValueChange={(val) => onTypeChange(val as DocumentType)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo..." />
          </SelectTrigger>
          <SelectContent>
            {documentTypeOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" onClick={onConfirm} disabled={selectedType === ''}>
          Enviar documento
        </Button>
      </div>
    </div>
  )
}

function UploadingIndicator() {
  return (
    <>
      <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <p className="text-sm font-medium">Enviando documento...</p>
    </>
  )
}
```

**Important notes for the implementer:**

- The `Select` import paths depend on the project's shadcn setup. The project uses Base UI `@base-ui/react/select`. Check `apps/web/src/components/ui/select.tsx` for the exact exports available. The component may export `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — or it may use a different API (like `Select.Root`, `Select.Trigger`, etc.). Adapt the imports and JSX to match the actual exports.
- If the Base UI Select uses a different API than the code above, adjust the `PendingFileCard` component accordingly. The key behavior: a dropdown with placeholder text, list of options, and controlled value.
- The `branch` prop is optional to maintain backward compatibility — when not provided, the component defaults to a single "Outro" option and uploads immediately (same behavior as before).

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter web typecheck`

Expected: No errors. If there are Select import issues, check `apps/web/src/components/ui/select.tsx` for the correct export names and adjust imports.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/documents/components/document-upload.tsx
git commit -m "feat(web): add staged upload flow with document type selector"
```

---

### Task 6: Pass branch prop from proposal-detail to DocumentUpload

**Files:**

- Modify: `apps/web/src/features/proposals/components/proposal-detail.tsx:205-207`

- [ ] **Step 1: Pass branch prop**

In `apps/web/src/features/proposals/components/proposal-detail.tsx`, change the DocumentUpload usage on line 206 from:

```tsx
<DocumentUpload entityType="PROPOSAL" entityId={proposalId} />
```

to:

```tsx
<DocumentUpload
  entityType="PROPOSAL"
  entityId={proposalId}
  branch={proposal.branch}
/>
```

The `proposal` variable is already available (line 76: `const proposal = data.data`) and has `.branch` typed as `InsuranceBranch`.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter web typecheck`

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/proposals/components/proposal-detail.tsx
git commit -m "feat(web): pass insurance branch to document upload in proposal detail"
```

---

### Task 7: Build and verify end-to-end

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`

Expected: Zero errors across all packages.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: Zero errors. Fix any issues (likely unused imports or formatting).

- [ ] **Step 3: Run build**

Run: `pnpm build`

Expected: Successful build for all apps.

- [ ] **Step 4: Run tests**

Run: `pnpm test`

Expected: All existing tests pass. No regressions.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(web): lint and build fixes for document type selector"
```
