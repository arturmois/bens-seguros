# Quality Gates

Catraca de qualidade de código no estilo do vídeo do Lucas Montano: baseline congelado em JSON, PR não pode piorar nenhuma métrica.

## Uso

```bash
# Capturar baseline atual (uso único, na main)
node .quality-gates/quality-gate.mjs --baseline

# Verificar se branch atual regrediu vs baseline
node .quality-gates/quality-gate.mjs --check

# Pular coletor específico
node .quality-gates/quality-gate.mjs --check --skip=coverage,duplication
```

## Estrutura

- `quality-gate.mjs` — entry point (orquestra coletores, gera baseline/relatório)
- `collectors/` — um arquivo por métrica (`file-size`, `eslint`, `duplication`, `coverage`)
- `baseline.json` — estado congelado, versionado
- `output/` — `metrics.json` (estado atual) + `report.md` (markdown). **Não versionado.**

## Métricas

| Métrica                | Coletor           | Fonte                                             |
| ---------------------- | ----------------- | ------------------------------------------------- |
| Arquivos > 200 linhas  | `file-size.mjs`   | walk em `apps/`, `packages/` (regra do CLAUDE.md) |
| ESLint errors/warnings | `eslint.mjs`      | `pnpm exec eslint --format json`                  |
| % duplicação           | `duplication.mjs` | `pnpm exec jscpd` (devDep do root)                |
| Cobertura de testes    | `coverage.mjs`    | `coverage/coverage-summary.json` por workspace    |

## Cobertura — pré-requisito

O coletor de cobertura lê `coverage-summary.json` por workspace. Pra gerar:

```bash
pnpm test --coverage --coverage.reporter=json-summary
```

Se nenhum workspace tiver o arquivo, o coletor reporta `not collected`.

## Regra da catraca

Cada PR pode adicionar código, mas **não pode aumentar nenhuma métrica** (nem por 1 violação, nem por 0,1%). Só pode melhorar ou empatar.

PRs dedicados a refatoração reduzem o baseline ao longo do tempo.
