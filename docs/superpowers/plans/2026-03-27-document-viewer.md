# Document Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add view (Eye icon) and download buttons to the document list, replacing the current ExternalLink icon.

**Architecture:** Frontend-only change to `document-list.tsx`. Rename `OpenDocumentButton` to `ViewDocumentButton` with Eye icon. Add new `DownloadDocumentButton` using fetch+blob to force download. No backend changes.

**Tech Stack:** React 19, lucide-react icons, sonner toast

---

### Task 1: Replace ExternalLink with Eye icon and add Download button

**Files:**

- Modify: `apps/web/src/features/documents/components/document-list.tsx`

- [ ] **Step 1: Update imports**

In `apps/web/src/features/documents/components/document-list.tsx`, change the lucide import on line 4 from:

```typescript
import { ExternalLink, File, Trash2 } from 'lucide-react'
```

to:

```typescript
import { Download, Eye, File, Trash2 } from 'lucide-react'
```

- [ ] **Step 2: Rename OpenDocumentButton to ViewDocumentButton and change icon**

Replace the `OpenDocumentButton` function (lines 135-169) with:

```tsx
function ViewDocumentButton({
  documentId,
  fileName,
}: {
  readonly documentId: string
  readonly fileName: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleView() {
    setIsLoading(true)
    try {
      const response = await api.get<{ url: string }>(
        `/api/v1/documents/${documentId}/url`
      )
      window.open(response.data.url, '_blank', 'noopener')
    } catch {
      toast.error('Erro ao abrir documento')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleView}
      disabled={isLoading}
      aria-label={`Visualizar ${fileName}`}
    >
      <Eye className="size-4" />
    </Button>
  )
}
```

- [ ] **Step 3: Add DownloadDocumentButton component**

Add a new function after `ViewDocumentButton`:

```tsx
function DownloadDocumentButton({
  documentId,
  fileName,
}: {
  readonly documentId: string
  readonly fileName: string
}) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleDownload() {
    setIsLoading(true)
    try {
      const response = await api.get<{ url: string }>(
        `/api/v1/documents/${documentId}/url`
      )
      const fileResponse = await fetch(response.data.url)
      const blob = await fileResponse.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error('Erro ao baixar documento')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      aria-label={`Baixar ${fileName}`}
    >
      <Download className="size-4" />
    </Button>
  )
}
```

- [ ] **Step 4: Update DocumentRow to use both buttons**

In the `DocumentRow` function, replace the buttons section (lines 117-130) from:

```tsx
<div className="flex shrink-0 items-center gap-1">
  <OpenDocumentButton documentId={document.id} fileName={document.fileName} />
  <Button
    variant="ghost"
    size="sm"
    onClick={onDelete}
    aria-label={`Excluir ${document.fileName}`}
  >
    <Trash2 className="text-destructive size-4" />
  </Button>
</div>
```

to:

```tsx
<div className="flex shrink-0 items-center gap-1">
  <ViewDocumentButton documentId={document.id} fileName={document.fileName} />
  <DownloadDocumentButton
    documentId={document.id}
    fileName={document.fileName}
  />
  <Button
    variant="ghost"
    size="sm"
    onClick={onDelete}
    aria-label={`Excluir ${document.fileName}`}
  >
    <Trash2 className="text-destructive size-4" />
  </Button>
</div>
```

- [ ] **Step 5: Verify typecheck and lint**

Run: `pnpm --filter web typecheck && pnpm --filter web lint`

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/documents/components/document-list.tsx
git commit -m "feat(web): add view and download buttons to document list (SCRUM-37)"
```

---

### Task 2: Build verification

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`

Expected: Zero errors across all packages.

- [ ] **Step 2: Run lint**

Run: `pnpm lint`

Expected: Zero errors.

- [ ] **Step 3: Run build**

Run: `pnpm build`

Expected: Successful build for all apps.

- [ ] **Step 4: Run tests**

Run: `pnpm test`

Expected: All existing tests pass.

- [ ] **Step 5: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(web): lint and build fixes for document viewer"
```
