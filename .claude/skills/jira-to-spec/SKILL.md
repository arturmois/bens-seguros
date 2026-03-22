---
name: jira-to-spec
description: "Fetch a Jira issue and format it as a structured spec for implementation analysis. Use this skill whenever the user mentions a Jira ticket key (e.g., SCRUM-23), wants to pull a spec from Jira, asks to analyze a backlog item, or says things like 'pull the spec for', 'what does ticket X say', 'can we implement SCRUM-X', or 'read the Jira card'. Always use this before starting implementation of any Jira-referenced work."
argument-hint: 'SCRUM-23'
---

# Jira to Spec

Fetch a Jira issue by key and present it as a clean, structured specification for the user to review before any implementation work begins.

## How it works

1. Extract the issue key from `$ARGUMENTS` (e.g., `SCRUM-23`)
2. Load the `getJiraIssue` MCP tool via `ToolSearch`
3. Fetch the issue from Jira
4. Format the response into a structured spec
5. Present it to the user and ask if it's feasible in the current project

**This skill does NOT implement anything.** It only fetches, formats, and presents.

## Step-by-step

### 1. Parse the argument

The user provides a Jira issue key like `SCRUM-23`. Extract it from `$ARGUMENTS`. If no key is provided, ask the user for one.

### 2. Load and call the Jira tool

Use `ToolSearch` with query `select:mcp__plugin_atlassian_atlassian__getJiraIssue` to load the tool schema.

Then call `mcp__plugin_atlassian_atlassian__getJiraIssue` with:

- `cloudId`: `arturmoiscontato.atlassian.net`
- `issueIdOrKey`: the issue key from the argument
- `responseContentFormat`: `markdown`

### 3. Format the spec

Parse the Jira response and produce a markdown document with these sections:

```
# [Summary from Jira]

| Campo       | Valor                    |
|-------------|--------------------------|
| **Ticket**  | SCRUM-XX                 |
| **Tipo**    | Bug / Feature / Story    |
| **Status**  | Backlog / Feito / etc    |
| **Prioridade** | High / Medium / Low   |

## Problema / Contexto
Extract from the description: the "Contexto / Problema" section, or summarize the issue context.

## Solucao Proposta
Extract from the description: the "Solucao Proposta" section, or summarize the proposed solution.

## Criterios de Aceite
Extract any acceptance criteria, checklists, or expected behavior sections.
If none exist explicitly, derive them from the proposed solution as bullet points.

## Escopo e Limitacoes
Extract any "O que NAO sera feito" or scope limitation sections.
If none exist, write "Nao especificado no cartao."

## Dados Tecnicos
Extract any technical details: database schemas, API specs, field definitions, UI wireframes described in text.
If none exist, omit this section.
```

### 4. Present to the user

After formatting the spec, present it and ask:

> **Spec extraida do Jira.** Analise acima e me diga:
>
> 1. Podemos implementar isso no projeto atual?
> 2. Quer que eu crie um plano de implementacao?
> 3. Alguma duvida ou ponto que precisa de mais detalhe?

Do NOT proceed to implementation. Wait for the user's decision.
