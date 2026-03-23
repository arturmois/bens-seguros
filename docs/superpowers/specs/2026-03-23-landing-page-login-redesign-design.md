# Landing Page & Login Redesign — Design Spec

## Overview

Redesign da landing page (inexistente) e tela de login (basica) do Bens Seguros com visual moderno inspirado em AbacatePay, Nubank e Linear. Objetivo: transmitir confianca, modernidade e profissionalismo para corretores de seguros brasileiros.

## Design Direction

**Estilo**: Dark + Gold Hybrid — fundo escuro com accent gold da marca, gradient orbs, glassmorphism sutil, bento grid. Alternancia dark/light entre secoes para respiro visual.

**Inspiracoes**: AbacatePay (gradient orbs, bento grid), Nubank (social proof, tipografia bold), Linear (grid dots, glassmorphism, dark premium).

## Brand Tokens (existentes, mantidos)

- **Primary (Teal)**: `#1f4b5f` — oklch scale ja definida em `globals.css`
- **Accent (Gold)**: `#b98927` — oklch scale ja definida em `globals.css`
- **Font**: Inter (ja configurada no root layout)
- **Dark background**: `#0f172a` (slate-900)
- **Light background**: `#f8fafc` (slate-50) / `#ffffff`

## Routing

- `/` serve a landing page para usuarios nao autenticados
- Usuarios autenticados acessando `/` sao redirecionados para `/` do dashboard via middleware (ja existente) ou check server-side no `(marketing)/layout.tsx`
- `(marketing)/page.tsx` se torna a root `/` page (Next.js route group behavior)
- Links do nav sao anchor links para secoes: `#recursos`, `#precos`, `#depoimentos`, `#faq`
- "Blog" removido do nav (fora de escopo). "Contato" aponta para `#faq` ou email mailto

### Section IDs para anchor navigation

| Secao         | ID              |
| ------------- | --------------- |
| Hero          | `hero`          |
| Logos         | `logos`         |
| Problema      | `problema`      |
| Features      | `recursos`      |
| Como Funciona | `como-funciona` |
| Depoimentos   | `depoimentos`   |
| Precos        | `precos`        |
| FAQ + CTA     | `faq`           |

## Landing Page — 8 Secoes

### Secao 1: Hero (Dark)

- **Background**: gradient `#0a101f → #0f172a → #111827` com grid dots (radial-gradient 24px spacing, rgba white 3%) e gradient orbs (teal top-center, gold bottom-right, filter blur 50-60px)
- **Nav**: logo (icone teal com "B" gold + texto) | links (Recursos, Precos, Depoimentos) — anchor links | Login (ghost button) + Comecar Gratis (gold gradient button)
- **Nav behavior**: sticky, com backdrop-filter blur on scroll
- **Content**: badge social proof ("2.000+ corretoras ja usam", gold border pill) → headline 42px bold com gradient text no destaque ("precisa para crescer") → subtitulo 16px slate-400 → 2 CTAs (gold "Comecar Gratis" com glow shadow + ghost "Agendar Demo")
- **Dashboard preview**: card flutuante glassmorphism (rgba white 3%, border white 8%, backdrop-blur 12px, shadow 20px 60px black 30%) com window chrome dots, 3 stats cards (Premios R$2.4M, Comissoes R$360K, Apolices 1.247) e mini bar chart
- **Animacoes**: fade-in + translateY no load, orbs com slow oscillation (8-12s), dashboard card com subtle float

### Secao 2: Logos Seguradoras (Light)

- **Background**: `#f8fafc`
- **Titulo**: "SEGURADORAS PARCEIRAS" uppercase, slate-400, letter-spacing 1px
- **Logos**: row horizontal com grayscale filter (hover: color), gap 40px. Placeholders: Porto Seguro, SulAmerica, Allianz, Bradesco, Tokio Marine, Liberty
- **Nota**: usar logos reais (SVG) quando disponiveis, placeholders em text por agora

### Secao 3: Problema (Light)

- **Background**: `#ffffff`
- **Label**: "O PROBLEMA" accent-700 (`oklch(0.48 0.11 80)` ~`#8a6520`) on light bg for WCAG 4.5:1 compliance, uppercase
- **Headline**: "Cansado de planilhas e retrabalho?" 28px bold
- **Subtitulo**: texto explicativo sobre dor do corretor
- **Pain points**: 3 cards em grid, fundo red-50, border red-200, com icone X vermelho + titulo + descricao. Cards: "Planilhas manuais", "Comissoes perdidas", "Atendimento lento"
- **Nota**: icones devem ser Lucide (X circle), nao emojis — os mockups usaram caracteres como placeholder

### Secao 4: Features Bento Grid (Dark)

- **Background**: `#0f172a` com gradient orb teal no canto
- **Label**: "RECURSOS" gold
- **Headline**: "Tudo que sua corretora precisa" 28px bold white
- **Grid**: 3 colunas assimetricas, layout:
  ```
  Row 1: [Propostas ---- col-span-2 ----] [Comissoes]
  Row 2: [Chat+WhatsApp] [Dashboard --- col-span-2 ---]
  ```

  - **Propostas** (col-span-2): icone teal, titulo, descricao, mini workflow pills (Cotacao → Analise → Emissao)
  - **Comissoes** (1 col): icone gold, border gold sutil, titulo + descricao curta
  - **Chat + WhatsApp** (1 col): icone green, titulo + descricao curta
  - **Dashboard** (col-span-2): icone indigo, titulo + descricao
- **Cards**: background rgba white 3%, border white 8%, radius 12px, padding 20px

### Secao 5: Como Funciona (Light)

- **Background**: `#f8fafc`
- **Label**: "COMO FUNCIONA" accent-700 on light bg
- **Headline**: "Comece em 3 passos simples" 28px bold
- **Steps**: 3 colunas com circulos numerados (gradients: teal, gold, green) + linha conectora horizontal gradient
- **Passos**: 1-Cadastre-se, 2-Configure, 3-Use — cada um com titulo bold + descricao

### Secao 6: Depoimentos (Dark)

- **Background**: gradient `#0f172a → #111827` com gradient orb gold
- **Label**: "DEPOIMENTOS" gold
- **Headline**: "Quem usa, recomenda" 28px bold white
- **Cards**: 3 cards glassmorphism, cada um com: 5 estrelas gold, quote italic, divider, avatar (initials gradient circle) + nome + empresa + cidade
- **Card destaque**: border gold sutil no card do meio
- **Metricas**: barra abaixo com 4 stats grandes (2.000+ corretoras, 98% satisfacao, 3x produtivo, -40% retrabalho)
- **Depoimentos**: placeholder — substituir por reais quando disponiveis

### Secao 7: Precos (Light)

- **Background**: `#ffffff`
- **Label**: "PRECOS" accent-700 on light bg
- **Headline**: "Planos para cada corretora" + toggle mensal/anual (pill switch, anual com badge "-20%" green)
- **Toggle behavior**: default state = mensal. Client-side `useState` only, no persistence. Annual = monthly _ 12 _ 0.8 (displayed as monthly equivalent)
- **Cards**: 3 planos em grid
  - **Starter** (R$97/mes): border slate-200, CTA ghost. 200 clientes, propostas ilimitadas, 1 usuario, WhatsApp basico
  - **Pro** (R$197/mes): border gold 2px, glow shadow, badge "MAIS POPULAR" gold gradient. CTA gold solid. Clientes ilimitados, comissoes automaticas, 5 usuarios, Chat+WhatsApp+IA, dashboard completo
  - **Enterprise** (Sob consulta): background dark `#0f172a`, border white 15%. CTA ghost white. Tudo do Pro + usuarios ilimitados, API, suporte dedicado, SLA
- **Nota**: valores sao placeholder — ajustar conforme modelo de negocio real

### Secao 8: FAQ + CTA Final (Dark + Gold)

- **Background**: `#0f172a` com gradient orb gold
- **FAQ**: accordion com 4+ perguntas. Cards glassmorphism, item aberto tem border gold. Perguntas: instalacao, seguranca dados, importacao clientes, periodo teste
- **CTA Final**: card com gradient border gold (rgba gold 8% + rgba teal 8%), headline "Pronto para transformar sua corretora?", subtitulo, CTA gold com glow shadow "Comecar Gratis Agora"
- **Footer**: background dark (same as section 8), `max-w-6xl` centered, `py-8`. Row 1: logo left + links center (Termos, Privacidade, Contato mailto) + copyright right. Single row flex on desktop, stacked on mobile

## Login Page — Split com Preview

### Layout

- **Split**: flex, 100dvh
- **Esquerda (~55%)**: fundo `#0f172a`, formulario centralizado verticalmente, max-width 380px
- **Direita (~45%)**: fundo gradient dark com orbs (teal + gold), grid dots, card glassmorphism com preview do dashboard

### Formulario (esquerda)

- **Logo**: icone teal (32px, radius 8px, "B" gold) + "Bens Seguros" text
- **Headline**: "Entrar" 20px bold + "Acesse sua corretora" subtitulo
- **Campos**: email + senha, background rgba white 4%, border white 10%, radius 8px. Label slate-400, placeholder slate-500
- **Esqueceu senha**: link gold alinhado a direita do label "Senha"
- **CTA**: "Entrar" gold gradient, full-width, radius 8px, font-weight 700
- **Divider**: linha com "ou" no meio
- **Social login**: "Continuar com Google" ghost button (se aplicavel)
- **Register link**: "Nao tem conta? Cadastre-se gratis" com link gold

### Preview do Dashboard (direita)

- **Background**: gradient orbs (teal grande + gold menor), grid dots
- **Card**: glassmorphism (rgba white 4%, border white 8%, radius 12px, backdrop-blur 8px)
- **Conteudo**: dot verde "Dashboard" label, 2 stats (R$2.4M Premios, 1.247 Apolices — mesmos dados do hero), mini bar chart 6 barras (teal + gold)
- **Efeito**: subtle float animation no card

### Register Page

- Mesmo layout split, formulario com campos: Nome, Email, Senha, Confirmar Senha
- CTA: "Criar Conta" gold gradient
- Link: "Ja tem conta? Entrar"

### Outras paginas auth

- `(auth)/layout.tsx` e o split layout compartilhado por login e register
- Se futuras paginas auth forem adicionadas (forgot-password, reset-password, verify-email), elas herdam o mesmo split layout. O painel direito (preview) funciona como branding generico para qualquer pagina auth
- Social login (Google): excluido da v1. Adicionar futuramente se Google OAuth for configurado no Better Auth

### Responsivo (Mobile)

- **Mobile (<1024px)**: split desaparece, apenas formulario full-screen com fundo dark e gradient orbs sutis como background
- **Desktop (>=1024px)**: split layout ativo
- **Nav mobile**: hamburger menu com drawer — usar shadcn Sheet component, slide from right, dark overlay, close on outside click/Escape, links empilhados verticalmente

## Implementacao Tecnica

### Estrutura de Arquivos

```
apps/web/src/app/
  (marketing)/           # Novo route group para landing
    layout.tsx           # Layout com nav e footer
    page.tsx             # Landing page
  (auth)/
    layout.tsx           # Redesign: dark split layout
    login/page.tsx       # Mantido, usa novo layout
    register/page.tsx    # Mantido, usa novo layout
```

### Componentes Novos

```
apps/web/src/features/marketing/components/
  hero-section.tsx
  logos-section.tsx
  problem-section.tsx
  features-section.tsx
  how-it-works-section.tsx
  testimonials-section.tsx
  pricing-section.tsx
  faq-section.tsx
  cta-section.tsx
  marketing-nav.tsx
  marketing-footer.tsx
```

### CSS

- Adicionar keyframes em `globals.css`: `float` (subtle Y oscillation), `fade-in-up`, `orb-drift`
- Gradient orbs como pseudo-elements ou divs absolutas com `filter: blur()`
- Grid dots via `background-image: radial-gradient()`
- Glassmorphism: `backdrop-filter: blur()` + `background: rgba()` + `border: rgba()`
- Nenhuma dependencia nova — tudo com Tailwind 4 utility classes + CSS custom

### Animacoes

- **`prefers-reduced-motion`**: usar Tailwind `motion-safe:` e `motion-reduce:` variants. Adicionar em `globals.css`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .animate-orb-drift,
    .animate-float,
    .animate-fade-in-up {
      animation: none !important;
    }
  }
  ```
- **Scroll reveal**: usar `react-intersection-observer` com `threshold: 0.1` e `triggerOnce: true` para fade-in-up das secoes
- **Duracoes**: micro 150-300ms, orbs 8-12s, float 6s

### Glassmorphism Fallback

- Cards glassmorphism devem ter fallback solid: `bg-slate-900/80` para browsers sem `backdrop-filter`
- Graceful degradation — visual aceitavel sem blur

### Responsivo

- Mobile-first, breakpoints: 375px / 768px / 1024px / 1440px
- Hero: stack vertical, dashboard preview menor ou hidden em mobile
- Bento grid: 1 coluna em mobile, 2 em tablet, 3 em desktop
- Pricing: stack vertical em mobile
- Login split: full-screen form em mobile, split a partir de 1024px

### Acessibilidade

- Contraste: 4.5:1 minimo em todos os textos (verificar gold sobre dark)
- Skip-to-content link
- Heading hierarchy sequencial (h1 → h2 → h3)
- Todos os links e botoes com focus-visible rings
- Alt text em imagens/logos
- Accordion FAQ com aria-expanded e aria-controls

## Fora de Escopo

- Conteudo real de depoimentos (usar placeholders)
- Logos reais de seguradoras (usar text placeholders)
- Valores reais de pricing (usar placeholders)
- Analytics/tracking
- Blog pages
- Integracao com CRM/marketing tools
