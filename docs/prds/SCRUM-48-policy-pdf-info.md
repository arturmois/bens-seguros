# PRD: Informações Completas no PDF da Apólice

**Jira:** SCRUM-48 | **Prioridade:** Highest | **Status:** Backlog
**Tipo:** Feature / Melhoria

---

## Resumo

Ajustar o template de geração do PDF da apólice para exibir integralmente todos os dados cadastrados no sistema.

## Problema

O PDF gerado omite diversos campos já preenchidos pelo corretor. Isso obriga complementação manual, gera retrabalho, insegurança jurídica e pode levar à recusa de cobertura pela seguradora.

## Comportamento Atual

O PDF da apólice não inclui todos os campos cadastrados — dados do cliente, objeto segurado e seguradora aparecem incompletos ou ausentes.

## Comportamento Esperado

O PDF deve conter os seguintes blocos, usando apenas dados já existentes no banco:

### 1. Dados do Cliente

- Nome completo
- CPF/CNPJ (completo, sem asteriscos)
- Endereço
- Telefone
- E-mail

### 2. Dados da Apólice

- Número da apólice
- Status
- Ramo
- Seguradora (nome completo)
- Tipo (novo seguro, renovação, etc.)

### 3. Vigência

- Data de início
- Data de fim

### 4. Condições Comerciais / Valores

- Prêmio total

### 5. Objeto Segurado (por ramo)

**Automóvel:**

- Marca, modelo, ano fabricação, ano modelo
- Placa, cor, combustível
- Uso (ex: motorista de aplicativo)

**Residencial / Condomínio / Vida:**

- Campos básicos existentes conforme ramo

## Critérios de Aceite

- [ ] PDF exibe todos os campos preenchidos no cadastro
- [ ] Campos vazios mostram "Não informado" (não são omitidos)
- [ ] CPF/CNPJ exibido completo
- [ ] Seguradora com nome completo (nunca "—")
- [ ] Testado com pelo menos um exemplo de cada ramo (auto, residencial, vida)
- [ ] Layout com blocos organizados e legíveis

## Notas Técnicas

- Revisar query que alimenta o template do PDF para garantir todos os joins necessários
- Verificar se a biblioteca de PDF não trunca textos longos (endereço com complemento)
- O worker de geração de PDF está em `apps/worker` — PDF templates devem receber dados completos
