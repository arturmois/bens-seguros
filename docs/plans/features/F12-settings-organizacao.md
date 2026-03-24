# F12. Settings > Organizacao

> **Esforco:** P-M (1-2 dias) | **Impacto:** Medio | **Prioridade:** Mes 2 (pos-Membros)

---

## Descricao

Editar nome, slug e logo da organizacao. Configuracoes basicas da corretora.

## Por Que

Corretora precisa personalizar nome e identidade visual. Logo aparece em PDFs (F03) e no app.

## Implementacao

### Backend

```typescript
// apps/server/src/routes/v1/organization-routes.ts

GET / api / v1 / organization // Detalhes da org atual
PUT / api / v1 / organization // Atualizar nome, slug
PUT / api / v1 / organization / logo // Upload de logo (multipart)
```

#### RBAC

```typescript
// Apenas OWNER pode editar organizacao
requireAbility('manage', 'Organization')
```

### Frontend

```
features/settings/components/organization/
  organization-page.tsx     (~150 linhas)
  organization-form.tsx     (~100 linhas — nome, slug)
  logo-upload.tsx           (~80 linhas — drag & drop, preview)
```

#### Layout

```
┌────────────────────────────────────┐
│ Organizacao                        │
├────────────────────────────────────┤
│ Logo: [drag & drop area]           │
│ Nome: [Corretora ABC Seguros    ]  │
│ Slug: [corretora-abc            ]  │
│                                    │
│ [Salvar alteracoes]                │
└────────────────────────────────────┘
```

## Criterios de Aceite

- [ ] Editar nome da organizacao
- [ ] Editar slug (com validacao de unicidade)
- [ ] Upload de logo (imagem, max 2MB)
- [ ] Preview do logo antes de salvar
- [ ] RBAC: apenas OWNER edita
- [ ] Logo armazenado no R2
