# SEC-03. Presenter Pattern — PII nas Respostas

> **Severidade:** HIGH (LGPD) | **Esforco:** M (2-3 dias) | **Prioridade:** Semana 2-3

---

## Problema

API retorna CPF/CNPJ completo para todas as roles. COMMERCIAL ve CPF de clientes que nao sao seus. Sem masking.

## Especificacao (SECURITY-SPEC SEC-2)

3 niveis de exposicao:

```
List (todas as roles):       document: '***456.789-**' (mascarado)
Detail (COMMERCIAL, proprio): document: '123.456.789-00' (completo)
Detail (COMMERCIAL, outro):   document: '***456.789-**' (mascarado)
Detail (MANAGER+):           document: '123.456.789-00' (completo)
```

## Implementacao

### Etapa 1: Funcao de Masking

```typescript
// packages/core/src/shared/presenters/mask-document.ts
export function maskDocument(document: string): string {
  const digits = document.replace(/\D/g, '')
  if (digits.length === 11) {
    // CPF: ***456.789-**
    return `***${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`
  }
  if (digits.length === 14) {
    // CNPJ: **456.789/0001-**
    return `**${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-**`
  }
  return '***'
}
```

### Etapa 2: Client Presenter

```typescript
// packages/core/src/modules/client/application/client-presenter.ts
interface PresenterContext {
  role: Role
  userId: string
}

export const ClientPresenter = {
  toList(client: ClientData): ClientListResponse {
    return {
      id: client.id,
      name: client.name,
      type: client.type,
      tags: client.tags,
      document: maskDocument(client.document),
      createdAt: client.createdAt,
      // SEM email, phone, address, birthDate
    }
  },

  toDetail(client: ClientData, ctx: PresenterContext): ClientDetailResponse {
    const canSeeFullDocument =
      ctx.role === 'OWNER' ||
      ctx.role === 'ADMIN' ||
      ctx.role === 'MANAGER' ||
      (ctx.role === 'COMMERCIAL' && client.salespersonId === ctx.userId)

    return {
      ...client,
      document: canSeeFullDocument
        ? client.document
        : maskDocument(client.document),
    }
  },
}
```

### Etapa 3: Aplicar nos Route Handlers

```typescript
// apps/server/src/routes/v1/client-routes.ts
// List endpoint:
const clients = data.map((c) => ClientPresenter.toList(c))

// Detail endpoint:
const client = ClientPresenter.toDetail(data, {
  role: request.member.role,
  userId: request.user.id,
})
```

### Etapa 4: Regras Adicionais

- Nunca retornar `documentEncrypted` ou `documentHash` na API
- VIEWER: apenas dados mascarados (list level)
- Aplicar mesmo padrao em Proposal, Policy (que referenciam Client)

## Criterios de Aceite

- [ ] `maskDocument()` com testes para CPF e CNPJ
- [ ] List endpoints retornam document mascarado
- [ ] Detail: COMMERCIAL ve CPF completo apenas dos seus clientes
- [ ] Detail: MANAGER+ ve CPF completo de todos
- [ ] VIEWER ve apenas mascarado em qualquer endpoint
- [ ] `documentEncrypted`/`documentHash` nunca expostos na API
