---
name: bens-code-rules
description: Use ao escrever, refatorar ou revisar código no bens-seguros. Cobre regras detalhadas de TypeScript, naming conventions, SOLID, object calisthenics, clean code, error handling e language rules (pt-BR/EN). Extensão das ABSOLUTE PROHIBITIONS do CLAUDE.md.
---

# Regras de código — bens-seguros

## ABSOLUTE PROHIBITIONS (recap — também no CLAUDE.md)

- **NO `console.log`** — use Pino structured logger. Violation: lint error
- **NO `any` type** — zero tolerance. Use `unknown` + type narrowing. Violation: lint error
- **NO `// eslint-disable`** — fix the code, not the linter. No exceptions
- **NO `// @ts-ignore` or `// @ts-expect-error`** — fix the type, not the compiler
- **NO `as` type assertions** — use type guards, generics, or redesign. Exception: test mocks only
- **NO hardcoded secrets** — use `@repo/env` (t3-env + Zod validated)
- **NO `process.env` in app or package code** — always import `{ env }` from `@repo/env`. Exception: `apps/web` (Next.js client-side uses `process.env.NEXT_PUBLIC_*`)
- **NO `--no-verify` on git hooks** — fix the hook failure
- **NO empty catch blocks** — handle or rethrow with context
- **NO barrel exports that re-export everything** — explicit named exports only
- **NO inline raw HTML injection** — use React components, sanitize with DOMPurify if unavoidable

## TypeScript

- `strict: true` in all tsconfig files, no overrides
- Prefer `interface` over `type` for object shapes (extensibility)
- Use `const` assertions for literal types: `as const`
- Use discriminated unions over optional fields for state variants
- Use `satisfies` operator for type-safe object validation without widening
- Return types: explicit on public API functions, inferred on internal helpers
- Generics: use meaningful names (`TEntity`, `TResult`) not single letters
- Prefer `readonly` on properties that should not be mutated
- Use `Record<string, unknown>` instead of `object` or `{}`
- Use template literal types for string patterns where applicable

## Language Rules

- **Code identifiers (variables, functions, classes, interfaces, types, enums, constants):** always in English
- **Exception:** Brazilian acronyms with no translation — `cpf`, `cnpj`, `cep` — kept as-is
- **Exception:** Adapter implementations that integrate with a Brazilian vendor whose brand is Portuguese may keep the brand in the name, **as long as the English role prefix comes first**. Interfaces/ports stay fully English. Example: `LookupProviderConsultarPlaca implements VehicleLookupProvider`. Do not add a comment to identify the vendor — the class name already does.
- **Code comments:** English
- **UI display strings (labels, messages, placeholders, toasts, titles, tooltips, descriptions):** correct Brazilian Portuguese (pt-BR) with proper accents (á, é, í, ó, ú, ã, õ, ê, ô) and cedilla (ç)
- **NEVER** write Portuguese without diacritics in UI: `organizacao` → `organização`, `obrigatorio` → `obrigatório`, `Comecar Gratis` → `Começar Grátis`
- **Common mistakes to avoid:** `nao` → `não`, `informacoes` → `informações`, `maximo` → `máximo`, `minimo` → `mínimo`, `invalido` → `inválido`, `descricao` → `descrição`

## Naming Conventions

| Element          | Convention                           | Example                                     |
| ---------------- | ------------------------------------ | ------------------------------------------- |
| Files            | kebab-case                           | `create-client.ts`, `client-form.tsx`       |
| Classes          | PascalCase                           | `CreateClient`, `PrismaClientRepository`    |
| Interfaces       | PascalCase (no `I` prefix)           | `ClientRepository`, `StorageProvider`       |
| Types            | PascalCase                           | `ClientData`, `ProposalStage`               |
| Functions        | camelCase                            | `createTenantClient`, `calculateCommission` |
| Variables        | camelCase                            | `premiumValueInCents`, `isAuthenticated`    |
| Constants        | SCREAMING_SNAKE_CASE                 | `SOCKET_EVENTS`, `ROLE_HIERARCHY`           |
| Enums            | PascalCase (members SCREAMING_SNAKE) | `enum Role { OWNER, ADMIN }`                |
| React components | PascalCase                           | `ClientForm`, `ProposalDetail`              |
| Hooks            | camelCase with `use` prefix          | `useClients`, `useAuth`                     |
| Test files       | same as source + `.spec.ts`          | `proposal.spec.ts`                          |
| CSS variables    | kebab-case with `--` prefix          | `--color-primary-500`                       |

## SOLID Principles

- **Single Responsibility:** one class = one reason to change. Use cases do ONE thing
- **Open/Closed:** extend via DI (new repository implementation), not modification
- **Liskov Substitution:** all repository implementations must honor the interface contract
- **Interface Segregation:** small, focused interfaces. `ClientRepository` not `IEverythingRepository`
- **Dependency Inversion:** domain depends on abstractions (ports), never on infrastructure

## Object Calisthenics

1. **One level of indentation per method** — extract to helper if nested deeper
2. **No `else` keyword** — use early returns, guard clauses, or polymorphism
3. **Wrap primitives in domain types** — money in cents (`premiumValueInCents: number`), percentages in basis points
4. **First-class collections** — wrap arrays in typed objects when they carry domain meaning
5. **One dot per line** — no method chaining beyond 2 levels (exceptions: Prisma queries, Zod chains)
6. **Keep entities small** — max 200 lines per class/component. Extract if growing
7. **No classes with more than 2 instance variables** (relaxed: max 5 for entities, DTOs exempt)
8. **No getters/setters that expose internal state** — behavior over data
9. **All classes must be final or abstract** (TS: avoid inheritance, prefer composition)

## Clean Code

- Functions do ONE thing, named by what they do: `advanceProposalStage` not `processProposal`
- Max 3 parameters per function — use an options object beyond that
- No boolean parameters — use separate functions or enums
- No magic numbers — extract to named constants
- No dead code — delete it, git remembers
- No commented-out code — delete it, git remembers
- Comments explain WHY, never WHAT — the code tells what
- Fail fast — validate at boundaries, trust internal code
- Prefer pure functions — minimize side effects, isolate IO at edges

## Error Handling

- Custom error classes with `.code` property for programmatic handling
- Domain errors: `ClientNotFoundError`, `InvalidStageTransitionError`
- HTTP translation: domain error `.code` maps to HTTP status in handler layer
- Never swallow errors — rethrow with context or handle explicitly
- Use Result pattern for expected failures, exceptions for unexpected ones

## Performance Guidelines

- **Cursor-based pagination** — never `OFFSET/LIMIT`
- **Database indexes** on all query filter combinations
- **React Query caching** — `staleTime: 60s` default
- **Code splitting** — dynamic imports for heavy components
- **Image optimization** — Next.js `<Image>` component always
- **Lazy loading** — defer non-critical UI (modals, charts, PDF renderer)
- **No N+1 queries** — use Prisma `include` or batch queries
- **Redis cache** for frequently accessed, rarely changed data

## Security Guidelines

- **Zod validation** at every system boundary (HTTP input, env vars, external APIs)
- **Helmet** for HTTP security headers
- **Rate limiting** — 100 req/min global
- **CORS** — restrict to known origins only
- **Cookies** — httpOnly, secure, sameSite
- **Presigned URLs** for document access (time-limited)
- **RLS** for tenant isolation — defense in depth beyond middleware
- **No SQL/NoSQL injection** — parameterized queries only (Prisma/Mongoose handle this)
- **No inline HTML rendering** — use React components; sanitize with DOMPurify if raw HTML is absolutely required
- **CSP headers** — Content Security Policy configured via Helmet
- **Dependency auditing** — run `pnpm audit` regularly, no known critical vulnerabilities

## Quando usar esta skill

- Antes de fazer code review manual ou via subagent
- Ao refatorar código existente
- Ao implementar feature nova (consultar antes de criar arquivos)
- Quando o lint reclamar e a regra não estiver óbvia
- Ao revisar PR de terceiro
