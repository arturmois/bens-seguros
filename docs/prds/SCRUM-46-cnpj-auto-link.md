# PRD: Vínculo Automático de CNPJ para Empresa/Condomínio

**Jira:** SCRUM-46 | **Prioridade:** Highest | **Status:** Backlog
**Tipo:** Feature / Melhoria

---

## Resumo

Vincular automaticamente CNPJ e nome do cliente quando se tratar de empresa ou condomínio, aproveitando dados já cadastrados no sistema.

## Problema

Após cadastro do cliente PJ/condomínio, os dados (CNPJ, razão social) precisam ser redigitados em outras etapas (criação de proposta, objeto segurado), gerando retrabalho e risco de inconsistência.

## Comportamento Atual

O campo CNPJ é incluído corretamente no cadastro do cliente, mas em outras telas (criação de proposta, detalhes do objeto segurado) os dados precisam ser preenchidos novamente.

## Comportamento Esperado

1. No cadastro do cliente PJ ou condomínio, o sistema armazena CNPJ e razão social/nome
2. Em qualquer tela que exija essas informações para o mesmo cliente, o sistema busca automaticamente os dados cadastrados
3. Campos correspondentes (CNPJ, razão social) devem vir **pré-preenchidos e bloqueados** para edição
4. Alteração permitida apenas com permissão específica
5. O usuário não precisa digitar novamente os dados

## Critérios de Aceite

- [ ] Na criação de proposta para cliente PJ, CNPJ e razão social vêm pré-preenchidos do cadastro
- [ ] Nos campos de objeto segurado (ramo Empresarial, Condomínio), CNPJ e nome vêm do cliente
- [ ] Campos pré-preenchidos são read-only por padrão
- [ ] Dados consistentes entre cadastro do cliente e demais telas
- [ ] Funciona para tipos: Empresa e Condomínio

## Notas Técnicas

- O modelo `Client` já possui `document` (CPF/CNPJ) e `name` — propagá-los para formulários de proposta/objeto segurado
- Na criação de proposta, o `clientId` já é selecionado — usar esse vínculo para preencher campos automaticamente
- Verificar formulários em `features/proposals/components/` e `insured-object-section.tsx`
