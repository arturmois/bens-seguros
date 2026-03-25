# Settings > Organizacao - Design Spec

## Goal

Enable the OWNER of an organization to view and edit the organization's profile (name, slug, logo) from the Settings page. The "Organizacao" sidebar item is currently disabled with an "em breve" label; this feature activates it with a form backed by new API routes.

Only users with OWNER role can access and modify organization settings. Other roles see a read-only view.

---

## Architecture

### Backend (apps/server)

Two new routes registered under `organizationRoutes`, both gated by `tenantMiddleware` + `requireAbility('manage', 'Organization')` (OWNER only):

| Method | Path                        | Description                           |
| ------ | --------------------------- | ------------------------------------- |
| GET    | `/api/v1/organization`      | Returns current org profile           |
| PUT    | `/api/v1/organization`      | Updates name and slug                 |
| PUT    | `/api/v1/organization/logo` | Uploads/replaces org logo (multipart) |

The GET route has a relaxed guard: any authenticated member can read (no `requireAbility`), so non-OWNER roles can see the read-only view. Only PUT routes require `requireAbility('manage', 'Organization')`.

Logo upload reuses the existing `StorageProvider` (R2) from `@repo/core` document module. Storage key pattern: `organizations/{organizationId}/logo/{timestamp}-{filename}`. When a new logo is uploaded, the old one is deleted.

### Frontend (apps/web)

New feature directory: `apps/web/src/features/organization/`. The settings page router adds a case for `'organizacao'` that renders `<OrganizationPage />`.

---

## Components

### Backend Files

**`apps/server/src/routes/v1/organization-routes.ts`** - Route definitions for GET/PUT organization and PUT logo. Follows the same pattern as `tenant-routes.ts` and `document-routes.ts`.

**`apps/server/src/schemas/organization.schemas.ts`** - Zod schemas:

```
updateOrganizationSchema:
  - name: z.string().min(2).max(100)
  - slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/)

organizationResponseSchema:
  - id: z.string()
  - name: z.string()
  - slug: z.string()
  - logo: z.string().nullable()
  - createdAt: z.string().datetime()
```

### Frontend Files

**`apps/web/src/features/organization/components/organization-page.tsx`** - Container component. Fetches org data via React Query, renders form or read-only view based on user role. Handles all 4 UI states (Loading, Error, Empty, Success).

**`apps/web/src/features/organization/components/organization-form.tsx`** - React Hook Form + Zod. Fields: name (text input), slug (text input with URL preview). Submit calls PUT `/api/v1/organization`. Disabled for non-OWNER roles (read-only presentation).

**`apps/web/src/features/organization/components/logo-upload.tsx`** - Drag-and-drop or click-to-upload zone. Shows current logo as avatar preview. Accepts image/\* up to 2MB. On file select, calls PUT `/api/v1/organization/logo` via multipart form data. Shows upload progress indicator.

**`apps/web/src/features/organization/hooks/use-organization.ts`** - React Query hook for GET `/api/v1/organization`. Query key: `['organization', organizationId]`.

**`apps/web/src/features/organization/hooks/use-update-organization.ts`** - Mutation hook for PUT `/api/v1/organization`. Invalidates `['organization']` on success. Shows toast on success/error.

**`apps/web/src/features/organization/hooks/use-upload-logo.ts`** - Mutation hook for PUT `/api/v1/organization/logo`. Invalidates `['organization']` on success.

### Modified Files

**`apps/web/src/features/channels/components/settings-layout.tsx`** - Change `organizacao` entry: `disabled: false`, `href: '/settings?section=organizacao'`.

**`apps/web/src/app/(dashboard)/settings/page.tsx`** - Add case `'organizacao'` to `SettingsContent` switch, importing and rendering `<OrganizationPage />`.

---

## Data Flow

### Read Organization

```
SettingsPage (?section=organizacao)
  -> OrganizationPage
    -> useOrganization() hook
      -> GET /api/v1/organization
        -> tenantMiddleware (extracts organizationId from session)
        -> prisma.organization.findUnique({ where: { id: organizationId } })
        -> return { success: true, data: { id, name, slug, logo, createdAt } }
    -> OrganizationForm (populated with data)
    -> LogoUpload (shows current logo or placeholder)
```

### Update Organization

```
OrganizationForm (submit)
  -> useUpdateOrganization().mutate({ name, slug })
    -> PUT /api/v1/organization
      -> tenantMiddleware
      -> requireAbility('manage', 'Organization')
      -> validate body with updateOrganizationSchema
      -> check slug uniqueness (exclude current org)
      -> prisma.organization.update({ where: { id }, data: { name, slug } })
      -> auditCreate(request, 'organization.updated', { name, slug })
      -> return { success: true, data: updated org }
    -> invalidate ['organization'] query
    -> toast success
```

### Upload Logo

```
LogoUpload (file selected)
  -> useUploadLogo().mutate(file)
    -> PUT /api/v1/organization/logo (multipart/form-data)
      -> tenantMiddleware
      -> requireAbility('manage', 'Organization')
      -> validate file (image/*, max 2MB)
      -> if existing logo key: storageProvider.delete(oldKey)
      -> storageProvider.upload(newKey, buffer, contentType)
      -> prisma.organization.update({ where: { id }, data: { logo: storageKey } })
      -> auditCreate(request, 'organization.logo_updated', {})
      -> return { success: true, data: { logo: storageKey } }
    -> invalidate ['organization'] query
```

### Logo Display

The `logo` field in Organization stores a storage key (not a URL). To display it, the frontend requests a signed URL. Two options:

**Option A (recommended):** The GET `/api/v1/organization` route resolves the logo to a signed URL before returning, so the frontend receives a ready-to-use URL. This avoids an extra round-trip.

**Option B:** Return the raw key and have the frontend call a separate endpoint. Not recommended for this use case.

Go with Option A. The GET route calls `storageProvider.getSignedUrl(logo)` if logo is non-null, and returns the URL in the `logo` field.

---

## Error Handling

| Scenario                  | HTTP Status | Error Code        | Message                                             |
| ------------------------- | ----------- | ----------------- | --------------------------------------------------- |
| Not authenticated         | 401         | UNAUTHORIZED      | Authentication required                             |
| No active organization    | 400         | NO_ORGANIZATION   | No active organization selected                     |
| Not a member              | 403         | FORBIDDEN         | Not a member of this organization                   |
| Non-OWNER attempts update | 403         | FORBIDDEN         | Insufficient permissions: manage Organization       |
| Slug already taken        | 409         | SLUG_CONFLICT     | This slug is already in use by another organization |
| Invalid input (Zod)       | 422         | VALIDATION_ERROR  | Zod error message (formatted)                       |
| File too large (>2MB)     | 413         | FILE_TOO_LARGE    | Logo must be under 2MB                              |
| Invalid file type         | 400         | INVALID_FILE_TYPE | Logo must be an image file                          |
| No file provided          | 400         | FILE_REQUIRED     | A file is required for upload                       |
| Organization not found    | 404         | NOT_FOUND         | Organization not found                              |

Frontend error handling:

- React Query `onError` callbacks display toast notifications with the error message
- Form validation errors displayed inline via React Hook Form field errors
- Network errors caught by a global error boundary or React Query's retry logic (3 retries with backoff)

---

## Acceptance Criteria

1. OWNER can navigate to Settings > Organizacao and see the current org name, slug, and logo
2. OWNER can edit the org name and slug, save, and see updated values persisted
3. OWNER can upload a logo image (PNG/JPG/WebP, max 2MB), see it previewed, and see it persist after refresh
4. OWNER can replace an existing logo (old file is deleted from R2)
5. Slug validation enforces lowercase alphanumeric + hyphens, and rejects duplicates with a clear error
6. Non-OWNER roles (ADMIN, MANAGER, COMMERCIAL, VIEWER) see the org info in read-only mode (no edit buttons, form fields disabled)
7. Non-OWNER roles receive 403 if they attempt PUT requests directly
8. All 4 UI states render correctly: Loading (skeleton), Error (error message + retry), Empty (should not occur for existing org), Success (form with data)
9. Sidebar "Organizacao" item is enabled with working navigation
10. Audit log entries created for `organization.updated` and `organization.logo_updated` events
11. All responses follow `{ success, data }` / `{ success, error: { code, message } }` pattern
12. Zero `any` types, zero `console.log`, all files kebab-case, components under 200 lines
