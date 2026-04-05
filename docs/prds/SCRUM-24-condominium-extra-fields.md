# PRD: Campos Adicionais para Ramo Condomínio

**Jira:** SCRUM-24 | **Prioridade:** Highest | **Status:** Backlog
**Tipo:** Feature / Melhoria

---

## Resumo

Ampliar o cadastro de itens do Ramo Condomínio com campos adicionais para detalhar características estruturais e de segurança.

## Problema

As informações coletadas atualmente são insuficientes para uma análise de risco completa. Apenas dados básicos (CEP, endereço, nome do condomínio, quantidade de apartamentos) são capturados.

## Comportamento Atual

O formulário de objeto segurado para ramo Condomínio coleta apenas:

- CEP
- Endereço completo
- Nome do condomínio
- Quantidade de apartamentos

## Comportamento Esperado

Incluir no bloco "Características do Condomínio" os seguintes campos:

| Campo                             | Tipo                       | Obrigatório |
| --------------------------------- | -------------------------- | ----------- |
| Quantidade de blocos              | Número inteiro             | Não         |
| Quantidade de elevadores          | Número inteiro             | Não         |
| Quantidade de pavimentos          | Número inteiro             | Não         |
| Quantidade de apartamentos        | Número inteiro (existente) | Sim         |
| Número de funcionários            | Número inteiro             | Não         |
| Possui equipamentos de segurança? | Sim/Não + detalhamento     | Não         |
| Possui equipamentos de incêndio?  | Sim/Não + detalhamento     | Não         |

### Regras

1. Campos adicionais são opcionais para não bloquear o fluxo
2. Dados salvos corretamente no objeto segurado
3. Integrados ao processo de cotação e emissão
4. Exibidos em consultas futuras, relatórios e revisões
5. Seguir o padrão visual existente do formulário de objeto segurado

## Critérios de Aceite

- [ ] Novos campos visíveis no formulário de objeto segurado (ramo Condomínio)
- [ ] Dados salvos e recuperados corretamente
- [ ] Campos opcionais não bloqueiam o fluxo
- [ ] Campos de segurança/incêndio com toggle Sim/Não e campo de detalhamento condicional
- [ ] PDF da proposta inclui os novos campos quando preenchidos
- [ ] Testes unitários para validação dos novos campos

## Notas Técnicas

- Atualizar interface `CondominiumDetails` em `features/proposals/lib/constants.ts`:
  - Adicionar: `blockCount`, `elevatorCount`, `floorCount`, `employeeCount`, `hasSecurityEquipment`, `securityEquipmentDetails`, `hasFireEquipment`, `fireEquipmentDetails`
- Atualizar schema Zod de `insuredObjectDetails` em `apps/server/src/routes/v1/proposals/_schemas.ts`
- Atualizar formulário em `insured-object-section.tsx` para incluir os novos campos
- Regenerar Orval após mudanças na API
- O campo `floorCount` já existe como `floorCount` na interface — verificar se está sendo usado
