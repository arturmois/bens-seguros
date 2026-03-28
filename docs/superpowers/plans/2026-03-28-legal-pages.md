# Legal Pages (Terms of Use & Privacy Policy) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create LGPD-compliant Terms of Use and Privacy Policy pages with versioned consent tracking, registration checkbox, and re-acceptance modal.

**Architecture:** Static legal content served from data files through a shared `LegalPageLayout` component with sidebar TOC + scroll spy. Consent tracked via Prisma `TermsAcceptance` model + denormalized fields on `User`. Re-acceptance enforced by a blocking modal in the dashboard shell.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui (@coss/style), Prisma 7, Better Auth, Zod, React Hook Form

**Spec:** `docs/superpowers/specs/2026-03-28-legal-pages-design.md`

---

## File Map

| Action | Path                                                                | Responsibility                              |
| ------ | ------------------------------------------------------------------- | ------------------------------------------- |
| Create | `packages/core/src/shared/legal-constants.ts`                       | Version constants + export                  |
| Modify | `packages/core/src/index.ts`                                        | Re-export legal constants                   |
| Create | `apps/web/src/features/legal/types.ts`                              | `LegalSection`, `LegalDocument` interfaces  |
| Create | `apps/web/src/features/legal/data/terms-of-use.ts`                  | Terms content v1.0                          |
| Create | `apps/web/src/features/legal/data/privacy-policy.ts`                | Privacy content v1.0                        |
| Create | `apps/web/src/features/legal/components/legal-page-layout.tsx`      | Shared layout with sidebar TOC + scroll spy |
| Create | `apps/web/src/app/(marketing)/termos-de-uso/page.tsx`               | Terms page route                            |
| Create | `apps/web/src/app/(marketing)/politica-de-privacidade/page.tsx`     | Privacy page route                          |
| Modify | `apps/web/src/features/marketing/components/marketing-footer.tsx`   | Update placeholder links                    |
| Modify | `packages/db/prisma/schema.prisma`                                  | Add `TermsAcceptance` model + User fields   |
| Create | `apps/server/src/routes/terms-routes.ts`                            | API endpoint for accepting terms            |
| Modify | `apps/server/src/app.ts`                                            | Register terms routes                       |
| Modify | `apps/web/src/features/auth/components/register-form.tsx`           | Add terms checkbox                          |
| Create | `apps/web/src/features/legal/components/terms-acceptance-modal.tsx` | Re-acceptance blocking modal                |
| Create | `apps/web/src/features/legal/hooks/use-terms-acceptance.ts`         | Hook to check + accept terms                |
| Modify | `apps/web/src/components/layout/dashboard-shell.tsx`                | Add re-acceptance check                     |

---

### Task 1: Legal Constants

**Files:**

- Create: `packages/core/src/shared/legal-constants.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Create legal constants file**

```typescript
// packages/core/src/shared/legal-constants.ts
export const CURRENT_TERMS_VERSION = '1.0'
export const CURRENT_PRIVACY_VERSION = '1.0'
```

- [ ] **Step 2: Export from packages/core**

Add to `packages/core/src/index.ts`, after the existing CSV exports:

```typescript
export {
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
} from './shared/legal-constants.js'
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter @repo/core build`
Expected: Successful build

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/shared/legal-constants.ts packages/core/src/index.ts
git commit -m "feat(legal): add terms and privacy version constants"
```

---

### Task 2: Legal Types

**Files:**

- Create: `apps/web/src/features/legal/types.ts`

- [ ] **Step 1: Create types file**

```typescript
// apps/web/src/features/legal/types.ts
export interface LegalSection {
  id: string
  title: string
  content: string
}

export interface LegalDocument {
  title: string
  version: string
  updatedAt: string
  sections: LegalSection[]
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/legal/types.ts
git commit -m "feat(legal): add LegalSection and LegalDocument types"
```

---

### Task 3: Terms of Use Content

**Files:**

- Create: `apps/web/src/features/legal/data/terms-of-use.ts`

- [ ] **Step 1: Create terms data file**

Create `apps/web/src/features/legal/data/terms-of-use.ts` with the complete terms content from the spec (sections 4.1 through 4.13). Each section is an object in the `sections` array:

```typescript
import { CURRENT_TERMS_VERSION } from '@repo/core'
import type { LegalDocument } from '../types'

export const termsOfUse: LegalDocument = {
  title: 'Termos de Uso',
  version: CURRENT_TERMS_VERSION,
  updatedAt: '2026-03-28',
  sections: [
    {
      id: 'aceitacao-dos-termos',
      title: '1. Aceitação dos Termos',
      content: `Ao criar uma conta ou utilizar o Bens Seguros, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso. O uso continuado da plataforma após alterações constitui aceitação dos termos revisados.`,
    },
    {
      id: 'descricao-do-servico',
      title: '2. Descrição do Serviço',
      content: `O Bens Seguros é uma plataforma SaaS (Software as a Service) de gestão para corretoras de seguros, oferecendo funcionalidades de:

• Gestão de propostas e apólices
• Controle de comissões
• Cadastro de clientes
• Atendimento multicanal (WhatsApp, chat web, Messenger, Instagram)
• Gestão de documentos
• Relatórios e dashboard analítico
• Assistência com inteligência artificial`,
    },
    {
      id: 'cadastro-e-conta',
      title: '3. Cadastro e Conta',
      content: `• O usuário deve fornecer informações verdadeiras, atualizadas e completas.
• Cada organização (corretora) é identificada por CNPJ único.
• O usuário é responsável pela confidencialidade de suas credenciais de acesso.
• É proibido compartilhar credenciais ou permitir acesso de terceiros não autorizados.
• O Bens Seguros pode suspender contas com informações falsas ou incompletas.`,
    },
    {
      id: 'planos-e-pagamento',
      title: '4. Planos e Pagamento',
      content: `• A plataforma oferece planos gratuitos e pagos com diferentes limites de funcionalidades.
• A cobrança dos planos pagos é recorrente (mensal ou anual), conforme o plano contratado.
• Reajustes de preço serão comunicados com antecedência mínima de 30 (trinta) dias.
• O não pagamento após o vencimento poderá resultar em suspensão do acesso às funcionalidades do plano contratado.
• Não há reembolso proporcional em caso de cancelamento antes do fim do período contratado, salvo disposição legal em contrário.`,
    },
    {
      id: 'obrigacoes-do-usuario',
      title: '5. Obrigações do Usuário',
      content: `O usuário compromete-se a:

• Utilizar a plataforma exclusivamente para fins lícitos e relacionados à atividade de corretagem de seguros.
• Não realizar engenharia reversa, descompilação ou tentativa de acesso ao código-fonte.
• Não utilizar ferramentas automatizadas (bots, scrapers) sem autorização prévia.
• Respeitar os limites de uso do plano contratado.
• Manter seus dados cadastrais atualizados.
• Cumprir a legislação vigente, incluindo a LGPD, no tratamento de dados pessoais de seus clientes.`,
    },
    {
      id: 'obrigacoes-da-plataforma',
      title: '6. Obrigações da Plataforma',
      content: `O Bens Seguros compromete-se a:

• Disponibilizar a plataforma de forma contínua, ressalvadas manutenções programadas e eventos de força maior.
• Realizar backups periódicos dos dados armazenados.
• Implementar medidas de segurança compatíveis com o estado da técnica para proteção dos dados.
• Oferecer suporte técnico nos canais disponibilizados.
• Comunicar incidentes de segurança que possam afetar dados pessoais, conforme exigido pela LGPD.

A plataforma não garante disponibilidade ininterrupta (SLA formal não está incluído nos termos gerais).`,
    },
    {
      id: 'propriedade-intelectual',
      title: '7. Propriedade Intelectual',
      content: `• A plataforma Bens Seguros, incluindo seu código-fonte, design, marcas, logotipos e documentação, é propriedade exclusiva de [INSERIR RAZÃO SOCIAL].
• Os dados inseridos pelo usuário e por sua organização permanecem de propriedade do usuário/organização.
• O usuário concede ao Bens Seguros uma licença limitada, não exclusiva e revogável para processar seus dados exclusivamente para a prestação do serviço.
• É vedada a reprodução, distribuição ou criação de obras derivadas da plataforma sem autorização prévia por escrito.`,
    },
    {
      id: 'dados-e-privacidade',
      title: '8. Dados e Privacidade',
      content: `O tratamento de dados pessoais realizado pelo Bens Seguros é regido pela Política de Privacidade, disponível em /politica-de-privacidade, que é parte integrante destes Termos de Uso. Ao aceitar estes Termos, o usuário declara ter lido e concordado também com a Política de Privacidade.`,
    },
    {
      id: 'limitacao-de-responsabilidade',
      title: '9. Limitação de Responsabilidade',
      content: `• O Bens Seguros não garante resultados específicos decorrentes do uso da plataforma.
• A responsabilidade do Bens Seguros por danos diretos está limitada ao valor total pago pelo usuário nos últimos 12 (doze) meses.
• O Bens Seguros não será responsável por danos indiretos, incidentais, consequenciais, lucros cessantes ou perda de dados, exceto nos casos previstos em lei.
• O Bens Seguros não se responsabiliza por decisões de negócio tomadas pelo usuário com base em informações da plataforma, incluindo sugestões geradas por inteligência artificial.`,
    },
    {
      id: 'suspensao-e-rescisao',
      title: '10. Suspensão e Rescisão',
      content: `• O Bens Seguros poderá suspender ou encerrar a conta do usuário em caso de violação destes Termos, sem prejuízo de outras medidas cabíveis.
• O usuário pode cancelar sua conta a qualquer momento através das configurações da plataforma.
• Após o cancelamento, os dados do usuário permanecerão acessíveis para exportação por 30 (trinta) dias, após os quais serão eliminados conforme a Política de Privacidade.
• Dados sujeitos a obrigação legal de retenção (fiscal, regulatória) serão mantidos pelo prazo exigido por lei, mesmo após o cancelamento.`,
    },
    {
      id: 'alteracoes-nos-termos',
      title: '11. Alterações nos Termos',
      content: `• O Bens Seguros pode alterar estes Termos a qualquer momento.
• Alterações materiais serão comunicadas por email e por banner na plataforma com antecedência mínima de 15 (quinze) dias.
• Alterações materiais exigirão re-aceite explícito do usuário para continuar utilizando a plataforma.
• O histórico de versões estará disponível para consulta.`,
    },
    {
      id: 'disposicoes-gerais',
      title: '12. Disposições Gerais',
      content: `• Estes Termos são regidos pelas leis da República Federativa do Brasil.
• Fica eleito o foro da comarca de [INSERIR CIDADE/UF] para dirimir quaisquer controvérsias, com exclusão de qualquer outro, por mais privilegiado que seja.
• A invalidade ou nulidade de qualquer cláusula não compromete as demais disposições destes Termos.
• A tolerância de qualquer das partes quanto ao descumprimento de qualquer cláusula não constituirá renúncia ao direito de exigi-la.`,
    },
    {
      id: 'contato',
      title: '13. Contato',
      content: `Para dúvidas sobre estes Termos de Uso:

• Email: [INSERIR EMAIL]
• Endereço: [INSERIR ENDEREÇO COMPLETO]`,
    },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/legal/data/terms-of-use.ts
git commit -m "feat(legal): add Terms of Use content v1.0"
```

---

### Task 4: Privacy Policy Content

**Files:**

- Create: `apps/web/src/features/legal/data/privacy-policy.ts`

- [ ] **Step 1: Create privacy policy data file**

Create `apps/web/src/features/legal/data/privacy-policy.ts` with the complete privacy content from the spec (sections 5.1 through 5.17). Same structure as terms — import `CURRENT_PRIVACY_VERSION` from `@repo/core`, export a `LegalDocument` object named `privacyPolicy`.

Full content from spec sections 5.1–5.17 — each section maps to one entry in `sections[]`. Use the same format: `id` (kebab-case slug), `title` (numbered), `content` (full text with `•` for bullet lists, table data as readable text).

Key sections:

- `introducao-e-compromisso` — Company info with [INSERIR] placeholders
- `definicoes` — LGPD Art. 5º definitions
- `dados-que-coletamos` — Table of categories (Cadastrais, Empresariais, De uso, De clientes, Financeiros, De comunicação)
- `bases-legais` — LGPD Art. 7º (Consentimento, Execução de contrato, Obrigação legal, Legítimo interesse)
- `finalidade-do-tratamento` — Data × Purpose × Legal basis table
- `modelo-controlador-operador` — Bens Seguros as controller + operator
- `compartilhamento-de-dados` — Recipients table + "Nunca vendemos dados pessoais"
- `transferencia-internacional` — LGPD Art. 33 guarantees
- `seguranca-dos-dados` — All technical measures (AES-256-GCM, TLS, RLS, masking, RBAC, etc.)
- `retencao-e-eliminacao` — Retention periods table + LGPD deletion flow
- `direitos-do-titular` — LGPD Art. 18 rights + how to exercise
- `cookies-e-tecnologias` — Cookie table (session, CSRF, preferences)
- `uso-de-inteligencia-artificial` — AI usage + PII protections
- `dados-de-menores` — B2B platform, no minors
- `alteracoes-na-politica` — Versioning + re-acceptance
- `encarregado-de-dados` — DPO with [INSERIR] placeholders
- `contato-e-anpd` — Contact + ANPD complaint link

```typescript
import { CURRENT_PRIVACY_VERSION } from '@repo/core'
import type { LegalDocument } from '../types'

export const privacyPolicy: LegalDocument = {
  title: 'Política de Privacidade',
  version: CURRENT_PRIVACY_VERSION,
  updatedAt: '2026-03-28',
  sections: [
    // ... all 17 sections following the exact same pattern as terms-of-use.ts
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/legal/data/privacy-policy.ts
git commit -m "feat(legal): add Privacy Policy content v1.0 (LGPD)"
```

---

### Task 5: Legal Page Layout Component

**Files:**

- Create: `apps/web/src/features/legal/components/legal-page-layout.tsx`

- [ ] **Step 1: Create the shared legal page layout**

This is a `"use client"` component that receives a `LegalDocument` and renders:

1. Header with title, version badge, and update date
2. Sidebar sticky TOC with scroll spy (highlights active section)
3. Main content area rendering each section
4. Mobile: TOC as collapsible dropdown at top

```typescript
// apps/web/src/features/legal/components/legal-page-layout.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalDocument } from '../types'

interface LegalPageLayoutProps {
  document: LegalDocument
}

export function LegalPageLayout({ document: doc }: LegalPageLayoutProps) {
  const [activeSection, setActiveSection] = useState(doc.sections[0]?.id ?? '')
  const [tocOpen, setTocOpen] = useState(false)
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id)
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    for (const el of sectionRefs.current.values()) {
      observer.observe(el)
    }

    return () => observer.disconnect()
  }, [])

  function scrollToSection(id: string) {
    const el = sectionRefs.current.get(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setTocOpen(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-100 sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          Versão {doc.version} — Última atualização:{' '}
          {new Date(doc.updatedAt).toLocaleDateString('pt-BR')}
        </p>
      </div>

      {/* Mobile TOC toggle */}
      <div className="mb-6 md:hidden">
        <button
          type="button"
          onClick={() => setTocOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-300"
        >
          <span>Índice</span>
          <ChevronDown
            className={cn('size-4 transition-transform', tocOpen && 'rotate-180')}
          />
        </button>
        {tocOpen && (
          <nav className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <ul className="space-y-2">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'text-accent-400 font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      {/* Desktop layout: sidebar + content */}
      <div className="flex gap-10">
        {/* Sidebar TOC (desktop) */}
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Índice
            </p>
            <ul className="space-y-1.5">
              {doc.sections.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => scrollToSection(section.id)}
                    className={cn(
                      'w-full text-left text-sm transition-colors',
                      activeSection === section.id
                        ? 'border-l-2 border-accent-400 pl-3 text-accent-400 font-medium'
                        : 'border-l-2 border-transparent pl-3 text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {section.title}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <article className="min-w-0 flex-1">
          {doc.sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              ref={(el) => {
                if (el) sectionRefs.current.set(section.id, el)
              }}
              className="mb-10 scroll-mt-24"
            >
              <h2 className="mb-4 text-xl font-semibold text-slate-100">
                {section.title}
              </h2>
              <div className="whitespace-pre-line text-sm leading-relaxed text-slate-300">
                {section.content}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm --filter web typecheck`
Expected: No errors related to legal files

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/legal/components/legal-page-layout.tsx
git commit -m "feat(legal): add LegalPageLayout with sidebar TOC and scroll spy"
```

---

### Task 6: Terms of Use and Privacy Policy Pages

**Files:**

- Create: `apps/web/src/app/(marketing)/termos-de-uso/page.tsx`
- Create: `apps/web/src/app/(marketing)/politica-de-privacidade/page.tsx`

- [ ] **Step 1: Create Terms of Use page**

```typescript
// apps/web/src/app/(marketing)/termos-de-uso/page.tsx
import type { Metadata } from 'next'
import { LegalPageLayout } from '@/features/legal/components/legal-page-layout'
import { termsOfUse } from '@/features/legal/data/terms-of-use'

export const metadata: Metadata = {
  title: 'Termos de Uso — Bens Seguros',
  description: 'Termos de Uso da plataforma Bens Seguros — ERP para corretoras de seguros.',
}

export default function TermsOfUsePage() {
  return <LegalPageLayout document={termsOfUse} />
}
```

- [ ] **Step 2: Create Privacy Policy page**

```typescript
// apps/web/src/app/(marketing)/politica-de-privacidade/page.tsx
import type { Metadata } from 'next'
import { LegalPageLayout } from '@/features/legal/components/legal-page-layout'
import { privacyPolicy } from '@/features/legal/data/privacy-policy'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Bens Seguros',
  description: 'Política de Privacidade da plataforma Bens Seguros — Conforme LGPD.',
}

export default function PrivacyPolicyPage() {
  return <LegalPageLayout document={privacyPolicy} />
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(marketing)/termos-de-uso/page.tsx apps/web/src/app/(marketing)/politica-de-privacidade/page.tsx
git commit -m "feat(legal): add Terms of Use and Privacy Policy pages"
```

---

### Task 7: Update Footer Links

**Files:**

- Modify: `apps/web/src/features/marketing/components/marketing-footer.tsx`

- [ ] **Step 1: Update footer links and use Next.js Link**

In `apps/web/src/features/marketing/components/marketing-footer.tsx`:

Replace the `FOOTER_LINKS` constant:

```typescript
const FOOTER_LINKS = [
  { label: 'Termos', href: '/termos-de-uso' },
  { label: 'Privacidade', href: '/politica-de-privacidade' },
  { label: 'Contato', href: '#faq' },
] as const
```

Replace the `<a>` tags inside the footer nav with `<Link>` components for the internal routes. The `#faq` link stays as `<a>`. Update the rendering logic:

```tsx
{
  FOOTER_LINKS.map((link) => (
    <li key={link.label}>
      {link.href.startsWith('#') ? (
        <a
          href={link.href}
          className="text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          {link.label}
        </a>
      ) : (
        <Link
          href={link.href}
          className="text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          {link.label}
        </Link>
      )}
    </li>
  ))
}
```

- [ ] **Step 2: Verify build**

Run: `pnpm --filter web build`
Expected: Successful build, no broken links

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/marketing/components/marketing-footer.tsx
git commit -m "fix(legal): update footer links to Terms and Privacy pages"
```

---

### Task 8: Prisma Schema — TermsAcceptance + User Fields

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add fields to User model**

In `packages/db/prisma/schema.prisma`, add these fields to the `User` model (after `updatedAt`):

```prisma
  acceptedTermsAt  DateTime?
  termsVersion     String?
  privacyVersion   String?
  termsAcceptances TermsAcceptance[]
```

- [ ] **Step 2: Add TermsAcceptance model**

Add after the `Verification` model (after line 88):

```prisma
model TermsAcceptance {
  id         String   @id @default(cuid())
  userId     String
  type       String   // "terms" | "privacy"
  version    String
  acceptedAt DateTime @default(now())
  ipAddress  String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([userId, type])
}
```

- [ ] **Step 3: Generate migration**

Run: `cd packages/db && pnpm prisma migrate dev --name add-terms-acceptance`
Expected: Migration created and applied successfully

- [ ] **Step 4: Generate Prisma client**

Run: `cd packages/db && pnpm prisma generate`
Expected: Prisma client generated

- [ ] **Step 5: Commit**

```bash
git add packages/db/prisma/schema.prisma packages/db/prisma/migrations/
git commit -m "feat(db): add TermsAcceptance model and User consent fields"
```

---

### Task 9: Terms Acceptance API Endpoint

**Files:**

- Create: `apps/server/src/routes/terms-routes.ts`
- Modify: `apps/server/src/app.ts`

- [ ] **Step 1: Create the terms acceptance route**

```typescript
// apps/server/src/routes/terms-routes.ts
import type { FastifyInstance } from 'fastify'
import { prisma } from '@repo/db'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'
import { z } from 'zod'

const acceptTermsSchema = z.object({
  termsVersion: z.string(),
  privacyVersion: z.string(),
})

export async function termsRoutes(app: FastifyInstance) {
  // GET /api/terms/status — check if user needs to re-accept
  app.get('/api/terms/status', async (request) => {
    const userId = request.userId

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { termsVersion: true, privacyVersion: true },
    })

    const needsReAccept =
      user.termsVersion !== CURRENT_TERMS_VERSION ||
      user.privacyVersion !== CURRENT_PRIVACY_VERSION

    return {
      success: true,
      data: {
        needsReAccept,
        currentTermsVersion: CURRENT_TERMS_VERSION,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
        userTermsVersion: user.termsVersion,
        userPrivacyVersion: user.privacyVersion,
      },
    }
  })

  // POST /api/terms/accept — accept current terms
  app.post('/api/terms/accept', async (request) => {
    const userId = request.userId
    const body = acceptTermsSchema.parse(request.body)
    const ipAddress = request.ip

    if (
      body.termsVersion !== CURRENT_TERMS_VERSION ||
      body.privacyVersion !== CURRENT_PRIVACY_VERSION
    ) {
      return {
        success: false,
        error: {
          code: 'VERSION_MISMATCH',
          message: 'Versão dos termos não corresponde à versão atual.',
        },
      }
    }

    const now = new Date()

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          acceptedTermsAt: now,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
        },
      }),
      prisma.termsAcceptance.create({
        data: {
          userId,
          type: 'terms',
          version: CURRENT_TERMS_VERSION,
          acceptedAt: now,
          ipAddress,
        },
      }),
      prisma.termsAcceptance.create({
        data: {
          userId,
          type: 'privacy',
          version: CURRENT_PRIVACY_VERSION,
          acceptedAt: now,
          ipAddress,
        },
      }),
    ])

    return {
      success: true,
      data: {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        acceptedAt: now.toISOString(),
      },
    }
  })
}
```

- [ ] **Step 2: Register terms routes in app.ts**

In `apps/server/src/app.ts`, add the import at the top with other route imports:

```typescript
import { termsRoutes } from './routes/terms-routes.js'
```

Add `await authenticatedApp.register(termsRoutes)` inside the authenticated routes block (after `await authenticatedApp.register(searchRoutes)`):

```typescript
await authenticatedApp.register(termsRoutes)
```

- [ ] **Step 3: Verify build**

Run: `pnpm --filter server build`
Expected: Successful build

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/terms-routes.ts apps/server/src/app.ts
git commit -m "feat(api): add terms acceptance status and accept endpoints"
```

---

### Task 10: Register Form — Terms Checkbox

**Files:**

- Modify: `apps/web/src/features/auth/components/register-form.tsx`

- [ ] **Step 1: Update the register schema**

Add `acceptedTerms` to the Zod schema in `register-form.tsx`. The schema becomes:

```typescript
const registerSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({
        message: 'Você deve aceitar os termos para continuar',
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })
```

- [ ] **Step 2: Add checkbox imports and UI**

Add imports:

```typescript
import Link from 'next/link'
import { Checkbox } from '@/components/ui/checkbox'
```

Add the checkbox field after the confirm password block (before the submit button):

```tsx
;<div className="flex items-start gap-3">
  <Checkbox
    id="acceptedTerms"
    checked={form.watch('acceptedTerms') === true}
    onCheckedChange={(checked) => {
      form.setValue(
        'acceptedTerms',
        checked === true ? true : (false as never),
        {
          shouldValidate: true,
        }
      )
    }}
    className="mt-0.5"
  />
  <label htmlFor="acceptedTerms" className="text-sm text-slate-400">
    Li e aceito os{' '}
    <Link
      href="/termos-de-uso"
      target="_blank"
      className="text-accent-400 hover:text-accent-300 underline"
    >
      Termos de Uso
    </Link>{' '}
    e a{' '}
    <Link
      href="/politica-de-privacidade"
      target="_blank"
      className="text-accent-400 hover:text-accent-300 underline"
    >
      Política de Privacidade
    </Link>
  </label>
</div>
{
  form.formState.errors.acceptedTerms && (
    <p role="alert" className="text-destructive text-sm">
      {form.formState.errors.acceptedTerms.message}
    </p>
  )
}
```

Note: The `Checkbox` component uses Base UI's `onCheckedChange` API. Check the exact prop name — it may be `onChange` or `onCheckedChange` depending on the @base-ui/react version. The `checked` prop controls the state.

- [ ] **Step 3: Verify form renders correctly**

Run: `pnpm --filter web dev`
Navigate to `/register` and verify:

- Checkbox renders below confirm password
- Links open in new tabs
- Form won't submit without checking the box
- Error message shows "Você deve aceitar os termos para continuar"

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/features/auth/components/register-form.tsx
git commit -m "feat(auth): add terms acceptance checkbox to registration form"
```

---

### Task 11: Terms Acceptance Hook

**Files:**

- Create: `apps/web/src/features/legal/hooks/use-terms-acceptance.ts`

- [ ] **Step 1: Create the hook**

```typescript
// apps/web/src/features/legal/hooks/use-terms-acceptance.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function fetchTermsStatus() {
  const response = await fetch(`${API_URL}/api/terms/status`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch terms status')
  }

  const json = (await response.json()) as {
    success: boolean
    data: {
      needsReAccept: boolean
      currentTermsVersion: string
      currentPrivacyVersion: string
      userTermsVersion: string | null
      userPrivacyVersion: string | null
    }
  }

  return json.data
}

async function acceptTerms() {
  const response = await fetch(`${API_URL}/api/terms/accept`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      termsVersion: CURRENT_TERMS_VERSION,
      privacyVersion: CURRENT_PRIVACY_VERSION,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to accept terms')
  }

  const json = (await response.json()) as { success: boolean }
  return json
}

export function useTermsAcceptance() {
  const queryClient = useQueryClient()

  const status = useQuery({
    queryKey: ['terms', 'status'],
    queryFn: fetchTermsStatus,
    staleTime: 60_000,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: acceptTerms,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms', 'status'] })
    },
  })

  return {
    needsReAccept: status.data?.needsReAccept ?? false,
    isLoading: status.isLoading,
    accept,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/legal/hooks/use-terms-acceptance.ts
git commit -m "feat(legal): add useTermsAcceptance hook for re-accept flow"
```

---

### Task 12: Re-acceptance Modal

**Files:**

- Create: `apps/web/src/features/legal/components/terms-acceptance-modal.tsx`

- [ ] **Step 1: Create the blocking modal**

```typescript
// apps/web/src/features/legal/components/terms-acceptance-modal.tsx
'use client'

import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useTermsAcceptance } from '../hooks/use-terms-acceptance'

export function TermsAcceptanceModal() {
  const { needsReAccept, isLoading, accept } = useTermsAcceptance()

  if (isLoading || !needsReAccept) {
    return null
  }

  function handleAccept() {
    accept.mutate(undefined, {
      onError: () => toast.error('Erro ao aceitar os termos. Tente novamente.'),
    })
  }

  return (
    <Dialog open modal>
      <DialogContent showCloseButton={false} bottomStickOnMobile={false}>
        <DialogHeader>
          <DialogTitle>Atualizamos nossos Termos</DialogTitle>
          <DialogDescription>
            Atualizamos nossos Termos de Uso (v{CURRENT_TERMS_VERSION}) e
            Política de Privacidade (v{CURRENT_PRIVACY_VERSION}). Por favor,
            revise e aceite para continuar utilizando a plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 px-6">
          <Link
            href="/termos-de-uso"
            target="_blank"
            className="text-accent-400 text-sm underline hover:text-accent-300"
          >
            Ler Termos de Uso →
          </Link>
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            className="text-accent-400 text-sm underline hover:text-accent-300"
          >
            Ler Política de Privacidade →
          </Link>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={accept.isPending}
            className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 w-full bg-gradient-to-r font-bold text-slate-900 sm:w-auto"
          >
            {accept.isPending ? 'Processando...' : 'Li e aceito as alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/legal/components/terms-acceptance-modal.tsx
git commit -m "feat(legal): add blocking TermsAcceptanceModal for re-accept flow"
```

---

### Task 13: Integrate Modal into Dashboard Shell

**Files:**

- Modify: `apps/web/src/components/layout/dashboard-shell.tsx`

- [ ] **Step 1: Add the modal to DashboardShell**

In `apps/web/src/components/layout/dashboard-shell.tsx`, add the import and render the modal:

```typescript
import { TermsAcceptanceModal } from '@/features/legal/components/terms-acceptance-modal'
```

Add `<TermsAcceptanceModal />` inside the returned JSX, after `<AppShell>`:

```typescript
return (
  <>
    <AppShell role={role}>{children}</AppShell>
    <TermsAcceptanceModal />
  </>
)
```

- [ ] **Step 2: Verify the integration**

Run: `pnpm --filter web dev`

- Log in with a user who has no `termsVersion` set → modal should appear
- Modal should block interaction (no dismiss)
- After accepting, modal disappears and dashboard is accessible

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/dashboard-shell.tsx
git commit -m "feat(legal): integrate terms re-acceptance modal into dashboard"
```

---

### Task 14: Final Build Verification

- [ ] **Step 1: Run lint**

Run: `pnpm lint`
Expected: Zero errors

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: Zero errors

- [ ] **Step 3: Run build**

Run: `pnpm build`
Expected: Successful build for all packages and apps

- [ ] **Step 4: Manual smoke test**

Start dev: `pnpm --filter web dev`
Verify:

1. `/termos-de-uso` — renders with sidebar TOC, scroll spy works
2. `/politica-de-privacidade` — renders with sidebar TOC, scroll spy works
3. Footer links navigate to correct pages
4. `/register` — checkbox appears, form blocks without it
5. Dashboard — modal appears for users without accepted terms
6. After accepting — modal disappears, can use dashboard normally
