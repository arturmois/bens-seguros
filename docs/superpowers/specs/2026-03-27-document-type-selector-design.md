# SCRUM-36: Seletor de Tipo de Documento no Upload

## Contexto

Na tela de Proposta > Cotacao > Auto > Novo Seguro, ao fazer upload de documentos, o sistema salva automaticamente como "Outros" sem dar opcao de escolha do tipo. CNH e CRLV sao documentos obrigatorios para seguro auto e precisam ser classificados corretamente para analise pela seguradora.

## Estado Atual

A infraestrutura ja existe quase completa:

- **Prisma schema:** enum `DocumentType` com `DRIVER_LICENSE`, `VEHICLE_REGISTRATION`, `OTHER` e mais 5 tipos
- **Backend:** endpoint `POST /api/v1/documents/upload` ja aceita parametro `type` opcional
- **Frontend:** componentes `DocumentUpload`, `DocumentList`, `DocumentTypeBadge` existem
- **Checklist AUTO:** `checklist-config.ts` ja referencia `driver_license` e `vehicle_registration`

**O gap:** o componente `DocumentUpload` nao exibe seletor de tipo — envia direto com tipo `OTHER` (default).

## Decisoes de Design

### 1. Seletor inline apos selecao do arquivo

Apos o usuario selecionar/arrastar um arquivo, um card inline aparece abaixo da zona de drop contendo:

- Preview do arquivo (nome, tipo MIME, tamanho)
- Select obrigatorio de tipo de documento
- Botoes Cancelar e Enviar

O upload so dispara apos o usuario selecionar o tipo e clicar "Enviar". Isso segue o principio de progressive disclosure — o campo de tipo so aparece quando relevante.

**Alternativas descartadas:**

- Select antes do upload: passo extra desnecessario, confuso com drag-and-drop
- Modal apos selecao: intrusivo, mais codigo, quebra contexto visual

### 2. Tipos filtrados por ramo de seguro

O select exibe apenas tipos relevantes ao ramo da proposta. Todos os ramos incluem "Outro" como fallback.

| Ramo        | Tipos disponiveis                                                               |
| ----------- | ------------------------------------------------------------------------------- |
| Auto        | CNH (`DRIVER_LICENSE`), CRLV (`VEHICLE_REGISTRATION`), Outro (`OTHER`)          |
| Vida        | Declaracao de Saude (`HEALTH_DECLARATION`), Outro (`OTHER`)                     |
| Residencial | Comprovante de Endereco (`PROOF_OF_ADDRESS`), Outro (`OTHER`)                   |
| Empresarial | Contrato Social (`SOCIAL_CONTRACT`), Cartao CNPJ (`CNPJ_CARD`), Outro (`OTHER`) |

### 3. Sem edicao de tipo apos upload

Se o usuario classificou errado, deleta e reenvia. Evita complexidade de endpoint extra, permissoes e historico de alteracoes. O botao de delete ja existe.

## Alteracoes Necessarias

### Schema (Prisma)

Adicionar ao enum `DocumentType`:

- `HEALTH_DECLARATION`
- `PROOF_OF_ADDRESS`
- `SOCIAL_CONTRACT`
- `CNPJ_CARD`

### Frontend

**`document-upload.tsx`** — refatorar para:

1. Interceptar selecao de arquivo (nao enviar imediatamente)
2. Exibir card inline com preview + select de tipo
3. Receber prop `branch` (ramo) para filtrar tipos disponiveis
4. So disparar upload apos confirmacao com tipo selecionado

**Novo arquivo `document-type-options.ts`** — mapeamento ramo → tipos disponiveis com labels pt-BR.

**`proposal-detail.tsx`** — passar prop `branch` para `DocumentUpload`.

### Backend

Nenhuma alteracao necessaria. O endpoint ja aceita `type` como parametro opcional. Tornar obrigatorio e uma opcao, mas manter opcional preserva compatibilidade com outros fluxos que nao tem seletor.

### Checklist config

Nenhuma alteracao. Ja referencia os tipos corretos.

## Criterios de Aceite

- [ ] Usuario ve seletor de tipo ao anexar documento na proposta
- [ ] Tipos filtrados pelo ramo da proposta (Auto mostra CNH/CRLV/Outro)
- [ ] Upload so ocorre apos selecionar tipo e confirmar
- [ ] Documento salvo com tipo correto no banco
- [ ] Lista de documentos exibe badge com tipo de cada documento
- [ ] Botao cancelar remove arquivo selecionado e volta ao estado inicial
- [ ] Funciona para todos os ramos: Auto, Vida, Residencial, Empresarial
- [ ] Novos enum values no Prisma: HEALTH_DECLARATION, PROOF_OF_ADDRESS, SOCIAL_CONTRACT, CNPJ_CARD
