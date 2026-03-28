# Termos de Uso e Política de Privacidade — Design Spec

**Data:** 2026-03-28
**Status:** Draft

---

## 1. Objetivo

Criar páginas de Termos de Uso e Política de Privacidade para o Bens Seguros, com texto jurídico completo em pt-BR, compliance LGPD, versionamento com re-aceite obrigatório, e checkbox de consentimento no registro.

## 2. Decisões de Design

| Decisão                   | Escolha                            | Motivo                                                                                    |
| ------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------- |
| Nível de detalhe          | Completo e profissional            | Texto jurídico real, pronto para revisão por advogado                                     |
| Modelo LGPD               | Controlador/Operador compartilhado | Bens Seguros = controlador (dados de conta) + operador (dados de clientes das corretoras) |
| Consentimento no registro | Checkbox + timestamp + versão      | Prova de consentimento auditável para LGPD                                                |
| Versionamento             | Com re-aceite obrigatório          | Modal bloqueante quando versão muda, histórico completo                                   |
| Layout visual             | Sidebar com TOC sticky             | Melhor navegabilidade para textos longos, padrão SaaS moderno                             |
| Dados da empresa          | Placeholders `[INSERIR]`           | CNPJ, razão social, endereço, DPO — preencher antes de publicar                           |

## 3. Rotas e Estrutura de Arquivos

### Rotas públicas (dentro de `(marketing)`)

- `/termos-de-uso` — Termos de Uso
- `/politica-de-privacidade` — Política de Privacidade

### Arquivos

```
apps/web/src/app/(marketing)/termos-de-uso/page.tsx
apps/web/src/app/(marketing)/politica-de-privacidade/page.tsx
apps/web/src/features/legal/components/legal-page-layout.tsx
apps/web/src/features/legal/data/terms-of-use.ts
apps/web/src/features/legal/data/privacy-policy.ts
apps/web/src/features/legal/types.ts
```

### Componente `LegalPageLayout`

- Recebe título, versão, data de atualização e array de seções
- Gera TOC automaticamente a partir das seções
- Sidebar sticky com scroll spy (destaca seção ativa)
- Mobile: TOC vira dropdown fixo no topo
- Reutiliza `MarketingNav` + `MarketingFooter` do layout `(marketing)`

### Tipo de dados das seções

```typescript
interface LegalSection {
  id: string // anchor slug, ex: "aceitacao-dos-termos"
  title: string // ex: "1. Aceitação dos Termos"
  content: string // texto em markdown ou HTML sanitizado
}

interface LegalDocument {
  title: string // "Termos de Uso" | "Política de Privacidade"
  version: string // "1.0"
  updatedAt: string // "2026-03-28"
  sections: LegalSection[]
}
```

Conteúdo como dados estruturados em arquivos `.ts`, não hardcoded no JSX. Facilita versionamento e futuras traduções.

## 4. Conteúdo — Termos de Uso

Texto jurídico completo em pt-BR, versão 1.0. Seções:

### 4.1. Aceitação dos Termos

Ao criar uma conta ou utilizar o Bens Seguros, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso. O uso continuado da plataforma após alterações constitui aceitação dos termos revisados.

### 4.2. Descrição do Serviço

O Bens Seguros é uma plataforma SaaS (Software as a Service) de gestão para corretoras de seguros, oferecendo funcionalidades de: gestão de propostas e apólices, controle de comissões, cadastro de clientes, atendimento multicanal (WhatsApp, chat web, Messenger, Instagram), gestão de documentos, relatórios e dashboard analítico, assistência com inteligência artificial.

### 4.3. Cadastro e Conta

- O usuário deve fornecer informações verdadeiras, atualizadas e completas.
- Cada organização (corretora) é identificada por CNPJ único.
- O usuário é responsável pela confidencialidade de suas credenciais de acesso.
- É proibido compartilhar credenciais ou permitir acesso de terceiros não autorizados.
- O Bens Seguros pode suspender contas com informações falsas ou incompletas.

### 4.4. Planos e Pagamento

- A plataforma oferece planos gratuitos e pagos com diferentes limites de funcionalidades.
- A cobrança dos planos pagos é recorrente (mensal ou anual), conforme o plano contratado.
- Reajustes de preço serão comunicados com antecedência mínima de 30 (trinta) dias.
- O não pagamento após o vencimento poderá resultar em suspensão do acesso às funcionalidades do plano contratado.
- Não há reembolso proporcional em caso de cancelamento antes do fim do período contratado, salvo disposição legal em contrário.

### 4.5. Obrigações do Usuário

O usuário compromete-se a:

- Utilizar a plataforma exclusivamente para fins lícitos e relacionados à atividade de corretagem de seguros.
- Não realizar engenharia reversa, descompilação ou tentativa de acesso ao código-fonte.
- Não utilizar ferramentas automatizadas (bots, scrapers) sem autorização prévia.
- Respeitar os limites de uso do plano contratado.
- Manter seus dados cadastrais atualizados.
- Cumprir a legislação vigente, incluindo a LGPD, no tratamento de dados pessoais de seus clientes.

### 4.6. Obrigações da Plataforma

O Bens Seguros compromete-se a:

- Disponibilizar a plataforma de forma contínua, ressalvadas manutenções programadas e eventos de força maior.
- Realizar backups periódicos dos dados armazenados.
- Implementar medidas de segurança compatíveis com o estado da técnica para proteção dos dados.
- Oferecer suporte técnico nos canais disponibilizados.
- Comunicar incidentes de segurança que possam afetar dados pessoais, conforme exigido pela LGPD.
- A plataforma não garante disponibilidade ininterrupta (SLA formal não está incluído nos termos gerais).

### 4.7. Propriedade Intelectual

- A plataforma Bens Seguros, incluindo seu código-fonte, design, marcas, logotipos e documentação, é propriedade exclusiva de [INSERIR RAZÃO SOCIAL].
- Os dados inseridos pelo usuário e por sua organização permanecem de propriedade do usuário/organização.
- O usuário concede ao Bens Seguros uma licença limitada, não exclusiva e revogável para processar seus dados exclusivamente para a prestação do serviço.
- É vedada a reprodução, distribuição ou criação de obras derivadas da plataforma sem autorização prévia por escrito.

### 4.8. Dados e Privacidade

O tratamento de dados pessoais realizado pelo Bens Seguros é regido pela Política de Privacidade, disponível em [/politica-de-privacidade](/politica-de-privacidade), que é parte integrante destes Termos de Uso. Ao aceitar estes Termos, o usuário declara ter lido e concordado também com a Política de Privacidade.

### 4.9. Limitação de Responsabilidade

- O Bens Seguros não garante resultados específicos decorrentes do uso da plataforma.
- A responsabilidade do Bens Seguros por danos diretos está limitada ao valor total pago pelo usuário nos últimos 12 (doze) meses.
- O Bens Seguros não será responsável por danos indiretos, incidentais, consequenciais, lucros cessantes ou perda de dados, exceto nos casos previstos em lei.
- O Bens Seguros não se responsabiliza por decisões de negócio tomadas pelo usuário com base em informações da plataforma, incluindo sugestões geradas por inteligência artificial.

### 4.10. Suspensão e Rescisão

- O Bens Seguros poderá suspender ou encerrar a conta do usuário em caso de violação destes Termos, sem prejuízo de outras medidas cabíveis.
- O usuário pode cancelar sua conta a qualquer momento através das configurações da plataforma.
- Após o cancelamento, os dados do usuário permanecerão acessíveis para exportação por 30 (trinta) dias, após os quais serão eliminados conforme a Política de Privacidade.
- Dados sujeitos a obrigação legal de retenção (fiscal, regulatória) serão mantidos pelo prazo exigido por lei, mesmo após o cancelamento.

### 4.11. Alterações nos Termos

- O Bens Seguros pode alterar estes Termos a qualquer momento.
- Alterações materiais serão comunicadas por email e por banner na plataforma com antecedência mínima de 15 (quinze) dias.
- Alterações materiais exigirão re-aceite explícito do usuário para continuar utilizando a plataforma.
- O histórico de versões estará disponível para consulta.

### 4.12. Disposições Gerais

- Estes Termos são regidos pelas leis da República Federativa do Brasil.
- Fica eleito o foro da comarca de [INSERIR CIDADE/UF] para dirimir quaisquer controvérsias, com exclusão de qualquer outro, por mais privilegiado que seja.
- A invalidade ou nulidade de qualquer cláusula não compromete as demais disposições destes Termos.
- A tolerância de qualquer das partes quanto ao descumprimento de qualquer cláusula não constituirá renúncia ao direito de exigi-la.

### 4.13. Contato

Para dúvidas sobre estes Termos de Uso:

- Email: [INSERIR EMAIL]
- Endereço: [INSERIR ENDEREÇO COMPLETO]

## 5. Conteúdo — Política de Privacidade

Texto jurídico completo em pt-BR, versão 1.0, conforme LGPD (Lei 13.709/2018).

### 5.1. Introdução e Compromisso

O Bens Seguros, operado por [INSERIR RAZÃO SOCIAL], inscrita no CNPJ sob o nº [INSERIR CNPJ], com sede em [INSERIR ENDEREÇO], está comprometida com a proteção dos dados pessoais de seus usuários e dos clientes das corretoras que utilizam a plataforma. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos, compartilhamos e protegemos dados pessoais, em conformidade com a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 — LGPD).

### 5.2. Definições

Conforme a LGPD (Art. 5º), para fins desta Política:

- **Dados Pessoais:** informação relacionada a pessoa natural identificada ou identificável.
- **Dados Pessoais Sensíveis:** dados sobre origem racial/étnica, convicção religiosa, opinião política, saúde, vida sexual, dado genético ou biométrico.
- **Titular:** pessoa natural a quem se referem os dados pessoais.
- **Controlador:** pessoa natural ou jurídica a quem competem as decisões sobre o tratamento de dados pessoais.
- **Operador:** pessoa natural ou jurídica que realiza o tratamento de dados pessoais em nome do controlador.
- **ANPD:** Autoridade Nacional de Proteção de Dados, órgão responsável por fiscalizar o cumprimento da LGPD.
- **Tratamento:** toda operação realizada com dados pessoais (coleta, armazenamento, uso, compartilhamento, eliminação, etc.).

### 5.3. Dados que Coletamos

| Categoria                | Dados                                                                      | Origem                                  |
| ------------------------ | -------------------------------------------------------------------------- | --------------------------------------- |
| Cadastrais               | Nome, email, telefone, senha (hash)                                        | Fornecidos pelo usuário no registro     |
| Empresariais             | Razão social, CNPJ, endereço da corretora                                  | Fornecidos no onboarding da organização |
| De uso                   | Endereço IP, navegador, dispositivo, páginas visitadas, horários de acesso | Coletados automaticamente               |
| De clientes da corretora | CPF, nome, telefone, dados de apólices, sinistros                          | Inseridos pela corretora na plataforma  |
| Financeiros              | Dados de pagamento (processados por terceiros)                             | Fornecidos pelo usuário                 |
| De comunicação           | Mensagens de chat, WhatsApp, email                                         | Gerados durante uso da plataforma       |

### 5.4. Bases Legais (LGPD Art. 7º)

| Base Legal                            | Aplicação                                                                           |
| ------------------------------------- | ----------------------------------------------------------------------------------- |
| **Consentimento** (Art. 7º, I)        | Registro na plataforma, aceite de termos, comunicações de marketing                 |
| **Execução de contrato** (Art. 7º, V) | Prestação do serviço SaaS, processamento de pagamentos                              |
| **Obrigação legal** (Art. 7º, II)     | Retenção de dados fiscais por 5 anos (legislação tributária brasileira)             |
| **Legítimo interesse** (Art. 7º, IX)  | Analytics de uso, melhoria do produto, prevenção de fraude, segurança da plataforma |

### 5.5. Finalidade do Tratamento

| Dado                           | Finalidade                                  | Base Legal                      |
| ------------------------------ | ------------------------------------------- | ------------------------------- |
| Nome, email                    | Identificação, autenticação, comunicação    | Execução de contrato            |
| CNPJ, razão social             | Identificação da organização, multi-tenancy | Execução de contrato            |
| IP, navegador, dispositivo     | Segurança, prevenção de fraude, auditoria   | Legítimo interesse              |
| Dados de clientes da corretora | Gestão de seguros pelo usuário (corretora)  | Execução de contrato (operador) |
| Dados de pagamento             | Cobrança dos planos contratados             | Execução de contrato            |
| Mensagens de chat              | Atendimento ao cliente da corretora         | Execução de contrato (operador) |
| Dados de uso (analytics)       | Melhoria do produto e experiência           | Legítimo interesse              |

### 5.6. Modelo Controlador/Operador

**Bens Seguros como Controlador:**

- Dados de conta dos usuários (nome, email, senha, dados de uso)
- Dados de pagamento e faturamento
- Decisões sobre como esses dados são tratados

**Bens Seguros como Operador:**

- Dados de clientes das corretoras (CPF, apólices, sinistros, mensagens)
- Tratamento realizado exclusivamente conforme instruções da corretora (controladora)
- A corretora é responsável por obter consentimento ou base legal adequada de seus clientes

**Responsabilidades:**

- Como controlador: responde diretamente perante os titulares e a ANPD
- Como operador: responde conforme instruções do controlador (corretora) e deve notificar incidentes

### 5.7. Compartilhamento de Dados

Compartilhamos dados pessoais apenas nas seguintes situações:

| Destinatário                         | Finalidade                        | Dados Compartilhados                  |
| ------------------------------------ | --------------------------------- | ------------------------------------- |
| Processadores de pagamento           | Cobrança de planos                | Dados de pagamento (tokenizados)      |
| Provedores de infraestrutura (cloud) | Hospedagem e armazenamento        | Todos (criptografados)                |
| Provedor de email transacional       | Envio de notificações             | Nome, email                           |
| Provedores de IA (Anthropic, OpenAI) | Assistência inteligente           | Dados anonimizados e com PII redatada |
| Autoridades competentes              | Ordem judicial ou obrigação legal | Conforme exigido                      |

**Nunca vendemos dados pessoais.** Nunca compartilhamos dados para fins publicitários de terceiros.

### 5.8. Transferência Internacional

Alguns de nossos provedores de infraestrutura e serviço podem estar localizados fora do Brasil. Nestes casos, asseguramos que a transferência internacional de dados pessoais ocorre com garantias adequadas, conforme previsto na LGPD (Art. 33), incluindo:

- Cláusulas contratuais padrão
- Provedores em países com nível adequado de proteção reconhecido pela ANPD
- Medidas técnicas de segurança (criptografia em repouso e em trânsito)

### 5.9. Segurança dos Dados

Implementamos medidas técnicas e organizacionais para proteger dados pessoais:

- **Criptografia em repouso:** AES-256-GCM para dados sensíveis (CPF, CNPJ) com hash SHA-256 para buscas
- **Criptografia em trânsito:** TLS 1.2+ em todas as conexões
- **Isolamento multi-tenant:** Row Level Security (RLS) no PostgreSQL, campo `tenantId` no MongoDB
- **Mascaramento de dados:** Dados sensíveis mascarados por padrão em listagens, exposição baseada em perfil de acesso
- **Controle de acesso:** RBAC com 5 níveis de permissão (Proprietário, Administrador, Gerente, Comercial, Visualizador)
- **Logs com redação:** Dados sensíveis automaticamente removidos de logs (CPF, CNPJ, email, telefone, senha, tokens)
- **Monitoramento de erros:** PII filtrada antes do envio para ferramentas de rastreamento
- **Cookies seguros:** httpOnly, secure, sameSite
- **Cabeçalhos de segurança:** Helmet (CSP, X-Frame-Options, etc.)
- **Rate limiting:** Proteção contra ataques de força bruta

### 5.10. Retenção e Eliminação

| Tipo de Dado                                   | Período de Retenção                       | Justificativa                                |
| ---------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| Dados de conta                                 | Enquanto conta ativa + 6 meses            | Execução de contrato + período de reativação |
| Dados fiscais (propostas, apólices, comissões) | 5 anos após encerramento                  | Obrigação legal (legislação tributária)      |
| Logs de acesso                                 | 6 meses                                   | Legítimo interesse (segurança)               |
| Dados de clientes da corretora                 | Enquanto conta ativa ou até exclusão LGPD | Execução de contrato (operador)              |
| Backups                                        | 30 dias (rotação)                         | Segurança e recuperação                      |

**Exclusão LGPD:** A plataforma oferece fluxo completo de exclusão de dados pessoais (anonimização em banco, exclusão de conversas, remoção de documentos, anonimização de logs de auditoria). Acessível em Configurações > Clientes > Exclusão LGPD. Requer confirmação forte (digitar nome do cliente). Restrito a perfis Proprietário e Administrador.

### 5.11. Direitos do Titular (LGPD Art. 18)

Você tem os seguintes direitos em relação aos seus dados pessoais:

- **Confirmação e acesso:** Saber se tratamos seus dados e obter uma cópia.
- **Correção:** Solicitar a correção de dados incompletos, inexatos ou desatualizados.
- **Anonimização, bloqueio ou eliminação:** De dados desnecessários, excessivos ou tratados em desconformidade com a LGPD.
- **Portabilidade:** Solicitar a transferência de seus dados a outro fornecedor de serviço.
- **Eliminação:** Dos dados tratados com base no consentimento, exceto quando houver obrigação legal de retenção.
- **Informação:** Sobre as entidades com as quais compartilhamos seus dados.
- **Revogação do consentimento:** A qualquer momento, sem prejuízo da licitude do tratamento realizado anteriormente.

**Como exercer seus direitos:** Envie solicitação para [INSERIR EMAIL DO DPO] ou utilize as funcionalidades disponíveis na plataforma (Configurações > Perfil > Meus Dados). Responderemos em até 15 (quinze) dias úteis, conforme previsto na LGPD.

### 5.12. Cookies e Tecnologias

| Cookie                      | Tipo      | Finalidade                   | Duração          |
| --------------------------- | --------- | ---------------------------- | ---------------- |
| Sessão de autenticação      | Essencial | Manter o usuário logado      | Sessão / 30 dias |
| CSRF token                  | Essencial | Proteção contra ataques CSRF | Sessão           |
| Preferências (tema, idioma) | Funcional | Personalização da interface  | 1 ano            |

Não utilizamos cookies de terceiros para publicidade ou rastreamento. Todos os cookies são configurados com flags `httpOnly`, `secure` e `sameSite` quando aplicável.

### 5.13. Uso de Inteligência Artificial

A plataforma utiliza inteligência artificial para:

- Sugestões e assistência na gestão de propostas e apólices
- Resumo e análise de documentos
- Assistência no atendimento ao cliente

**Proteções implementadas:**

- Dados pessoais identificáveis (PII) são automaticamente redatados antes do envio para provedores de IA
- Os prompts do sistema proíbem expressamente a solicitação de dados sensíveis
- Nenhuma decisão automatizada é tomada sem supervisão humana
- Os provedores de IA não utilizam os dados para treinamento de seus modelos (conforme contratos vigentes)

### 5.14. Dados de Menores

O Bens Seguros é uma plataforma destinada a empresas (B2B) e profissionais do mercado de seguros. Não coletamos intencionalmente dados pessoais de menores de 18 anos. Caso tomemos conhecimento de que dados de um menor foram coletados inadvertidamente, procederemos à sua eliminação imediata.

### 5.15. Alterações na Política

- Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças em nossas práticas ou na legislação.
- Alterações materiais serão comunicadas por email e por banner na plataforma com antecedência mínima de 15 (quinze) dias.
- Alterações materiais exigirão re-aceite explícito para continuar utilizando a plataforma.
- O histórico de versões anteriores estará disponível para consulta.

### 5.16. Encarregado de Dados (DPO)

O Encarregado de Proteção de Dados do Bens Seguros é:

- **Nome:** [INSERIR NOME DO DPO]
- **Email:** [INSERIR EMAIL DO DPO]
- **Endereço:** [INSERIR ENDEREÇO]

O Encarregado é o canal direto para exercício de direitos dos titulares e comunicação com a ANPD.

### 5.17. Contato e ANPD

Para dúvidas, sugestões ou reclamações sobre esta Política de Privacidade:

- **Email:** [INSERIR EMAIL]
- **Endereço:** [INSERIR ENDEREÇO COMPLETO]

Caso não fique satisfeito com nossa resposta, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD) através do site: https://www.gov.br/anpd

## 6. Consentimento no Registro

### Alteração no formulário de registro

Adicionar checkbox obrigatório abaixo do campo de confirmação de senha:

```
☐ Li e aceito os Termos de Uso e a Política de Privacidade
```

- Links "Termos de Uso" e "Política de Privacidade" abrem em nova aba (`target="_blank"`)
- Validação Zod: `acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'Você deve aceitar os termos para continuar' }) })`
- Bloqueia submit sem marcar

### Dados gravados ao registrar

No model `User` (campos desnormalizados para consulta rápida):

- `acceptedTermsAt: DateTime` — timestamp do aceite
- `termsVersion: String` — ex: `"1.0"`
- `privacyVersion: String` — ex: `"1.0"`

## 7. Versionamento e Re-aceite

### Constantes de versão

```typescript
// packages/core/src/constants/legal.ts
const CURRENT_TERMS_VERSION = '1.0'
const CURRENT_PRIVACY_VERSION = '1.0'
```

### Tabela de histórico de aceites

```prisma
model TermsAcceptance {
  id         String   @id @default(uuid())
  userId     String
  type       String   // "terms" | "privacy"
  version    String   // "1.0", "1.1"
  acceptedAt DateTime @default(now())
  ipAddress  String?
  user       User     @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([userId, type])
}
```

### Fluxo de re-aceite

1. Constantes `CURRENT_TERMS_VERSION` / `CURRENT_PRIVACY_VERSION` atualizadas no código
2. Layout autenticado (dashboard) compara `user.termsVersion` com `CURRENT_TERMS_VERSION`
3. Se versão diverge → **modal bloqueante** (sem dismiss):
   - Título: "Atualizamos nossos Termos"
   - Texto: "Atualizamos nossos Termos de Uso (v1.0 → v1.1). Por favor, revise e aceite para continuar."
   - Links para documentos completos
   - Botão: "Li e aceito as alterações"
4. Ao aceitar:
   - Atualiza `user.termsVersion` e `user.acceptedTermsAt`
   - Insere registro em `TermsAcceptance` com versão, timestamp e IP
5. Sem aceitar → não acessa nenhuma funcionalidade do app

### Campos adicionais no model User

```prisma
model User {
  // ... campos existentes
  acceptedTermsAt  DateTime?
  termsVersion     String?
  privacyVersion   String?
  termsAcceptances TermsAcceptance[]
}
```

## 8. Atualizações em Componentes Existentes

### Footer (`marketing-footer.tsx`)

```
{ label: 'Termos', href: '#' }        → { label: 'Termos', href: '/termos-de-uso' }
{ label: 'Privacidade', href: '#' }    → { label: 'Privacidade', href: '/politica-de-privacidade' }
```

### Formulário de registro (`register-form.tsx`)

- Adicionar campo `acceptedTerms` ao schema Zod
- Adicionar checkbox com links para os documentos
- Enviar `acceptedTerms: true` ao backend no registro

### Backend — rota de registro

- Gravar `acceptedTermsAt`, `termsVersion`, `privacyVersion` ao criar usuário
- Inserir registro em `TermsAcceptance`

### Layout autenticado

- Hook ou middleware que verifica versão dos termos aceitos vs. versão atual
- Renderiza modal de re-aceite quando necessário

## 9. Placeholders para Preencher

Antes de publicar, substituir todos os `[INSERIR]`:

| Placeholder              | Onde aparece                             |
| ------------------------ | ---------------------------------------- |
| `[INSERIR RAZÃO SOCIAL]` | Termos 4.7, Privacidade 5.1              |
| `[INSERIR CNPJ]`         | Privacidade 5.1                          |
| `[INSERIR ENDEREÇO]`     | Termos 4.13, Privacidade 5.1, 5.16, 5.17 |
| `[INSERIR CIDADE/UF]`    | Termos 4.12 (foro)                       |
| `[INSERIR EMAIL]`        | Termos 4.13, Privacidade 5.17            |
| `[INSERIR NOME DO DPO]`  | Privacidade 5.16                         |
| `[INSERIR EMAIL DO DPO]` | Privacidade 5.11, 5.16                   |
