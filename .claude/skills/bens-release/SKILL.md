---
name: bens-release
description: Use quando o usuário pedir "gerar versão do sistema", "criar release", "release nova", "bump de versão", "tag de prod", "vX.Y.Z", "deployar prod", ou variantes ("gerar versao", "subir release", "fechar versão", "release v1.2.0"). Cobre o fluxo trunk + tag-based release do bens-seguros: pre-flight de main limpo, análise de commits desde a última tag, escolha de bump semver, detecção de backfills pendentes em packages/db/scripts/, criação de tag anotada com highlights agrupados, push pra origin (triggera deploy-server.yml + deploy-chat.yml), e verificação dos workflows. Skill é PT-BR, ferramentas usadas: `git`, `gh`. Não inclui Vercel/web (deploya em push pra main, não via tag).
---

# bens-release — gerar versão e disparar deploy de prod

## Princípio

Deploy de prod = `git tag v*` + `git push origin v*`. `main` é sempre verde mas não deploya; somente tag dispara `deploy-server.yml` e `deploy-chat.yml` (path `tags: ['v*']`). Vercel deploya o frontend em push pra `main`, fora deste fluxo.

## Quando usar

- "gerar versão do sistema", "criar release", "release nova"
- "bump de versão", "subir uma versão", "fechar versão"
- "deployar prod", "subir pra produção"
- Menção direta a uma versão alvo: "criar v1.3.0", "tag v2.0.0"

## Quando NÃO usar

- Push de código novo (esse não deploya — só CI roda)
- Hotfix de web-only (Vercel já deploya automaticamente em push pra main; tag não é necessária)
- Reverter prod (rollback usa `scripts/deploy.sh` na VPS, não tag — ver `docs/DEPLOY-TUTORIAL.md` seção Rollback)
- Branch ≠ main, working tree sujo, ou divergência com `origin/main` — abortar e resolver primeiro

## Fluxo

### Fase 1 — Pre-flight (abortar se qualquer um falhar)

```bash
git branch --show-current                 # deve ser "main"
git status --porcelain                    # deve ser vazio
git fetch origin && git status -sb        # deve ser "## main...origin/main" sem ahead/behind
```

Se algo falhar: parar, explicar ao usuário, não criar tag.

### Fase 2 — Análise de commits desde a última tag

```bash
git tag --sort=-v:refname | head -5                          # tags recentes
LAST_TAG=$(git tag --sort=-v:refname | head -1)
git log "$LAST_TAG..HEAD" --pretty=format:"%h %s"           # tudo desde último
git log "$LAST_TAG..HEAD" --grep="^feat" --oneline          # features
git log "$LAST_TAG..HEAD" --grep="^fix" --oneline           # fixes
git log "$LAST_TAG..HEAD" --grep="BREAKING CHANGE"          # breaking?
```

Critério de bump (semver, em conformidade com Conventional Commits):

| Sinal nos commits                                                       | Bump      | Exemplo         |
| ----------------------------------------------------------------------- | --------- | --------------- |
| `BREAKING CHANGE:` no body, ou `!` após o tipo (`feat!:`, `refactor!:`) | **MAJOR** | v1.1.1 → v2.0.0 |
| Pelo menos um `feat:` sem breaking                                      | **MINOR** | v1.1.1 → v1.2.0 |
| Só `fix:` / `chore:` / `refactor:` / `docs:` / `test:`                  | **PATCH** | v1.1.1 → v1.1.2 |

Refactors visíveis ao usuário (drop de feature, rename de endpoint público) são breaking mesmo sem `!` — perguntar ao user em caso de dúvida.

### Fase 3 — Detectar backfills pendentes

Scripts em `packages/db/scripts/backfill-*.ts` são one-shot pós-deploy quando uma feature muda `Proposal.details` (JSON). Listar os que foram adicionados desde a última tag:

```bash
git diff "$LAST_TAG..HEAD" --name-only --diff-filter=A | grep 'packages/db/scripts/backfill-' || true
```

Para cada backfill encontrado, incluir no body da tag o comando exato:

```bash
docker compose -f docker-compose.prod.yml exec -T server \
  pnpm --filter @repo/db exec tsx scripts/<NOME>.ts --dry-run
# se OK, rodar sem --dry-run
```

Ver `docs/DEPLOY-TUTORIAL.md` seção 2.9.1 pra tabela canônica de backfills.

### Fase 4 — Confirmar com user

Apresentar resumo curto (último tag, # commits, # feats, # fixes, breaking?, backfills detectados) e propor o bump com `AskUserQuestion`. Opções recomendadas: a versão sugerida (com **(Recomendado)**), uma alternativa adjacente, "só criar tag local" (cria mas não pusha).

Criar a tag de prod é **hard-to-reverse** (afeta state compartilhado, dispara deploy) — **sempre confirmar antes**, mesmo em modo autônomo. Memória `autonomous-pr-flow-preference` se aplica a PRs, não a tag de produção.

### Fase 5 — Criar tag anotada com highlights

Body da tag segue o padrão estabelecido (ver `git show v1.2.0 --no-patch`):

```
Release vX.Y.Z

Highlights desde vA.B.C:

Features:
- feat: <título> (#<PR>)
- ...

Refactors / Chores:
- chore/refactor: <título> (#<PR>)
- ...

Fixes:
- fix(<scope>): <título>
- ...

Pos-deploy obrigatorio:
- Rodar backfill <NOME> (idempotente, --dry-run primeiro):
  docker compose -f docker-compose.prod.yml exec -T server \
    pnpm --filter @repo/db exec tsx scripts/<NOME>.ts --dry-run
```

Comando para criar (HEREDOC pra preservar quebras):

```bash
git tag -a vX.Y.Z -m "$(cat <<'EOF'
Release vX.Y.Z
...
EOF
)"
```

Notas:

- Sem diacritics no body (terminais SSH às vezes quebram). Comentários e prosa pt-BR em outros artefatos seguem CLAUDE.md.
- Agrupar por tipo (feat/refactor/chore/fix), não por ordem cronológica.
- Refs `#NNN` aparecem como links automaticamente no GitHub.

### Fase 6 — Push e verificação

```bash
git push origin vX.Y.Z
gh run list --limit 3 --workflow=deploy-server.yml          # deve ter v1.X.Y queued/in_progress
gh run list --limit 3 --workflow=deploy-chat.yml            # idem
```

Reportar ao usuário:

1. Tag criada + pushada
2. Run IDs dos dois workflows + comando `gh run watch <id>` pra acompanhar
3. Backfill(s) pendentes com comando completo (SSH + docker exec)
4. Heads-up se houver run anterior **failed** (ex.: v1.1.0 falhou em quality-gates) — sinal pra ficar atento ao primeiro check

## Red flags — abortar antes de tag

| Sinal                                     | Ação                                                                         |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| Working tree sujo                         | Commitar/stashar primeiro                                                    |
| Branch ≠ main                             | Mergear pra main, não taguear branch feature                                 |
| `ahead` ou `behind` origin/main           | `git pull --rebase` e re-checar CI antes                                     |
| Último CI em main falhou                  | NÃO taguear — corrigir main primeiro (`gh run list --branch main --limit 5`) |
| Sem commits desde última tag              | Não criar release vazia                                                      |
| Backfill detectado e user não está ciente | Pausar e explicar antes de tag                                               |
| Sem rede pra github.com                   | Tag local OK, mas avisar e re-tentar push depois                             |

## Critérios de versão em casos limite

- **Primeira feature após muitos fixes:** ainda é MINOR (qualquer feat → MINOR).
- **Refactor de infra sem mudança de comportamento de prod:** PATCH (não houve mudança visível ao usuário).
- **Mudança de provider externo com mesma API pública (ex.: APIBrasil → Consultar Placa):** PATCH se UX igual; MINOR se UX mudou (campo, mensagem).
- **Drop de feature ou endpoint:** MAJOR (mesmo sem `BREAKING CHANGE:` no commit).

## Memory referenciada

- `deploy-flow-rationale` — por que tag-based e não GitFlow
- `prod-has-real-data` — prod tem dados reais desde 2026-05-06; sempre confirmar destrutivo
- `autonomous-pr-flow-preference` — vale pra PRs, NÃO pra criar tag de produção
- `prod-prisma-baselined` — migrations consolidadas; `deploy.sh` aplica RLS automaticamente

## Arquivos relacionados

- `.github/workflows/deploy-server.yml` — trigger `tags: ['v*']`
- `.github/workflows/deploy-chat.yml` — trigger `tags: ['v*']`
- `docs/DEPLOY-TUTORIAL.md` — seção 2.9 (subir serviços) e 2.9.1 (backfills)
- `packages/db/scripts/backfill-*.ts` — scripts pós-deploy
- `scripts/deploy.sh` — executado no VPS pelos workflows; rollback manual também usa
