# Settings Organizacao — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable OWNER to view/edit organization profile (name, slug, logo) from Settings > Organizacao. Non-OWNER roles see read-only view. Activates the currently disabled "Organizacao" sidebar item.
**Architecture:** 3 new backend routes (GET/PUT org, PUT logo) in Fastify + new `organization` feature directory in Next.js frontend with React Hook Form + Zod + React Query.
**Tech Stack:** Fastify 5, Prisma 7, Zod, React 19, Next.js 16, TanStack React Query, React Hook Form, shadcn/ui, StorageProvider (R2/Local)
**Spec:** `docs/superpowers/specs/2026-03-25-settings-organizacao-design.md`

---

## File Structure

**Create:**

- `apps/server/src/schemas/organization.schemas.ts` — Zod schemas for org update + response
- `apps/server/src/routes/v1/organization-routes.ts` — GET/PUT org, PUT logo routes
- `apps/web/src/features/organization/types.ts` — OrganizationData interface
- `apps/web/src/features/organization/hooks/use-organization.ts` — query hook
- `apps/web/src/features/organization/hooks/use-update-organization.ts` — mutation hook
- `apps/web/src/features/organization/hooks/use-upload-logo.ts` — logo upload mutation hook
- `apps/web/src/features/organization/components/organization-page.tsx` — container with 4 UI states
- `apps/web/src/features/organization/components/organization-form.tsx` — RHF + Zod form
- `apps/web/src/features/organization/components/logo-upload.tsx` — drag-and-drop image upload

**Modify:**

- `apps/server/src/app.ts` — register organizationRoutes
- `apps/web/src/features/channels/components/settings-layout.tsx` — enable "Organizacao" nav item
- `apps/web/src/app/(dashboard)/settings/page.tsx` — add `'organizacao'` case to SettingsContent
- `apps/web/src/lib/api-client.ts` — add `upload` method for multipart form data

---

## Task 1: Backend Schemas & Route File

**Files:**

- Create: `apps/server/src/schemas/organization.schemas.ts`
- Create: `apps/server/src/routes/v1/organization-routes.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create Zod schemas for organization**

Create `apps/server/src/schemas/organization.schemas.ts`:

```typescript
import { z } from 'zod'

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter pelo menos 2 caracteres')
    .max(50, 'Slug deve ter no maximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minusculas, numeros e hifens'
    ),
})

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>
```

- [ ] **Step 2: Create organization routes with GET, PUT org, and PUT logo**

Create `apps/server/src/routes/v1/organization-routes.ts` following the `member-routes.ts` pattern:

```typescript
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { prisma } from '@repo/db'
import { container } from '@repo/core'
import type { StorageProvider } from '@repo/core'
import { tenantMiddleware } from '../../middlewares/tenant-middleware.js'
import { requireAbility } from '../../middlewares/ability-middleware.js'
import { updateOrganizationSchema } from '../../schemas/organization.schemas.js'
import { auditUpdate } from '../../services/audit-logger.js'

const MAX_LOGO_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

function logoStorageKey(organizationId: string, filename: string): string {
  return `organizations/${organizationId}/logo/${Date.now()}-${filename}`
}

export async function organizationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', tenantMiddleware)

  // GET /api/v1/organization — any authenticated member can read
  app.get(
    '/api/v1/organization',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = request.organizationId!

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
        },
      })

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Organization not found' },
        })
      }

      let logoUrl: string | null = null
      if (org.logo) {
        const storage = container.resolve<StorageProvider>('StorageProvider')
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      return reply.send({
        success: true,
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: logoUrl,
          createdAt: org.createdAt.toISOString(),
        },
      })
    }
  )

  // PUT /api/v1/organization — OWNER only
  app.put(
    '/api/v1/organization',
    { preHandler: [requireAbility('manage', 'Organization')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = request.organizationId!
      const body = updateOrganizationSchema.parse(request.body)

      // Check slug uniqueness (exclude current org)
      const existingSlug = await prisma.organization.findFirst({
        where: { slug: body.slug, id: { not: organizationId } },
        select: { id: true },
      })

      if (existingSlug) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'SLUG_CONFLICT',
            message: 'Este slug ja esta em uso por outra organizacao',
          },
        })
      }

      const before = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true, slug: true },
      })

      const updated = await prisma.organization.update({
        where: { id: organizationId },
        data: { name: body.name, slug: body.slug },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          createdAt: true,
        },
      })

      auditUpdate({
        request,
        entityType: 'Organization',
        entityId: organizationId,
        before: { name: before?.name, slug: before?.slug },
        after: { name: body.name, slug: body.slug },
      })

      let logoUrl: string | null = null
      if (updated.logo) {
        const storage = container.resolve<StorageProvider>('StorageProvider')
        logoUrl = await storage.getSignedUrl(updated.logo)
      }

      return reply.send({
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          slug: updated.slug,
          logo: logoUrl,
          createdAt: updated.createdAt.toISOString(),
        },
      })
    }
  )

  // PUT /api/v1/organization/logo — OWNER only, multipart upload
  app.put(
    '/api/v1/organization/logo',
    { preHandler: [requireAbility('manage', 'Organization')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const organizationId = request.organizationId!
      const file = await request.file()

      if (!file) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'FILE_REQUIRED',
            message: 'Um arquivo e necessario para upload',
          },
        })
      }

      if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'O logo deve ser uma imagem (JPEG, PNG, WebP ou GIF)',
          },
        })
      }

      const buffer = await file.toBuffer()

      if (buffer.byteLength > MAX_LOGO_SIZE) {
        return reply.status(413).send({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'O logo deve ter no maximo 2MB',
          },
        })
      }

      const storage = container.resolve<StorageProvider>('StorageProvider')

      // Delete old logo if exists
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { logo: true },
      })

      if (org?.logo) {
        await storage.delete(org.logo)
      }

      const key = logoStorageKey(organizationId, file.filename)
      await storage.upload(key, buffer, file.mimetype)

      await prisma.organization.update({
        where: { id: organizationId },
        data: { logo: key },
      })

      auditUpdate({
        request,
        entityType: 'Organization',
        entityId: organizationId,
        before: { logo: org?.logo ?? null },
        after: { logo: key },
      })

      const logoUrl = await storage.getSignedUrl(key)

      return reply.send({
        success: true,
        data: { logo: logoUrl },
      })
    }
  )
}
```

- [ ] **Step 3: Register organization routes in app.ts**

In `apps/server/src/app.ts`, add import:

```typescript
import { organizationRoutes } from './routes/v1/organization-routes.js'
```

And register inside the authenticated scope (after `memberRoutes`):

```typescript
await authenticatedApp.register(organizationRoutes)
```

- [ ] **Step 4: Verify backend compiles**

```bash
cd apps/server && pnpm tsc --noEmit
```

- [ ] **Step 5: Commit backend routes**

```bash
git add apps/server/src/schemas/organization.schemas.ts apps/server/src/routes/v1/organization-routes.ts apps/server/src/app.ts
git commit -m "feat(server): add organization GET/PUT routes and logo upload"
```

---

## Task 2: Frontend API Client Upload Support & Types

**Files:**

- Modify: `apps/web/src/lib/api-client.ts`
- Create: `apps/web/src/features/organization/types.ts`

- [ ] **Step 1: Add multipart upload method to api-client**

In `apps/web/src/lib/api-client.ts`, add an `upload` method to the `api` object that sends `FormData` without setting `Content-Type` (browser sets it with boundary automatically):

```typescript
upload: <TData>(path: string, formData: FormData) =>
  request<TData>(path, {
    method: 'PUT',
    body: formData,
  }),
```

Also update the `request` function to not set `Content-Type: application/json` when body is `FormData`:

```typescript
if (options.body && !(options.body instanceof FormData)) {
  headers['Content-Type'] = 'application/json'
}
```

And ensure the body is not JSON-stringified for FormData — the `upload` method passes `FormData` directly as `body` (no `JSON.stringify`).

- [ ] **Step 2: Create organization types**

Create `apps/web/src/features/organization/types.ts`:

```typescript
export interface OrganizationData {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly logo: string | null
  readonly createdAt: string
}
```

- [ ] **Step 3: Commit types and api-client update**

```bash
git add apps/web/src/lib/api-client.ts apps/web/src/features/organization/types.ts
git commit -m "feat(web): add multipart upload to api-client and organization types"
```

---

## Task 3: Frontend React Query Hooks

**Files:**

- Create: `apps/web/src/features/organization/hooks/use-organization.ts`
- Create: `apps/web/src/features/organization/hooks/use-update-organization.ts`
- Create: `apps/web/src/features/organization/hooks/use-upload-logo.ts`

- [ ] **Step 1: Create useOrganization query hook**

Create `apps/web/src/features/organization/hooks/use-organization.ts`:

```typescript
'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api-client'
import type { OrganizationData } from '../types'

export const ORGANIZATION_KEY = ['organization'] as const

export function useOrganization() {
  return useQuery({
    queryKey: ORGANIZATION_KEY,
    queryFn: async () => {
      const response = await api.get<OrganizationData>('/api/v1/organization')
      return response.data
    },
    staleTime: 60_000,
  })
}
```

- [ ] **Step 2: Create useUpdateOrganization mutation hook**

Create `apps/web/src/features/organization/hooks/use-update-organization.ts`:

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api-client'
import type { OrganizationData } from '../types'
import { ORGANIZATION_KEY } from './use-organization'

interface UpdateOrganizationPayload {
  name: string
  slug: string
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateOrganizationPayload) => {
      const response = await api.put<OrganizationData>(
        '/api/v1/organization',
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY })
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
      toast.success('Organizacao atualizada com sucesso')
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'SLUG_CONFLICT') {
        toast.error('Este slug ja esta em uso por outra organizacao')
        return
      }
      toast.error('Erro ao atualizar organizacao')
    },
  })
}
```

- [ ] **Step 3: Create useUploadLogo mutation hook**

Create `apps/web/src/features/organization/hooks/use-upload-logo.ts`:

```typescript
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api-client'
import { ORGANIZATION_KEY } from './use-organization'

export function useUploadLogo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await api.upload<{ logo: string }>(
        '/api/v1/organization/logo',
        formData
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORGANIZATION_KEY })
      queryClient.invalidateQueries({ queryKey: ['orgs'] })
      toast.success('Logo atualizado com sucesso')
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) {
        toast.error('Erro ao enviar logo')
        return
      }
      if (error.code === 'FILE_TOO_LARGE') {
        toast.error('O logo deve ter no maximo 2MB')
        return
      }
      if (error.code === 'INVALID_FILE_TYPE') {
        toast.error('O logo deve ser uma imagem (JPEG, PNG, WebP ou GIF)')
        return
      }
      toast.error('Erro ao enviar logo')
    },
  })
}
```

- [ ] **Step 4: Commit hooks**

```bash
git add apps/web/src/features/organization/hooks/
git commit -m "feat(web): add organization React Query hooks (get, update, upload logo)"
```

---

## Task 4: Frontend Components — OrganizationForm & LogoUpload

**Files:**

- Create: `apps/web/src/features/organization/components/organization-form.tsx`
- Create: `apps/web/src/features/organization/components/logo-upload.tsx`

- [ ] **Step 1: Create OrganizationForm component**

Create `apps/web/src/features/organization/components/organization-form.tsx`:

Uses React Hook Form + Zod. Fields: `name` (Input), `slug` (Input with URL preview showing `app.bensseguros.com/{slug}`). When `isReadOnly` is true, all fields are disabled and the Save button is hidden.

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useUpdateOrganization } from '../hooks/use-update-organization'
import type { OrganizationData } from '../types'

const formSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome deve ter no maximo 100 caracteres'),
  slug: z
    .string()
    .min(2, 'Slug deve ter pelo menos 2 caracteres')
    .max(50, 'Slug deve ter no maximo 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minusculas, numeros e hifens'),
})

type FormValues = z.infer<typeof formSchema>

interface OrganizationFormProps {
  readonly organization: OrganizationData
  readonly isReadOnly: boolean
}

export function OrganizationForm({ organization, isReadOnly }: OrganizationFormProps) {
  const updateOrg = useUpdateOrganization()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  })

  function onSubmit(values: FormValues) {
    updateOrg.mutate(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Organizacao</FormLabel>
              <FormControl>
                <Input {...field} disabled={isReadOnly} placeholder="Minha Corretora" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input {...field} disabled={isReadOnly} placeholder="minha-corretora" />
              </FormControl>
              <FormDescription>
                Identificador unico da organizacao na URL
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {!isReadOnly && (
          <Button type="submit" disabled={updateOrg.isPending}>
            {updateOrg.isPending ? 'Salvando...' : 'Salvar Alteracoes'}
          </Button>
        )}
      </form>
    </Form>
  )
}
```

- [ ] **Step 2: Create LogoUpload component**

Create `apps/web/src/features/organization/components/logo-upload.tsx`:

Drag-and-drop zone or click-to-upload. Shows current logo as avatar preview (or placeholder icon). Accepts `image/*`, max 2MB. Calls `useUploadLogo` on file select. Shows loading state during upload. Disabled when `isReadOnly`.

```typescript
'use client'

import { useCallback, useRef } from 'react'
import { Building2, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUploadLogo } from '../hooks/use-upload-logo'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

interface LogoUploadProps {
  readonly currentLogo: string | null
  readonly isReadOnly: boolean
}

export function LogoUpload({ currentLogo, isReadOnly }: LogoUploadProps) {
  const uploadLogo = useUploadLogo()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        return // hook handles the toast via API error
      }
      uploadLogo.mutate(file)
    },
    [uploadLogo]
  )

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }

  function handleClick() {
    if (isReadOnly) return
    inputRef.current?.click()
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-selected
    event.target.value = ''
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Logo</p>
      <div
        role="button"
        tabIndex={isReadOnly ? -1 : 0}
        aria-label={isReadOnly ? 'Logo da organizacao' : 'Clique ou arraste para enviar o logo'}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
        className={cn(
          'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors',
          isReadOnly
            ? 'cursor-default border-muted'
            : 'cursor-pointer border-muted-foreground/25 hover:border-primary/50',
          uploadLogo.isPending && 'pointer-events-none opacity-60'
        )}
      >
        {uploadLogo.isPending ? (
          <Loader2 className="text-muted-foreground size-10 animate-spin" />
        ) : currentLogo ? (
          <img
            src={currentLogo}
            alt="Logo da organizacao"
            className="size-20 rounded-lg object-contain"
          />
        ) : (
          <Building2 className="text-muted-foreground size-10" />
        )}

        {!isReadOnly && !uploadLogo.isPending && (
          <div className="text-center">
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <Upload className="size-4" />
              Clique ou arraste uma imagem
            </p>
            <p className="text-muted-foreground/70 text-xs">
              PNG, JPG ou WebP. Maximo 2MB.
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit form and logo upload components**

```bash
git add apps/web/src/features/organization/components/organization-form.tsx apps/web/src/features/organization/components/logo-upload.tsx
git commit -m "feat(web): add OrganizationForm and LogoUpload components"
```

---

## Task 5: Frontend Container — OrganizationPage

**Files:**

- Create: `apps/web/src/features/organization/components/organization-page.tsx`

- [ ] **Step 1: Create OrganizationPage container component**

Create `apps/web/src/features/organization/components/organization-page.tsx`:

Handles all 4 UI states (Loading skeleton, Error with retry, Empty — should not occur, Success with form + logo). Checks user role via `useOrgs` to determine `isReadOnly` (only OWNER can edit).

```typescript
'use client'

import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { useOrganization } from '../hooks/use-organization'
import { OrganizationForm } from './organization-form'
import { LogoUpload } from './logo-upload'

const OWNER_ROLE = 'OWNER' as const

export function OrganizationPage() {
  const { activeOrg } = useOrgs()
  const { data: organization, isLoading, isError, refetch } = useOrganization()

  const isReadOnly = activeOrg?.role !== OWNER_ROLE

  if (isLoading) {
    return <OrganizationSkeleton />
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <AlertCircle className="text-destructive size-10" />
        <p className="text-muted-foreground text-sm">
          Erro ao carregar dados da organizacao.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!organization) {
    return null
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Organizacao</h2>
        <p className="text-muted-foreground text-sm">
          {isReadOnly
            ? 'Informacoes da sua organizacao.'
            : 'Gerencie as informacoes da sua organizacao.'}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <OrganizationForm organization={organization} isReadOnly={isReadOnly} />
        <LogoUpload currentLogo={organization.logo} isReadOnly={isReadOnly} />
      </div>
    </div>
  )
}

function OrganizationSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit OrganizationPage**

```bash
git add apps/web/src/features/organization/components/organization-page.tsx
git commit -m "feat(web): add OrganizationPage container with 4 UI states"
```

---

## Task 6: Settings Integration — Enable Sidebar & Wire Up Page

**Files:**

- Modify: `apps/web/src/features/channels/components/settings-layout.tsx`
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Enable Organizacao in settings sidebar**

In `apps/web/src/features/channels/components/settings-layout.tsx`, update the `organizacao` entry in `SETTINGS_SECTIONS`:

Change:

```typescript
{
  id: 'organizacao',
  label: 'Organizacao',
  icon: Building2,
  disabled: true,
  href: '#',
},
```

To:

```typescript
{
  id: 'organizacao',
  label: 'Organizacao',
  icon: Building2,
  disabled: false,
  href: '/settings?section=organizacao',
},
```

- [ ] **Step 2: Add organizacao case to settings page**

In `apps/web/src/app/(dashboard)/settings/page.tsx`, add import:

```typescript
import { OrganizationPage } from '@/features/organization/components/organization-page'
```

And add case in `SettingsContent` switch:

```typescript
case 'organizacao':
  return <OrganizationPage />
```

- [ ] **Step 3: Verify frontend compiles**

```bash
cd apps/web && pnpm tsc --noEmit
```

- [ ] **Step 4: Commit settings integration**

```bash
git add apps/web/src/features/channels/components/settings-layout.tsx apps/web/src/app/(dashboard)/settings/page.tsx
git commit -m "feat(web): integrate Organizacao into settings sidebar and page router"
```

---

## Task 7: Testing & Final Verification

**Files:**

- All created/modified files

- [ ] **Step 1: Run linting**

```bash
pnpm lint
```

Fix any lint errors. Zero errors required.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Fix any type errors. Zero errors required.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Ensure successful build across all apps and packages.

- [ ] **Step 4: Manual verification checklist**

Verify against acceptance criteria:

1. Settings sidebar shows "Organizacao" as active/clickable link
2. Clicking navigates to `?section=organizacao`
3. OWNER sees editable form with name, slug fields and logo upload
4. Non-OWNER sees read-only view (disabled inputs, no save button, no upload interaction)
5. Form submission updates org and shows success toast
6. Slug validation rejects invalid characters and duplicates
7. Logo upload accepts images, shows preview, persists after refresh
8. Logo replacement deletes old file from storage
9. All 4 UI states render (loading skeleton, error with retry, success with data)
10. Audit log entries created for updates

- [ ] **Step 5: Run Playwright QA via MCP**

Execute E2E tests for the settings organization flow:

- Navigate to Settings > Organizacao
- Verify form renders with current org data
- Edit name and slug, save, verify persistence
- Upload logo, verify preview and persistence
- Verify read-only mode for non-OWNER roles

- [ ] **Step 6: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "fix(web): address QA feedback for settings organization"
```
