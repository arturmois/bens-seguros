# Design — Security headers (CSP + HSTS subdomains + Permissions-Policy)

**Data:** 2026-04-11
**Origem:** `audit/security-p2-2026-04-11.md` P1/P2 findings
**Escopo:** `apps/web/next.config.ts` + `apps/server/src/app.ts`

---

## 1. Contexto

A auditoria de segurança (PR #84 `docs(audit): P2 security audit report`) identificou 2 P1 e 2 P2 de cabeçalhos HTTP:

- **P1**: CSP ausente em `https://app.bensseg.com` (Next.js não configura automaticamente)
- **P1**: CSP da API permite `'unsafe-inline'` globalmente (trade-off por Scalar docs) — **fora do escopo deste PR**, tratado como follow-up
- **P2**: `Permissions-Policy` ausente em `https://api.bensseg.com`
- **P2**: HSTS do app sem `includeSubDomains` (Vercel envia `max-age=63072000` sem a diretiva)

Este spec cobre B1 + B2 do batch de segurança. B3 (cookie `bens-active-org` httpOnly) fica pendurado até decisão UX e não entra aqui.

---

## 2. Decisões tomadas no brainstorm

| ID  | Pergunta          | Decisão                                                                                                                        |
| --- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| D-1 | Escopo do PR      | B1 (CSP + HSTS web) + B2 (Permissions-Policy API) só                                                                           |
| D-2 | Estratégia de CSP | **Pragmatic com `'unsafe-inline'` + `'unsafe-eval'`** (opção A/C), com TODO para migrar para nonce-based em follow-up separado |

---

## 3. B1 — Next.js web (`apps/web/next.config.ts`)

### 3.1 State atual

O arquivo já tem `headers()` com 4 cabeçalhos:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

### 3.2 Mudança

Adicionar dois cabeçalhos ao mesmo array:

```ts
headers: async () => [
  {
    source: '/:path*',
    headers: [
      // existentes (mantidos)
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      // novos
      {
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      },
      // TODO(csp-nonce): migrate to nonce-based CSP via proxy.ts for strict XSS defense.
      // Current policy allows 'unsafe-inline'+'unsafe-eval' because Next.js 16 runtime,
      // React 19, Sentry, and Turbopack dev overlay depend on them. Pragmatic hardening;
      // nonce migration tracked separately.
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.bensseg.com wss://api.bensseg.com https://chat.bensseg.com wss://chat.bensseg.com https://*.ingest.us.sentry.io",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "object-src 'none'",
          'upgrade-insecure-requests',
        ].join('; '),
      },
    ],
  },
],
```

### 3.3 Justificativas por diretiva

| Diretiva                                          | Por quê                                                   |
| ------------------------------------------------- | --------------------------------------------------------- |
| `default-src 'self'`                              | Fallback seguro para o que não for explicitamente listado |
| `script-src 'self' 'unsafe-inline' 'unsafe-eval'` | Next.js runtime + Sentry + Turbopack dev overlay          |
| `style-src 'self' 'unsafe-inline'`                | Tailwind CSS-in-JS, shadcn styles inline                  |
| `img-src 'self' data: https:`                     | Avatars, data URLs, imagens remotas                       |
| `font-src 'self' data:`                           | Fontes locais e embutidas                                 |
| `connect-src` allowlist                           | API (HTTPS+WSS), chat (HTTPS+WSS), Sentry ingest          |
| `frame-ancestors 'none'`                          | Anti-clickjacking (mais forte que X-Frame-Options)        |
| `base-uri 'self'`                                 | Bloqueia `<base>` injetado                                |
| `form-action 'self'`                              | Bloqueia form submission cross-origin                     |
| `object-src 'none'`                               | Bloqueia plugins legados (Flash, Java)                    |
| `upgrade-insecure-requests`                       | Browser força HTTPS mesmo se link for HTTP                |

### 3.4 Interação com Vercel

Vercel hoje envia `Strict-Transport-Security: max-age=63072000` (sem `includeSubDomains`). Quando o `next.config.ts` declarar HSTS via `headers()`, **o valor do next.config vence** — Vercel delega para o framework.

Precedência confirmada pós-deploy via `curl -I https://app.bensseg.com`.

---

## 4. B2 — Fastify API (`apps/server/src/app.ts`)

### 4.1 State atual

`@fastify/helmet` registrado com CSP customizado (para Scalar docs) + HSTS. **Não envia Permissions-Policy** (o plugin do Fastify não expõe essa opção no momento).

### 4.2 Mudança

Adicionar um hook `onSend` após o `helmet.register`:

```ts
app.addHook('onSend', async (_request, reply, payload) => {
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return payload
})
```

### 4.3 Por que `onSend` e não helmet

`@fastify/helmet` usa o pacote `helmet` (Express middleware) por baixo via adapter. A API dele expõe `contentSecurityPolicy` e `hsts` como opções mas não `permissionsPolicy`. Seria preciso monkey-patch ou fork. Um hook `onSend` é trivial, explícito, e não depende de API não-documentada.

Alternativa descartada: `app.register(permissionsPolicyPlugin)` — plugin não existe oficialmente para Fastify.

---

## 5. Testes

### 5.1 B1 (web)

- `pnpm --filter @app/web build` — Next.js aceita headers()
- Manual: `curl -I http://localhost:3000` — verificar os 6 cabeçalhos presentes
- Pós-deploy: `curl -I https://app.bensseg.com` — confirmar em prod
- Smoke visual: abrir `/clients` no browser, verificar console por violações CSP

### 5.2 B2 (server)

- **Unit test novo** em `apps/server/src/__tests__/security-headers.spec.ts`:
  ```ts
  it('adds Permissions-Policy header to responses', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/health' })
    expect(res.headers['permissions-policy']).toBe(
      'camera=(), microphone=(), geolocation=()'
    )
  })
  ```
- Pós-deploy: `curl -I https://api.bensseg.com/api/v1/clients` — confirmar em prod

### 5.3 Quality gates

- `pnpm lint && pnpm typecheck && pnpm build && pnpm test` verdes
- Sem novos testes Playwright — headers não afetam UI

---

## 6. Riscos e mitigações

| Risco                                                                          | Impacto | Mitigação                                                                      |
| ------------------------------------------------------------------------------ | ------- | ------------------------------------------------------------------------------ |
| CSP bloqueia algo no dev overlay do Next (e.g., React Dev Tools injection)     | Baixo   | Smoke visual em dev antes de mergear; se bloquear, ajustar                     |
| `connect-src` allowlist esquece um domínio (e.g., analytics adicionado depois) | Médio   | Manter a lista em 1 lugar; qualquer erro CSP aparece no console do browser     |
| HSTS `preload` é irreversível (≥ 1 ano de commitment)                          | Médio   | `max-age=63072000` já estava em prod — não é mudança nova                      |
| Vercel edge sobrescreve HSTS do next.config                                    | Baixo   | Verificar via `curl -I` pós-deploy; se sobrescrever, adicionar via vercel.json |

---

## 7. Rollout

1. PR único
2. `pnpm lint typecheck build test` verde
3. Merge na main
4. Deploy automático (Vercel para web, GitHub Actions para server)
5. Verificação pós-deploy via `curl -I` nos 2 endpoints
6. Se algo quebrar, hotfix imediato (curl mostra qual header está errado)

---

## 8. Fora de escopo

- **B3** — cookie `bens-active-org` httpOnly (precisa decisão UX)
- Migração para CSP nonce-based (TODO documentado no arquivo)
- Scoped CSP para `/api/docs` no Fastify (P1 do audit — requer `onRoute` hook mais complexo)
- Adicionar mais diretivas ao `Permissions-Policy` (USB, HID, payment, etc.)

---

## 9. Critérios de aceitação

- [ ] `next.config.ts` tem `Strict-Transport-Security` com `includeSubDomains`
- [ ] `next.config.ts` tem `Content-Security-Policy` com as 11 diretivas do §3.2
- [ ] `next.config.ts` tem TODO comment para migração nonce-based
- [ ] `app.ts` tem hook `onSend` setando `Permissions-Policy`
- [ ] Novo test verifica o header no server
- [ ] 5 quality gates verdes
- [ ] `curl -I https://app.bensseg.com` em prod retorna os 6 cabeçalhos
- [ ] `curl -I https://api.bensseg.com/api/v1/clients` retorna `Permissions-Policy`
- [ ] Console do browser sem violações CSP em /clients, /proposals, /policies, /chat
