# H4. Cobertura de Testes em Modulos Light

> **Severidade:** HIGH (qualidade) | **Esforco:** G (3-5 dias) | **Prioridade:** Mes 2

---

## Problema

Apenas modulos DDD Full tem testes. ~40 use cases sem cobertura.

## Status Atual

| Modulo       | Use Cases | Testes     |
| ------------ | --------- | ---------- |
| Proposal     | 6         | 3 arquivos |
| Commission   | 9         | 4 arquivos |
| Client       | 5         | 0          |
| Policy       | 5         | 0          |
| Claim        | 5         | 0          |
| Assistance   | 4         | 0          |
| Document     | 4         | 0          |
| Endorsement  | 3         | 0          |
| Insurer      | 2         | 0          |
| Notification | 4         | 0          |

## Implementacao

Seguir padrao de `advance-proposal-stage.spec.ts`:

```typescript
function createMockRepo(entity: Entity | null): EntityRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(entity),
    findMany: vi.fn(),
  }
}

describe('CreateClient', () => {
  it('creates client with valid data', async () => {
    // Arrange
    const repo = createMockRepo(null)
    const useCase = new CreateClient(repo)
    // Act
    await useCase.execute({ ... })
    // Assert
    expect(repo.save).toHaveBeenCalledWith(...)
  })

  it('rejects duplicate document', async () => {
    // ...
  })
})
```

## Ordem de Prioridade

1. Client (mais usado)
2. Policy (fluxo critico)
3. Claim (estado machine)
4. Document (upload/presigned)
5. Endorsement, Assistance, Insurer, Notification

## Criterios de Aceite

- [ ] 50%+ cobertura em modulos Light
- [ ] 80%+ cobertura em DDD Full
- [ ] `pnpm test` passa com todos os novos testes
- [ ] Padrao Arrange-Act-Assert em todos os testes
