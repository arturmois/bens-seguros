# H4 — Test Coverage (Business-Critical First)

## Objetivo

Adicionar testes unitarios para os 23 use cases de risco HIGH e MEDIUM que estao descobertos. Foco em state machines, calculos financeiros e validacoes de dominio — CRUD trivial fica fora do escopo.

## Estado Atual

- **70 use cases** no monorepo, **16 com testes** (23% coverage)
- **54 sem testes** — categorizados por risco: 11 HIGH, 12 MEDIUM, 31 LOW
- Pattern existente: Vitest + `vi.fn()` mocks + Arrange-Act-Assert
- DDD Full (Proposal, Commission) parcialmente cobertos
- Modulos inteiros sem testes: Assistance, Endorsement, Insurer, Notification, Occurrence

## Abordagem

**B — High + Medium Risk (23 use cases)**. Cobre toda logica de negocio relevante sem desperdicar tempo em CRUD trivial. Meta: 39/70 testados (56%).

## Escopo

### Tier 1 — State Machines (7 use cases, maior risco)

| Use Case                   | Modulo      | Risco | Tests Est. |
| -------------------------- | ----------- | ----- | ---------- |
| `update-claim-status`      | Claim       | HIGH  | ~15        |
| `update-assistance-status` | Assistance  | HIGH  | ~12        |
| `close-conversation`       | Chat Server | HIGH  | ~6         |
| `transfer-conversation`    | Chat Server | HIGH  | ~5         |
| `return-to-queue`          | Chat Server | HIGH  | ~4         |
| `return-to-bot`            | Chat Server | HIGH  | ~4         |
| `mark-proposal-lost`       | Proposal    | HIGH  | ~4         |

### Tier 2 — Financial / Side Effects (5 use cases)

| Use Case            | Modulo     | Risco  | Tests Est. |
| ------------------- | ---------- | ------ | ---------- |
| `on-policy-issued`  | Commission | HIGH   | ~5         |
| `pay-commission`    | Commission | MEDIUM | ~4         |
| `create-commission` | Commission | MEDIUM | ~3         |
| `cancel-policy`     | Policy     | MEDIUM | ~4         |
| `create-proposal`   | Proposal   | MEDIUM | ~4         |

### Tier 3 — Validation / Import (5 use cases)

| Use Case                           | Modulo   | Risco  | Tests Est. |
| ---------------------------------- | -------- | ------ | ---------- |
| `complete-checklist-by-attachment` | Proposal | MEDIUM | ~3         |
| `parse-policy-import`              | Policy   | MEDIUM | ~4         |
| `parse-client-import`              | Client   | MEDIUM | ~4         |
| `upload-document`                  | Document | MEDIUM | ~4         |
| `delete-document`                  | Document | MEDIUM | ~3         |

### Tier 4 — Simple Domain (6 use cases)

| Use Case                      | Modulo       | Risco  | Tests Est. |
| ----------------------------- | ------------ | ------ | ---------- |
| `create-insurer`              | Insurer      | MEDIUM | ~3         |
| `mark-as-read`                | Notification | MEDIUM | ~2         |
| `count-alerts-by-entity-type` | Notification | LOW\*  | ~2         |
| `count-unread-notifications`  | Notification | LOW\*  | ~2         |
| `create-notification`         | Notification | LOW\*  | ~2         |

\*Incluidos para cobertura minima do modulo Notification.

**Total estimado: ~95 testes em 22 arquivos.**

## Padroes de Teste

Manter patterns existentes do projeto, sem criar nova infraestrutura.

### Estrutura de cada arquivo

```typescript
// Mock factory no topo
function createMockRepo(entity: Entity | null): EntityRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(entity),
  }
}

// Data factory
function makeEntityData(overrides?: Partial<EntityInput>): EntityInput {
  return { /* defaults */ ...overrides }
}

describe('UseCaseName', () => {
  let repo: EntityRepository
  let useCase: UseCaseName

  beforeEach(() => {
    vi.clearAllMocks()
    repo = createMockRepo(makeEntity())
    useCase = new UseCaseName(repo)
  })

  it('describes expected behavior', async () => {
    // Arrange
    // Act
    const result = await useCase.execute({ ... })
    // Assert
    expect(result).toEqual(...)
    expect(repo.save).toHaveBeenCalledWith(...)
  })
})
```

### Regras

- **Factories em cada arquivo** — sem shared test utils (pattern existente)
- **Apenas unit tests** com mocks — sem integration tests (fora do escopo)
- **Nomes descrevem comportamento** — `it('rejects commission from PAID status')`
- **State machines:** testar todas transicoes validas + pelo menos 2 invalidas
- **Financial:** verificar calculos em cents/basis points
- **Not found:** todo use case que faz lookup testa entity not found
- **Arrange-Act-Assert** — sem excepcoes

## Fora do Escopo

- 31 use cases LOW risk (CRUD trivial: get, list, export, delete simples)
- Integration tests com banco real
- Shared test utilities / refactoring de test infra
- E2E tests (ja existem 5)

## Criterios de Aceite

- [ ] 23 use cases com testes unitarios
- [ ] ~95 testes passando
- [ ] Todas transicoes de estado cobertas (Claim, Assistance, Chat, Proposal)
- [ ] Calculos financeiros verificados (Commission on-policy-issued, pay)
- [ ] `pnpm test` passa sem erros
- [ ] Zero `any`, zero `console.log` nos testes
