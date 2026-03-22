# Bens Seguros - Settings Page Design

> Design da tela de configuracoes. Baseado nas guidelines UI/UX Pro Max + padroes definidos em `UI-PATTERNS.md`.

---

## 1. Layout Geral

### Estrutura: Sidebar de Navegacao + Area de Conteudo

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Voltar    Configuracoes                                         │
├──────────────┬──────────────────────────────────────────────────────┤
│              │                                                      │
│  Navegacao   │  Area de Conteudo                                    │
│  (sidebar)   │                                                      │
│              │  ┌────────────────────────────────────────────────┐  │
│  ○ Meu Perfil│  │  Titulo da Secao                               │  │
│  ○ Organizacao│  │  Descricao curta do que esta secao faz         │  │
│  ○ Membros   │  │                                                │  │
│  ○ Seguranca │  │  [ Campos / Cards / Toggles ]                  │  │
│  ○ Canais    │  │                                                │  │
│  ○ Bot IA    │  │                                                │  │
│  ○ Notificacoes│  │                                              │  │
│  ○ Aparencia │  │                                        [Salvar]│  │
│              │  └────────────────────────────────────────────────┘  │
│              │                                                      │
├──────────────┴──────────────────────────────────────────────────────┤
```

### Responsividade

- **Desktop (>=1024px):** sidebar esquerda fixa (220px) + conteudo a direita
- **Mobile (<1024px):** sidebar vira menu superior com scroll horizontal (pills/chips navegaveis)
- Conteudo: max-width 680px (line-length-control: 60-75 chars)

### Navegacao Settings

- URL: `/settings/[section]` (deep linkable)
- Sidebar items com icone lucide + label
- Item ativo: fundo `primary-50`, borda esquerda `primary-500` (3px)
- Divisor visual entre grupos: "Conta" (perfil, seguranca) | "Organizacao" (org, membros) | "Canais" (whatsapp, bot) | "Preferencias" (notificacoes, aparencia)
- Visibilidade por role: itens de org/membros ocultos para COMMERCIAL/VIEWER

### Principios UX

- **Progressive disclosure:** mostrar apenas o necessario por secao
- **Autosave onde possivel:** toggles salvam instantaneamente (sem botao)
- **Formularios:** botao "Salvar" explicito apenas para campos de texto
- **Confirmacao:** acoes destrutivas com Dialog (remover membro, excluir canal)
- **Toast feedback:** "Configuracoes salvas" apos cada save

---

## 2. Meu Perfil (`/settings/profile`)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Meu Perfil                                                 │
│  Gerencie suas informacoes pessoais                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Avatar]  Artur Silva                               │    │
│  │   64px     artur@corretora.com.br                    │    │
│  │   circle   Role: ADMIN                               │    │
│  │            [Alterar foto]                             │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── Informacoes ──────────────────────────────────────────  │
│                                                             │
│  Nome completo          Email                               │
│  [Artur Silva_____]     [artur@corretora.com.br] (readonly)│
│                                                             │
│                                            [Salvar]         │
│                                                             │
│  ── Alterar Senha ────────────────────────────────────────  │
│                                                             │
│  Senha atual             Nova senha                         │
│  [••••••••____] 👁       [••••••••____] 👁                  │
│                                                             │
│  Confirmar nova senha                                       │
│  [••••••••____] 👁                                          │
│                          Min 8 caracteres                   │
│                                                             │
│                                       [Alterar senha]       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regras

- Email: read-only (nao editavel aqui, precisa de verificacao)
- Role: badge colorida, nao editavel (apenas OWNER pode alterar roles)
- Avatar: upload de imagem (max 2MB, crop circular), placeholder com iniciais
- Senha: botao show/hide por campo (`password-toggle` guideline)
- Validacao: nome min 2 chars, senha min 8 chars, confirmar senha deve coincidir
- Sections separadas: "Informacoes" e "Alterar Senha" sao forms independentes com botoes separados

---

## 3. Organizacao (`/settings/organization`)

> Visivel apenas para OWNER e ADMIN

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Organizacao                                                │
│  Dados da sua corretora                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [Logo]    Corretora ABC Seguros                     │    │
│  │   80px     corretora-abc                             │    │
│  │   rounded  [Alterar logo]                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  Nome da corretora       CNPJ                               │
│  [Corretora ABC____]     [12.345.678/0001-90] (readonly)   │
│                                                             │
│  Slug (URL)                                                 │
│  [corretora-abc____]                                        │
│  benseguros.com.br/corretora-abc                            │
│                                                             │
│                                            [Salvar]         │
│                                                             │
│  ── Zona de Perigo ──────────────────────────────── 🔴 ──  │
│                                                             │
│  Transferir propriedade                                     │
│  Transfira a propriedade para outro ADMIN.     [Transferir] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regras

- Logo: upload (max 2MB, PNG/JPG, exibido 80px rounded)
- CNPJ: read-only (definido no onboarding, nao editavel)
- Slug: editavel, validacao unique, preview de URL abaixo do campo
- "Zona de Perigo": card com borda `destructive-200`, fundo `destructive-50`, separada visualmente
- Transferir: botao `variant="outline"` destructive, abre Dialog com confirmacao forte (AUTH-6)
- Apenas OWNER ve "Zona de Perigo"

---

## 4. Membros (`/settings/members`)

> Visivel apenas para OWNER e ADMIN

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Membros                                                    │
│  Gerencie quem tem acesso a sua corretora                   │
│                                                             │
│  [🔍 Buscar membro...]                     [+ Convidar]    │
│                                                             │
│  ── Membros ativos (5) ──────────────────────────────────── │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  [AV] Artur Silva                                    │    │
│  │       artur@corretora.com.br                         │    │
│  │       ● Online                          OWNER  [...] │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  [JS] Joao Santos                                    │    │
│  │       joao@corretora.com.br                          │    │
│  │       ○ Offline · 2h atras              ADMIN  [...] │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  [MC] Maria Costa                                    │    │
│  │       maria@corretora.com.br                         │    │
│  │       ○ Offline · 1d atras         COMMERCIAL  [...] │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ── Convites pendentes (2) ──────────────────────────────── │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📧 pedro@email.com                                  │    │
│  │     Convidado em 15/03/2026  Expira em 22/03         │    │
│  │     Role: COMMERCIAL       [Reenviar] [Cancelar]     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown de Acoes (tres pontinhos) por Membro

| Acao         | Condicao                                                                  | Resultado                                    |
| ------------ | ------------------------------------------------------------------------- | -------------------------------------------- |
| Alterar role | OWNER pode alterar qualquer. ADMIN pode alterar MANAGER/COMMERCIAL/VIEWER | Select dropdown no Dialog                    |
| Desativar    | OWNER/ADMIN. Nao pode desativar a si mesmo                                | Confirma com Dialog, `member.active = false` |
| Remover      | OWNER apenas. Nao pode remover a si mesmo                                 | Dialog destructive com motivo                |

### Dialog "Convidar Membro"

```
┌──────────────────────────────────────┐
│  Convidar novo membro                │
│                                      │
│  Email *                             │
│  [________________@_________]        │
│                                      │
│  Role *                              │
│  [▾ Selecionar role          ]       │
│    ADMIN                             │
│    MANAGER                           │
│    COMMERCIAL                        │
│    VIEWER                            │
│                                      │
│           [Cancelar]  [Convidar]     │
└──────────────────────────────────────┘
```

### Regras

- Busca filtra por nome/email em tempo real (debounce 300ms)
- Lista separada: membros ativos + convites pendentes
- OWNER nao pode ser removido/desativado (botoes desabilitados)
- Nao pode convidar role superior a sua (AUTH-2)
- Convite pendente: botoes "Reenviar" (novo email) e "Cancelar" (invalida convite)
- Avatar: iniciais com cor gerada a partir do nome (hash → hue)

---

## 5. Seguranca (`/settings/security`)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Seguranca                                                  │
│  Gerencie suas sessoes ativas e seguranca da conta          │
│                                                             │
│  ── Sessoes ativas (3) ──────────────────────────────────── │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  🖥 Chrome · Windows                                 │    │
│  │     189.45.xx.xx                                     │    │
│  │     Ultimo acesso: agora          🟢 Esta sessao     │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  📱 Safari · iPhone                                  │    │
│  │     200.12.xx.xx                                     │    │
│  │     Ultimo acesso: ontem, 09:15        [Encerrar]    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  🖥 Firefox · Linux                                  │    │
│  │     177.88.xx.xx                                     │    │
│  │     Ultimo acesso: 3 dias atras        [Encerrar]    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│               [Encerrar todas exceto esta]                  │
│                                                             │
│  ── Historico de acesso ──────────────────────────────────  │
│                                                             │
│  Ultimo login: 20/03/2026 14:30 · Chrome · 189.45.xx.xx    │
│  Ultima troca de senha: 15/02/2026                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regras

- Sessao atual: badge "Esta sessao" (nao pode encerrar)
- IP mascarado parcial (ultimo octeto oculto: `189.45.xx.xx`)
- Device: parse User-Agent (browser + OS)
- "Encerrar todas exceto esta": confirma com Dialog
- Icones: `Monitor` (desktop), `Smartphone` (mobile), `Tablet` (tablet) do lucide
- Historico: apenas leitura, ultimas 5 entradas de login

---

## 6. Canais WhatsApp (`/settings/channels`)

> Visivel apenas para OWNER e ADMIN

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Canais WhatsApp                                            │
│  Conecte numeros de WhatsApp para atendimento               │
│                                                      [+ Novo canal]
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  📱 Vendas Principal                                 │    │
│  │     +55 11 99999-0001 · Baileys                      │    │
│  │     🟢 Conectado · Ultima msg: 5 min atras           │    │
│  │     AI Bot: ✓ Ativo                     [⚙] [...]    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  📱 Atendimento Maria                                │    │
│  │     +55 11 99999-0002 · Baileys                      │    │
│  │     🔴 Desconectado                     [Reconectar] │    │
│  │     AI Bot: ✗ Desativado                [⚙] [...]    │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  📱 Comercial                                        │    │
│  │     +55 11 88888-0000 · Meta API                     │    │
│  │     🟢 Ativo                                         │    │
│  │     AI Bot: ✓ Ativo                     [⚙] [...]    │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dialog "Novo Canal"

```
┌──────────────────────────────────────────┐
│  Adicionar canal WhatsApp                │
│                                          │
│  Nome do canal *                         │
│  [Vendas Principal_________]             │
│                                          │
│  Tipo *                                  │
│  ┌──────────────┐ ┌──────────────┐       │
│  │  📱 Baileys  │ │  📡 Meta API │       │
│  │  Gratis      │ │  Oficial     │       │
│  │  Via QR Code │ │  Via Token   │       │
│  └──────────────┘ └──────────────┘       │
│                                          │
│              [Cancelar]  [Criar]         │
└──────────────────────────────────────────┘
```

### Tela de Conexao Baileys (Sheet lateral)

```
┌─────────────────────────────────────────┐
│  Conectar WhatsApp                   ✕  │
│  Vendas Principal                       │
│                                         │
│  1. Abra o WhatsApp no celular          │
│  2. Va em Dispositivos conectados       │
│  3. Toque em Conectar dispositivo       │
│  4. Escaneie o QR code abaixo           │
│                                         │
│       ┌───────────────────┐             │
│       │                   │             │
│       │    [QR CODE]      │             │
│       │    240x240        │             │
│       │                   │             │
│       └───────────────────┘             │
│                                         │
│       Aguardando leitura...             │
│       ⟳ QR expira em 45s               │
│                                         │
│  Status: 🟡 Aguardando conexao          │
│                                         │
└─────────────────────────────────────────┘
```

### Configuracao Meta API (Sheet lateral)

```
┌─────────────────────────────────────────┐
│  Configurar Meta API                 ✕  │
│  Comercial                              │
│                                         │
│  Phone Number ID *                      │
│  [123456789012345_______]               │
│                                         │
│  Access Token *                         │
│  [EAABsbCS...] 👁      [Verificar]      │
│                                         │
│  Webhook Verify Token *                 │
│  [meu-token-secreto____]               │
│                                         │
│  Webhook URL (copiar)                   │
│  ┌──────────────────────────────────┐   │
│  │ https://api.bens.com/chat/      │📋 │
│  │ webhook/meta?channel=abc123     │   │
│  └──────────────────────────────────┘   │
│                                         │
│  Status: 🟢 Verificado                  │
│                                         │
│                        [Salvar]         │
└─────────────────────────────────────────┘
```

### Dropdown de Acoes por Canal

- **Configurar (engrenagem):** abre Sheet de configuracao
- **Reconectar (Baileys):** tenta reconexao via creds salvas
- **Desativar:** desliga canal (nao recebe/envia msgs)
- **Excluir:** Dialog destructive com confirmacao

### Regras

- Status em tempo real via Socket.IO (`channel:status`)
- QR code atualiza automaticamente (Baileys envia novo QR antes de expirar)
- Baileys: exibe countdown de expiracao do QR
- Meta: botao "Verificar" testa conexao com a API
- Webhook URL: gerada automaticamente, botao copiar

---

## 7. Bot IA (`/settings/ai`)

> Visivel apenas para OWNER e ADMIN

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Assistente IA                                              │
│  Configure o bot de atendimento automatico por canal        │
│                                                             │
│  ── Vendas Principal (Baileys) ───────────────── [On/Off] ─ │
│                                                             │
│  Provider                    Modelo                         │
│  [▾ Claude (Anthropic)]      [▾ claude-sonnet-4-20250514]  │
│                                                             │
│  System Prompt                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Voce e um assistente da Corretora ABC Seguros.      │    │
│  │ Responda de forma educada e profissional.           │    │
│  │ Nao peca dados pessoais (CPF, email).               │    │
│  │ Se o cliente quiser falar com atendente, transfira. │    │
│  │                                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│  240 / 2000 caracteres                                      │
│                                                             │
│  Configuracoes avancadas                              ▾     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Temperatura        [0.7_____] (0.0 - 1.0)         │    │
│  │  Max tokens         [300______] (100 - 1000)        │    │
│  │  Max respostas/conv [20_______]                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│                                            [Salvar]         │
│                                                             │
│  ── Atendimento Maria (Baileys) ──────────────── [Off] ──  │
│  Bot desativado neste canal.                                │
│                                                             │
│  ── Comercial (Meta) ─────────────────────────── [On/Off] ─ │
│  (mesmos campos...)                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regras

- Toggle On/Off por canal: salva instantaneamente (sem botao)
- Canal desativado: mostra apenas toggle + mensagem "Bot desativado"
- Provider: dropdown (Claude, OpenAI). Muda modelo disponivel
- System prompt: textarea com counter de caracteres (max 2000)
- Configuracoes avancadas: colapsavel por default (progressive disclosure)
- Helper text abaixo de cada campo (ex: "Temperatura: 0 = preciso, 1 = criativo")
- Preview: futuro, botao "Testar bot" abre mini-chat simulado

---

## 8. Notificacoes (`/settings/notifications`)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Notificacoes                                               │
│  Escolha como deseja ser notificado                         │
│                                                             │
│  ── Som ──────────────────────────────────────────────────  │
│                                                             │
│  Som de notificacao no chat                    [  ● On  ]   │
│  Tocar som ao receber mensagem em conversa                  │
│  nao focada.                                                │
│                                                             │
│  ── Email ────────────────────────────────────────────────  │
│                                                             │
│  Enviar para: artur@corretora.com.br                        │
│                                                             │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Sinistro aberto                        [  ● On ]│       │
│  │  Quando um novo sinistro e registrado            │       │
│  ├──────────────────────────────────────────────────┤       │
│  │  Comissao aprovada                      [  ● On ]│       │
│  │  Quando sua comissao e aprovada                  │       │
│  ├──────────────────────────────────────────────────┤       │
│  │  Comissao rejeitada                     [  ● On ]│       │
│  │  Quando sua comissao e rejeitada                 │       │
│  ├──────────────────────────────────────────────────┤       │
│  │  Apolice vencendo                       [  ● On ]│       │
│  │  30 dias antes do vencimento                     │       │
│  ├──────────────────────────────────────────────────┤       │
│  │  Convite aceito                         [ ○ Off ]│       │
│  │  Quando alguem aceita seu convite                │       │
│  ├──────────────────────────────────────────────────┤       │
│  │  Conversa aguardando                    [  ● On ]│       │
│  │  Quando conversa fica 5 min sem atendente        │       │
│  └──────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regras

- Todos os toggles salvam instantaneamente (autosave, sem botao)
- Toggle: `Switch` do shadcn/ui com label On/Off
- Descricao abaixo de cada toggle (helper text)
- Agrupar por categoria: Som, Email
- COMMERCIAL ve apenas notificacoes relevantes a ele (comissao, conversa)
- MANAGER/ADMIN ve todas as opcoes

---

## 9. Aparencia (`/settings/appearance`)

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Aparencia                                                  │
│  Personalize a interface                                    │
│                                                             │
│  ── Tema ─────────────────────────────────────────────────  │
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  ☀ Claro   │  │  🌙 Escuro │  │  💻 Sistema│            │
│  │            │  │            │  │            │            │
│  │ [preview   │  │ [preview   │  │ [preview   │            │
│  │  miniatura]│  │  miniatura]│  │  miniatura]│            │
│  │            │  │            │  │            │            │
│  │  ● Ativo   │  │  ○         │  │  ○         │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                             │
│  ── Densidade das tabelas ────────────────────────────────  │
│                                                             │
│  ┌──────────┐  ┌──────────┐                                 │
│  │ Compacto │  │ Padrao   │                                 │
│  │ ○        │  │ ● Ativo  │                                 │
│  └──────────┘  └──────────┘                                 │
│                                                             │
│  Preview:                                                   │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Nome           Status        Valor             │        │
│  │  Joao Silva     ● Ativo       R$ 1.200,00       │        │
│  │  Maria Costa    ○ Lead        R$ 850,00          │        │
│  │  Pedro Santos   ● Ativo       R$ 2.100,00        │        │
│  └─────────────────────────────────────────────────┘        │
│                                                             │
│  ── Sidebar ──────────────────────────────────────────────  │
│                                                             │
│  Sidebar colapsada por padrao                  [ ○ Off ]    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Regras

- Tema: 3 opcoes como cards clicaveis com miniatura preview
- Troca de tema: instantanea (next-themes), sem botao salvar
- Densidade: 2 opcoes como cards clicaveis com preview da tabela embaixo
- Preview da tabela: muda em tempo real ao trocar densidade
- Sidebar: toggle simples
- Tudo salvo em Zustand + localStorage (persiste entre sessoes)

---

## 10. Navegacao do Settings (Sidebar Items)

### Estrutura por Grupo

```
CONTA
  👤 Meu Perfil          /settings/profile        (todos)
  🔒 Seguranca           /settings/security       (todos)

ORGANIZACAO
  🏢 Organizacao         /settings/organization   (OWNER, ADMIN)
  👥 Membros             /settings/members        (OWNER, ADMIN)

CANAIS
  📱 WhatsApp            /settings/channels       (OWNER, ADMIN)
  🤖 Assistente IA       /settings/ai             (OWNER, ADMIN)

PREFERENCIAS
  🔔 Notificacoes        /settings/notifications  (todos)
  🎨 Aparencia           /settings/appearance     (todos)
```

### Icones (lucide-react)

| Secao         | Icone        |
| ------------- | ------------ |
| Meu Perfil    | `User`       |
| Seguranca     | `Shield`     |
| Organizacao   | `Building2`  |
| Membros       | `Users`      |
| WhatsApp      | `Smartphone` |
| Assistente IA | `Bot`        |
| Notificacoes  | `Bell`       |
| Aparencia     | `Palette`    |

### Visibilidade por Role

| Secao         | OWNER | ADMIN | MANAGER | COMMERCIAL | VIEWER |
| ------------- | ----- | ----- | ------- | ---------- | ------ |
| Meu Perfil    | ✓     | ✓     | ✓       | ✓          | ✓      |
| Seguranca     | ✓     | ✓     | ✓       | ✓          | ✓      |
| Organizacao   | ✓     | ✓     | ✗       | ✗          | ✗      |
| Membros       | ✓     | ✓     | ✗       | ✗          | ✗      |
| WhatsApp      | ✓     | ✓     | ✗       | ✗          | ✗      |
| Assistente IA | ✓     | ✓     | ✗       | ✗          | ✗      |
| Notificacoes  | ✓     | ✓     | ✓       | ✓          | ✓      |
| Aparencia     | ✓     | ✓     | ✓       | ✓          | ✓      |

### Mobile

- Sidebar vira scroll horizontal de pills no topo:

```
[👤 Perfil] [🔒 Seguranca] [🏢 Org] [👥 Membros] [📱 WhatsApp] ...
```

- Pill ativa: fundo `primary-100`, texto `primary-700`
- Scroll com snap

---

## 11. Componentes Reutilizaveis do Settings

### SettingsSection

```tsx
// Wrapper para cada secao dentro de uma pagina
<SettingsSection title="Informacoes" description="Seus dados pessoais">
  {children}
</SettingsSection>
```

### SettingsToggleRow

```tsx
// Linha com label + descricao + toggle (autosave)
<SettingsToggleRow
  label="Som de notificacao"
  description="Tocar som ao receber mensagem"
  checked={soundEnabled}
  onCheckedChange={handleToggle}
/>
```

### SettingsDangerZone

```tsx
// Card vermelha para acoes destrutivas
<SettingsDangerZone>
  <DangerAction
    title="Transferir propriedade"
    description="Transfira para outro ADMIN"
    buttonLabel="Transferir"
    onAction={handleTransfer}
  />
</SettingsDangerZone>
```

### SettingsCardSelect

```tsx
// Cards clicaveis para selecao (tema, densidade)
<SettingsCardSelect
  options={[
    { value: 'light', label: 'Claro', icon: Sun, preview: <LightPreview /> },
    { value: 'dark', label: 'Escuro', icon: Moon, preview: <DarkPreview /> },
    {
      value: 'system',
      label: 'Sistema',
      icon: Monitor,
      preview: <SystemPreview />,
    },
  ]}
  value={theme}
  onChange={setTheme}
/>
```

---

## 12. Resumo UX Guidelines Aplicadas

| Guideline                | Aplicacao                                                     |
| ------------------------ | ------------------------------------------------------------- |
| `progressive-disclosure` | Configuracoes avancadas do AI bot colapsaveis                 |
| `field-grouping`         | Sections com titulo + descricao                               |
| `inline-validation`      | Validar no blur (nome, slug, senha)                           |
| `password-toggle`        | Botao show/hide em campos de senha                            |
| `confirmation-dialogs`   | Acoes destrutivas (remover membro, transferir, excluir canal) |
| `toast-dismiss`          | "Salvo" auto-dismiss 3s apos cada save                        |
| `disabled-states`        | Campos readonly (email, CNPJ) com visual distinto             |
| `nav-state-active`       | Sidebar item ativo com fundo + borda                          |
| `deep-linking`           | Cada secao tem URL propria (`/settings/[section]`)            |
| `content-priority`       | Mobile: pills scrollaveis no topo, conteudo abaixo            |
| `primary-action`         | 1 CTA por secao (Salvar ou Convidar)                          |
| `destructive-emphasis`   | Zona de Perigo separada visualmente                           |
