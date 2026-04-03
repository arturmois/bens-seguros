# Gestão Mínima de Seguradoras — Design Spec

**Data:** 2026-04-02
**Status:** Aprovado
**Contexto:** A emissão de apólice já exige seleção de seguradora, mas o produto não oferece hoje um ponto de gestão no frontend para cadastrar e manter seguradoras por tenant. O backend e o banco já possuem a entidade `Insurer`, então o gap é principalmente de produto, navegação, permissões e UX operacional.

---

## Problema

Hoje o sistema já suporta seguradoras no domínio:

- Banco com model `Insurer`
- API para criar e listar seguradoras
- Seleção de seguradora no fluxo de emissão de apólice

O problema é que esse recurso está incompleto para operação real:

- Não há tela de listagem e manutenção de seguradoras no frontend
- O fluxo de emissão depende de um cadastro que não está acessível ao usuário
- `MANAGER` foi escolhido como perfil apto a gerenciar seguradoras, mas a modelagem atual de navegação e autorização ainda não foi ajustada para isso

Resultado: a operação pode ficar bloqueada ou depender de intervenção técnica/manual.

---

## Objetivo

Adicionar uma gestão mínima de seguradoras por tenant, suficiente para destravar proposta e emissão de apólice, com governança simples e boa ergonomia operacional.

---

## Não Objetivos

Esta entrega não deve incluir:

- integração com SUSEP
- importação em massa
- mapeamento de produtos por seguradora
- regras comerciais por seguradora
- contatos, endereços ou documentos da seguradora
- múltiplos tipos de cadastro além do essencial

O foco é YAGNI: resolver o bloqueio operacional com o menor domínio viável que já conversa com a arquitetura existente.

---

## Opções Avaliadas

### Opção 1: Constante fixa no backend

**Prós**

- implementação muito rápida
- sem trabalho de UI inicial

**Contras**

- péssima manutenibilidade
- não respeita bem o contexto multi-tenant
- exige deploy para qualquer ajuste
- não suporta ativação/inativação
- cria dívida sobre um domínio que já existe no sistema

**Decisão:** rejeitada como solução principal.

### Opção 2: Gestão apenas em Configurações

**Prós**

- simples de descobrir do ponto de vista administrativo
- reaproveita área existente

**Contras**

- inadequada para o uso operacional frequente
- conflita com a decisão de permitir `MANAGER`
- hoje `Settings` está voltado a perfis mais administrativos
- aumenta atrito quando a necessidade surge dentro da proposta/emissão

**Decisão:** rejeitada como ponto único de entrada.

### Opção 3: Tela própria de Seguradoras + atalho no fluxo

**Prós**

- resolve o bloqueio operacional onde ele acontece
- mantém um espaço claro de gestão contínua
- encaixa no padrão do produto de página para gestão e `Sheet` para formulário simples
- permite evoluir depois sem retrabalho estrutural

**Contras**

- exige pequenos ajustes de navegação, permissão e UX de emissão

**Decisão:** escolhida.

---

## Decisão Final

Criar uma feature de **gestão mínima de seguradoras** com dois pontos de acesso:

1. uma página própria de listagem e manutenção
2. um atalho de cadastro dentro dos fluxos onde a seguradora é necessária

Isso preserva governança sem sacrificar fluidez operacional.

---

## Modelo de Produto

`Insurer` continua sendo um cadastro simples por `organizationId`, com os campos:

- `name` obrigatório
- `code` opcional
- `active` para controlar disponibilidade operacional

No curto prazo, isso já atende proposta, emissão de apólice, sinistro e demais fluxos que referenciem seguradora.

---

## Navegação

### Decisão

Adicionar `Seguradoras` como item próprio na navegação principal do dashboard, e não dentro de `Configurações`.

### Justificativa

- é um cadastro operacional, não apenas administrativo
- precisa ser acessível a `MANAGER`
- evita esconder uma dependência crítica de proposta/apólice
- o produto ainda não tem volume suficiente para justificar um agrupador `Cadastros` só para um item

### Evolução futura

Se surgirem outros cadastros mestres relevantes, pode-se criar no futuro um agrupamento `Cadastros` contendo `Seguradoras`, `Ramos`, `Produtos` etc. Isso não é necessário agora.

---

## UX da Página de Seguradoras

### Estrutura

Página tipo DataTable, alinhada ao padrão definido em `docs/UI-PATTERNS.md`.

Elementos:

- campo de busca por nome/código
- filtro rápido `Ativas`, `Inativas`, `Todas`
- botão primário `Nova seguradora`
- tabela com colunas `Nome`, `Código`, `Status`, `Atualizado em`
- linha clicável
- menu de ações por linha

### Ações mínimas

- criar seguradora
- editar nome/código
- ativar/inativar

Excluir não entra no MVP para evitar efeitos colaterais com propostas, apólices e sinistros históricos. O controle operacional será por inativação.

### Estados

- `loading`: skeleton de tabela
- `empty`: mensagem contextual + CTA `Cadastrar primeira seguradora`
- `empty search`: mensagem específica de nenhum resultado encontrado
- `error`: card com retry

---

## UX do Formulário

### Componente

Usar `Sheet`, não página dedicada nem modal central.

### Campos

- `Nome da seguradora` obrigatório
- `Código` opcional
- `Ativa` apenas na edição

### Regras

- validação inline
- duplicidade por nome tratada com mensagem clara
- ao salvar com sucesso, fechar `Sheet`, atualizar listagem e exibir feedback discreto

---

## UX no Fluxo de Emissão e Proposta

### Decisão

Adicionar atalho para cadastro de seguradora no ponto de uso, além da tela própria.

### Comportamento esperado

Na emissão de apólice:

- se não houver seguradoras ativas, mostrar estado vazio no campo com CTA `Cadastrar seguradora`
- se houver seguradoras, manter seletor normal com ação secundária `Nova seguradora`
- após cadastro concluído no fluxo, a seguradora recém-criada deve voltar selecionada automaticamente

### Razão

O usuário não deve ser forçado a abandonar o fluxo para resolver uma dependência previsível do cadastro mestre.

### Escopo relacionado

O mesmo padrão pode ser reaplicado depois em proposta e sinistro, mas a primeira prioridade é emissão de apólice. A spec prevê essa consistência, sem exigir implementação completa em todos os fluxos neste primeiro passo.

---

## Permissões

### Regra aprovada

Podem gerenciar seguradoras:

- `OWNER`
- `ADMIN`
- `MANAGER`

Perfis sem gestão:

- `COMMERCIAL`
- `VIEWER`

### Implicações

Será necessário ajustar:

- permissão de frontend para exibir navegação e ações
- autorização de backend para criação, edição e ativação/inativação

### Diretriz

Modelar seguradora como permissão explícita do domínio, em vez de depender indiretamente de `settings:*` ou de permissões amplas como `manage all`.

---

## Backend

### O que já existe

- modelagem Prisma de `Insurer`
- endpoint de criação
- endpoint de listagem

### O que falta para a feature mínima ficar coesa

- endpoint de atualização
- suporte a ativação/inativação
- autorização compatível com `OWNER/ADMIN/MANAGER`
- mensagens de erro claras para nome duplicado e recurso inexistente

### Observação

Não há necessidade de reinventar o domínio ou substituir a entidade atual. A solução deve evoluir o que já existe.

---

## Frontend

### O que falta

- rota/página de seguradoras
- hooks de listagem e mutação para create/update
- `Sheet` de formulário
- ação contextual nos fluxos que dependem de seguradora
- ajuste da navegação lateral

### Diretriz de interface

Seguir o visual atual do produto:

- hierarquia sóbria
- sem floreios visuais
- foco em clareza e velocidade operacional

O objetivo não é “embelezar” o cadastro; é torná-lo rápido, previsível e fácil de encontrar.

---

## Migração e Rollout

### Estratégia

Entrega sem migração de dados complexa.

Como o domínio já existe:

- tenants com seguradoras existentes passam a enxergar e gerenciar seus cadastros
- tenants sem dados passam a usar a tela e o atalho no fluxo

### Seed

Pode existir seed opcional de seguradoras mais comuns no onboarding no futuro, mas isso é complementar. A fonte de verdade continuará sendo o cadastro por tenant, não constantes hardcoded.

---

## Critérios de Sucesso

Após a entrega:

1. um `MANAGER` consegue cadastrar seguradora sem depender de `OWNER`
2. a emissão de apólice não fica bloqueada por ausência de ponto de cadastro
3. seguradoras inativas deixam de aparecer para seleção operacional
4. o produto passa a ter um lugar único e previsível para manutenção desse cadastro

---

## Riscos e Mitigações

### Risco 1: Ambiguidade entre “cadastro operacional” e “configuração”

**Mitigação:** posicionar `Seguradoras` como item próprio de navegação.

### Risco 2: Permissão inconsistente entre frontend e backend

**Mitigação:** introduzir subject/permissão explícita para seguradora e alinhar os dois lados na mesma regra.

### Risco 3: Usuário perder contexto ao precisar cadastrar no meio da emissão

**Mitigação:** incluir atalho contextual e retorno automático com item selecionado.

---

## Resumo Executivo

O sistema não precisa de uma constante no backend para seguradoras. Ele já possui o domínio correto e deve completar a experiência com uma feature mínima de gestão.

A solução recomendada é:

- página própria `Seguradoras`
- formulário em `Sheet`
- criar/editar/ativar/inativar
- acesso para `OWNER`, `ADMIN` e `MANAGER`
- atalho de cadastro dentro da emissão de apólice

Isso resolve o problema com baixo risco, baixo desperdício e boa aderência à arquitetura atual.
