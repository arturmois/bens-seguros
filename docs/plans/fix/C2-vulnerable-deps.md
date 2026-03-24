# C2. Vulnerabilidades em Dependencias

> **Severidade:** CRITICO | **Esforco:** P (30min) | **Prioridade:** Semana 1

---

## Problema

Dependencias transitivas com vulnerabilidades conhecidas (HIGH/MODERATE).

## Vulnerabilidades

| Dependencia                   | Severidade | Via              | Issue                                   |
| ----------------------------- | ---------- | ---------------- | --------------------------------------- |
| `hono < 4.12.4`               | HIGH       | `@prisma/dev`    | Arbitrary file access via serveStatic   |
| `@hono/node-server < 1.19.10` | HIGH       | `@prisma/dev`    | Encoded slash auth bypass               |
| `effect < 3.20.0`             | HIGH       | `@prisma/config` | AsyncLocalStorage context contamination |
| `jsondiffpatch < 0.7.2`       | MODERATE   | `ai`             | XSS via HtmlFormatter                   |
| `ai < 5.0.52`                 | LOW        | `packages/ai`    | File type whitelist bypass              |

## Correcao

```bash
pnpm up prisma @prisma/client @prisma/adapter-pg
pnpm up ai
pnpm audit
```

## Criterios de Aceite

- [ ] `pnpm audit` retorna 0 vulnerabilidades HIGH
- [ ] `pnpm build` passa
- [ ] `pnpm test` passa
