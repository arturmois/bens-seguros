# M5. Decomposicao de Componentes >200 Linhas

> **Severidade:** MEDIO (manutenibilidade) | **Esforco:** M (1-2 dias) | **Prioridade:** Mes 2

---

## Problema

5-6 componentes de feature excedem o limite de 200 linhas do CLAUDE.md.

## Componentes a Decompor

| Componente              | Linhas | Acao                                                     |
| ----------------------- | ------ | -------------------------------------------------------- |
| `channel-qr-dialog.tsx` | 280    | Extrair `channel-qr-tab.tsx` + `channel-pairing-tab.tsx` |
| `client-form.tsx`       | 275    | Extrair field groups em sub-componentes                  |
| `policies-table.tsx`    | 266    | Extrair `policy-table-row.tsx` + filtros                 |
| `conversation-list.tsx` | 264    | Extrair `conversation-item.tsx`                          |
| `proposals-table.tsx`   | 257    | Extrair `proposal-table-row.tsx` + filtros               |

## Padrao de Decomposicao

```
Antes:
  channel-qr-dialog.tsx (280 linhas)

Depois:
  channel-qr-dialog.tsx (~100 linhas — parent, tab state, socket)
  channel-qr-tab.tsx (~130 linhas — QR code display)
  channel-pairing-tab.tsx (~130 linhas — phone input, pairing)
```

## Regras

- Componentes UI primitivos (shadcn/sidebar, drawer, combobox) NAO precisam ser decompostos
- Apenas componentes de feature devem respeitar o limite
- Cada sub-componente deve ter responsabilidade unica

## Criterios de Aceite

- [ ] Todos componentes de feature <= 200 linhas
- [ ] Funcionalidade identica apos decomposicao
- [ ] Sem prop drilling alem de 2 niveis
- [ ] `pnpm typecheck` e `pnpm build` passam
