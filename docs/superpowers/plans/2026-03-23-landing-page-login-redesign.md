# Landing Page & Login Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a modern landing page (8 sections, dark+gold hybrid) and redesign the login/register screens (split layout with dashboard preview).

**Architecture:** New `(marketing)` route group with Server Components for each landing section. Auth layout redesigned as dark split layout. Shared visual primitives (gradient orbs, grid dots, glassmorphism) as reusable CSS classes. `framer-motion` (already installed) for scroll animations via `useInView`. Route collision resolved by moving dashboard to `/dashboard` subpath. Proxy middleware updated for public landing page access.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, shadcn/ui (Sheet, Accordion), Lucide icons, framer-motion (existing)

**Spec:** `docs/superpowers/specs/2026-03-23-landing-page-login-redesign-design.md`

---

### Task 1: Setup — Branch, Routing Fixes, CSS Primitives

**Files:**

- Modify: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/proxy.ts` (add `/` to PUBLIC_PATHS)
- Move: `apps/web/src/app/(dashboard)/page.tsx` → `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- Modify: sidebar/nav links that point to `/` → `/dashboard`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b feat/landing-page-login-redesign
```

- [ ] **Step 2: Resolve route collision — move dashboard page to `/dashboard`**

`(dashboard)/page.tsx` currently serves `/`, which collides with the new `(marketing)/page.tsx`. Move it:

```bash
mkdir -p apps/web/src/app/\(dashboard\)/dashboard
mv apps/web/src/app/\(dashboard\)/page.tsx apps/web/src/app/\(dashboard\)/dashboard/page.tsx
```

Then update any sidebar/nav links that point to `/` to point to `/dashboard` instead. Search for `href="/"` or `href: "/"` in sidebar config and update.

- [ ] **Step 3: Update proxy middleware for public landing page**

In `apps/web/src/proxy.ts`, add `/` as an exact-match public path:

```ts
// Before the PUBLIC_PATHS.some() check, add exact root match:
if (pathname === '/') {
  return NextResponse.next()
}
```

This allows unauthenticated users to see the landing page at `/`.

- [ ] **Step 4: Add animation keyframes and utility classes to globals.css**

Add after the existing `@keyframes` blocks in `globals.css`:

```css
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes orb-drift {
  0%,
  100% {
    transform: translate(0, 0);
  }
  33% {
    transform: translate(10px, -10px);
  }
  66% {
    transform: translate(-5px, 5px);
  }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out both;
}
.animate-orb-drift {
  animation: orb-drift 10s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .animate-orb-drift,
  .animate-float,
  .animate-fade-in-up {
    animation: none !important;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/proxy.ts apps/web/src/app/globals.css "apps/web/src/app/(dashboard)/dashboard/page.tsx" && git commit -m "chore: setup landing page branch, fix route collision, add animation primitives"
```

---

### Task 2: Marketing Nav + Footer Components

**Files:**

- Create: `apps/web/src/features/marketing/components/marketing-nav.tsx`
- Create: `apps/web/src/features/marketing/components/marketing-footer.tsx`
- Create: `apps/web/src/components/shared/logo.tsx`

- [ ] **Step 1: Create shared logo component**

`apps/web/src/components/shared/logo.tsx` — shared (not feature-owned) since it's used by marketing AND auth. Icon (teal square with "B" gold) + text. Accept `size` prop for variants (`sm`, `md`, `lg`).

- [ ] **Step 2: Create marketing-nav.tsx**

Server Component with:

- Sticky positioning, `backdrop-filter blur` on scroll (needs a thin client wrapper for scroll state)
- Logo left
- Anchor links: Recursos (#recursos), Precos (#precos), Depoimentos (#depoimentos)
- Right: Login link (ghost button → `/login`) + "Comecar Gratis" (gold gradient → `/register`)
- Mobile: hamburger icon (`aria-label="Abrir menu"`) triggers shadcn Sheet (slide from right), links stacked vertically
- The Sheet trigger + scroll-aware sticky behavior require `"use client"` — extract as `marketing-nav-client.tsx` or make the entire nav a client component (simpler, nav is small)
- Also include "Contato" link in nav pointing to `#faq`

- [ ] **Step 3: Create marketing-footer.tsx**

Server Component:

- Background dark `#0f172a`, `max-w-6xl` centered, `py-8`
- Logo left + links center (Termos, Privacidade, Contato mailto) + copyright right
- Mobile: stacked

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add marketing nav, footer, and logo components"
```

---

### Task 3: Marketing Layout + Landing Page Shell

**Files:**

- Create: `apps/web/src/app/(marketing)/layout.tsx`
- Create: `apps/web/src/app/(marketing)/page.tsx`

- [ ] **Step 1: Create (marketing)/layout.tsx**

Server Component layout:

- Check session via cookie — if authenticated, redirect to `/dashboard` (use `redirect()` from `next/navigation` + check `better-auth.session_token` cookie via `cookies()`)
- Skip-to-content link (`<a href="#main" className="sr-only focus:not-sr-only ...">`)
- `<MarketingNav />`
- `<main id="main">{children}</main>`
- `<MarketingFooter />`
- SEO metadata export: `title: "Bens Seguros — ERP para Corretoras de Seguros"`, `description: "Gerencie propostas, apolices, comissoes e atenda clientes pelo WhatsApp. O ERP completo para corretoras de seguros brasileiras."`

- [ ] **Step 2: Create (marketing)/page.tsx**

Landing page composing all 8 sections (placeholders first, real components in next tasks):

```tsx
import { HeroSection } from '@/features/marketing/components/hero-section'
import { LogosSection } from '@/features/marketing/components/logos-section'
import { ProblemSection } from '@/features/marketing/components/problem-section'
import { FeaturesSection } from '@/features/marketing/components/features-section'
import { HowItWorksSection } from '@/features/marketing/components/how-it-works-section'
import { TestimonialsSection } from '@/features/marketing/components/testimonials-section'
import { PricingSection } from '@/features/marketing/components/pricing-section'
import { FaqCtaSection } from '@/features/marketing/components/faq-cta-section'

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <LogosSection />
      <ProblemSection />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <PricingSection />
      <FaqCtaSection />
    </>
  )
}
```

Create stub components (each returning a `<section id="...">` with placeholder text) so the page renders immediately.

- [ ] **Step 3: Verify page renders at localhost**

```bash
cd /home/artur/projects && pnpm --filter web dev
```

Visit `http://localhost:3000` — should show nav + 8 placeholder sections + footer.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add marketing layout and landing page shell with stubs"
```

---

### Task 4: Hero Section

**Files:**

- Create: `apps/web/src/features/marketing/components/hero-section.tsx`
- Create: `apps/web/src/features/marketing/components/dashboard-preview.tsx`

- [ ] **Step 1: Create dashboard-preview.tsx**

Reusable component (used in hero AND login page). Glassmorphism card with:

- Window chrome dots (red/yellow/green)
- 3 stats cards: Premios R$2.4M (+12%), Comissoes R$360K (+8%), Apolices 1.247 (+5%)
- Mini bar chart (12 bars, alternating teal/gold heights)
- Float animation class
- Glassmorphism: `bg-white/[0.03] border border-white/[0.08] backdrop-blur-xl` with fallback `bg-slate-900/80`

- [ ] **Step 2: Create hero-section.tsx**

Server Component with:

- `id="hero"`, full dark background with gradient `from-[#0a101f] via-slate-900 to-[#111827]`
- Grid dots: absolute div with `bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px]`
- Gradient orbs: 2 absolute divs with blur(50-60px), teal top-center + gold bottom-right, `animate-orb-drift`
- Badge: "2.000+ corretoras ja usam" gold border pill
- Headline: 42px bold, gradient text on "precisa para crescer" using `bg-gradient-to-r from-accent-500 to-accent-400 bg-clip-text text-transparent`
- Subtitle: 16px slate-400, max-w-xl
- 2 CTAs: gold gradient "Comecar Gratis" (link to `/register`) + ghost "Agendar Demo" (anchor `#precos`)
- `<DashboardPreview />` below with shadow

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add hero section with dashboard preview"
```

---

### Task 5: Logos + Problem + How It Works Sections (Light)

**Files:**

- Create: `apps/web/src/features/marketing/components/logos-section.tsx`
- Create: `apps/web/src/features/marketing/components/problem-section.tsx`
- Create: `apps/web/src/features/marketing/components/how-it-works-section.tsx`

- [ ] **Step 1: Create logos-section.tsx**

Server Component, `id="logos"`, bg `#f8fafc`:

- "SEGURADORAS PARCEIRAS" uppercase label, slate-400
- Row of 6 text placeholders (Porto Seguro, SulAmerica, Allianz, Bradesco, Tokio Marine, Liberty) in grayscale cards, `hover:opacity-100 opacity-60` transition
- Mobile: wrap to 2 rows

- [ ] **Step 2: Create problem-section.tsx**

Server Component, `id="problema"`, bg white:

- Label "O PROBLEMA" using accent-700 color (`text-accent-700`)
- Headline: "Cansado de planilhas e retrabalho?"
- 3 pain point cards in grid: red-50 bg, red-200 border, Lucide `XCircle` icon, title + description
- Cards: "Planilhas manuais", "Comissoes perdidas", "Atendimento lento"
- Mobile: 1 column

- [ ] **Step 3: Create how-it-works-section.tsx**

Server Component, `id="como-funciona"`, bg `#f8fafc`:

- Label "COMO FUNCIONA" accent-700
- 3 steps in flex row with connecting gradient line
- Step circles: numbered (1,2,3) with gradient backgrounds (teal, gold, green)
- Titles: Cadastre-se, Configure, Use + descriptions
- Mobile: vertical stack, line hidden

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat: add logos, problem, and how-it-works sections"
```

---

### Task 6: Features Bento Grid Section (Dark)

**Files:**

- Create: `apps/web/src/features/marketing/components/features-section.tsx`

- [ ] **Step 1: Create features-section.tsx**

Server Component, `id="recursos"`, bg `#0f172a`:

- Gradient orb teal, grid dots
- Label "RECURSOS" gold (accent-500 on dark bg — passes WCAG)
- Grid layout `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`:
  - Propostas: `lg:col-span-2`, teal icon (Lucide `FileText`), workflow pills (Cotacao → Analise → Emissao)
  - Comissoes: gold icon (Lucide `DollarSign`), gold border accent
  - Chat + WhatsApp: green icon (Lucide `MessageCircle`), short description
  - Dashboard: `lg:col-span-2`, indigo icon (Lucide `LayoutDashboard`), description
- All cards: `bg-white/[0.03] border border-white/[0.08] rounded-xl p-5`

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add features bento grid section"
```

---

### Task 7: Testimonials Section (Dark)

**Files:**

- Create: `apps/web/src/features/marketing/components/testimonials-section.tsx`

- [ ] **Step 1: Create testimonials-section.tsx**

Server Component, `id="depoimentos"`:

- Dark gradient bg with gold orb
- Label "DEPOIMENTOS" gold
- 3 glassmorphism cards with: 5 gold stars, italic quote, divider, avatar circle (initials with gradient bg) + name + company + city
- Middle card: gold border accent
- Metrics bar below: 4 stats (2.000+, 98%, 3x, -40%)
- Mobile: 1 column cards, 2x2 metrics grid

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add testimonials section"
```

---

### Task 8: Pricing Section (Light, Client Component)

**Files:**

- Create: `apps/web/src/features/marketing/components/pricing-section.tsx`

- [ ] **Step 1: Create pricing-section.tsx**

`"use client"` component (needs useState for toggle), `id="precos"`:

- Label "PRECOS" accent-700
- Pill toggle: mensal (default) / anual (-20% badge green). `useState<'monthly' | 'annual'>('monthly')`
- 3 pricing cards:
  - Starter: R$97 (annual: R$78), border slate-200, ghost CTA → `/register`
  - Pro: R$197 (annual: R$158), border gold 2px, glow shadow, "MAIS POPULAR" badge, gold CTA → `/register`
  - Enterprise: "Sob consulta", dark card `bg-slate-900`, ghost white CTA → mailto or `#faq`
- Feature lists with green checkmarks (Lucide `Check`)
- Mobile: stack vertically, Pro card first (reorder via `order-first`)

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add pricing section with monthly/annual toggle"
```

---

### Task 9: FAQ + CTA Section (Dark)

**Files:**

- Create: `apps/web/src/features/marketing/components/faq-cta-section.tsx`

- [ ] **Step 1: Create faq-cta-section.tsx**

`"use client"` (accordion interactivity), `id="faq"`:

- Dark bg with gold gradient orb
- FAQ label gold, headline "Perguntas frequentes"
- Use shadcn Accordion component with custom styling:
  - Items: glassmorphism cards `bg-white/[0.03] border border-white/[0.08]`
  - Open item: border gold `border-accent-500/30`
  - 4 questions: instalacao, seguranca, importacao, teste gratis
- CTA Final card below: gradient border (gold+teal), headline "Pronto para transformar sua corretora?", subtitle, gold CTA with glow → `/register`

- [ ] **Step 2: Commit**

```bash
git add -A && git commit -m "feat: add FAQ accordion and final CTA section"
```

---

### Task 10: Scroll Animations (framer-motion useInView)

**Files:**

- Create: `apps/web/src/features/marketing/components/animate-on-scroll.tsx`
- Modify: `apps/web/src/app/(marketing)/page.tsx` — wrap each section

- [ ] **Step 1: Create animate-on-scroll.tsx**

Client component wrapper using framer-motion (already installed, no new dependency):

```tsx
'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

interface AnimateOnScrollProps {
  children: React.ReactNode
  className?: string
}

export function AnimateOnScroll({ children, className }: AnimateOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
```

- [ ] **Step 2: Wrap sections 2-8 in page.tsx with AnimateOnScroll**

Hero (section 1) does NOT get wrapped — it's visible on load. Sections 2-8 each wrapped:

```tsx
<AnimateOnScroll><LogosSection /></AnimateOnScroll>
<AnimateOnScroll><ProblemSection /></AnimateOnScroll>
// ... etc
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: add scroll-triggered fade-in animations"
```

---

### Task 11: Auth Layout Redesign (Split Dark)

**Files:**

- Modify: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/features/auth/components/auth-preview-panel.tsx`

- [ ] **Step 1: Create auth-preview-panel.tsx**

Server Component — right panel of the split layout:

- Dark gradient background with orbs (teal + gold) + grid dots
- Centered `<DashboardPreview />` (reuse from Task 4) with float animation
- Hidden on mobile (`hidden lg:flex`)

- [ ] **Step 2: Redesign (auth)/layout.tsx**

Replace the current centered card layout:

```tsx
import { AuthPreviewPanel } from '@/features/auth/components/auth-preview-panel'
import { Logo } from '@/components/shared/logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh">
      {/* Left: Form */}
      <div className="flex flex-1 flex-col justify-center bg-[#0f172a] px-6 lg:max-w-[55%]">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8">
            <Logo />
          </div>
          {children}
        </div>
      </div>
      {/* Right: Preview */}
      <AuthPreviewPanel />
    </div>
  )
}
```

- [ ] **Step 3: Update login/page.tsx**

Add page heading and restyle for dark background:

- Add `<h1 className="text-xl font-bold text-slate-100">Entrar</h1>` + `<p className="text-sm text-slate-400 mb-6">Acesse sua corretora</p>` before `<LoginForm />`
- "Nao tem conta?" text → `text-slate-400`
- Link → `text-accent-500 hover:text-accent-400`

- [ ] **Step 4: Update register/page.tsx**

Add page heading and restyle:

- Add `<h1 className="text-xl font-bold text-slate-100">Criar conta</h1>` + `<p className="text-sm text-slate-400 mb-6">Comece a usar o Bens Seguros</p>`
- "Ja tem conta?" text → `text-slate-400`
- Link → `text-accent-500 hover:text-accent-400`

- [ ] **Step 5: Update login-form.tsx styling**

Restyle form inputs for dark theme:

- Input: `bg-white/[0.04] border-white/10 text-slate-100 placeholder:text-slate-500`
- Labels: `text-slate-400`
- Button "Entrar": gold gradient `bg-gradient-to-r from-accent-500 to-accent-400 text-slate-900 font-bold`
- Eye toggle icon: `text-slate-400`
- Add "Esqueceu?" link next to Senha label: `<a href="#" className="text-sm text-accent-500 hover:text-accent-400">Esqueceu?</a>` in a flex row with the label
- Social login: excluded from v1 per spec. No divider or Google button needed.

- [ ] **Step 6: Update register-form.tsx styling + add confirmPassword**

Same dark theme restyling as login-form, plus:

- Add `confirmPassword` field after password field
- Add Zod validation: `.refine((data) => data.password === data.confirmPassword, { message: 'Senhas nao conferem', path: ['confirmPassword'] })`
- CTA: "Criar Conta" gold gradient

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/app/\(auth\)/layout.tsx apps/web/src/features/auth/ apps/web/src/app/\(auth\)/login/page.tsx apps/web/src/app/\(auth\)/register/page.tsx && git commit -m "feat: redesign auth layout with dark split and dashboard preview"
```

---

### Task 12: Mobile Responsiveness Pass

**Files:**

- Modify: multiple section components as needed

- [ ] **Step 1: Verify and fix each section at 375px viewport**

Walk through each component and ensure:

- Hero: vertical stack, dashboard preview scaled down or hidden below md
- Logos: wrap to 2x3 grid
- Problem: 1 column cards
- Features bento: 1 col mobile, 2 col tablet
- How it works: vertical, connecting line hidden
- Testimonials: 1 col cards, 2x2 metrics
- Pricing: stack, Pro card `order-first`
- FAQ: full width
- Auth split: single column, preview hidden

- [ ] **Step 2: Verify nav mobile hamburger works**

Test Sheet drawer: opens from right, links stack, closes on outside click and Escape.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix: mobile responsiveness for all landing and auth sections"
```

---

### Task 13: Typecheck, Lint, Build

- [ ] **Step 1: Run typecheck**

```bash
pnpm --filter web typecheck
```

Fix any TypeScript errors.

- [ ] **Step 2: Run lint**

```bash
pnpm --filter web lint
```

Fix any lint errors (zero `any`, zero `console.log`, zero `eslint-disable`).

- [ ] **Step 3: Run build**

```bash
pnpm --filter web build
```

Fix any build errors.

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A && git commit -m "fix: resolve typecheck and lint issues"
```

---
