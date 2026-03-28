# Bens Seguros — Tutorial de Deploy em Producao

Guia passo a passo para colocar o projeto em producao.

**Infraestrutura:**

- Frontend: Vercel (`app.bensseg.com`)
- Backend: VPS Hostinger KVM 2 (`api.bensseg.com`, `chat.bensseg.com`)
- SSL: Cloudflare Full (Strict)
- CI/CD: GitHub Actions → Docker Hub → VPS

**Pre-requisitos:**

- VPS Hostinger contratada (2 vCPU, 8GB RAM, 100GB NVMe)
- Dominio `bensseg.com` registrado
- Conta Docker Hub (gratuita)
- Conta Cloudflare (gratuita)
- Conta Vercel (gratuita)

---

## Parte 1: Cloudflare (DNS + SSL)

### 1.1 Adicionar site ao Cloudflare

1. Acesse https://dash.cloudflare.com → "Add a domain" → "Connect domain"
2. Digite `bensseg.com`
3. Selecione o plano Free
4. Cloudflare vai escanear os registros DNS existentes

### 1.2 Alterar nameservers na Hostinger

1. Cloudflare mostra 2 nameservers (ex: `ada.ns.cloudflare.com`, `bob.ns.cloudflare.com`)
2. Va em Hostinger → Dominios → `bensseg.com` → DNS/Nameservers
3. Substitua os nameservers pelos do Cloudflare
4. Aguarde 1-24h para propagacao

### 1.3 Configurar registros DNS

No painel Cloudflare → DNS → Add records:

| Tipo  | Nome   | Conteudo               | Proxy        |
| ----- | ------ | ---------------------- | ------------ |
| A     | `api`  | `<IP_DA_VPS>`          | ON (laranja) |
| A     | `chat` | `<IP_DA_VPS>`          | ON (laranja) |
| CNAME | `app`  | `cname.vercel-dns.com` | OFF (cinza)  |

> `app.bensseg.com` com proxy OFF porque a Vercel gerencia seu proprio TLS.

### 1.4 Configurar modo SSL

1. Cloudflare → SSL/TLS → Overview
2. Definir modo como **"Full (Strict)"**

### 1.5 Gerar Origin Certificate

1. Cloudflare → SSL/TLS → Origin Server
2. Clique em "Create Certificate"
3. Mantenha os defaults (RSA 2048, 15 anos, cobre `*.bensseg.com` e `bensseg.com`)
4. Copie o certificado → salve como `cloudflare-origin.pem`
5. Copie a chave privada → salve como `cloudflare-origin-key.pem`
6. **Guarde esses dois arquivos** — serao enviados para a VPS no Step 5

### 1.6 Habilitar WebSockets

1. Cloudflare → Network
2. Ativar "WebSockets" ON

### 1.7 Configuracoes recomendadas

1. SSL/TLS → Edge Certificates → "Always Use HTTPS" ON
2. SSL/TLS → Edge Certificates → "Minimum TLS Version" → TLS 1.2
3. Security → Settings → "Security Level" → Medium
4. Caching → Configuration → "Browser Cache TTL" → 4 hours

---

## Parte 2: VPS (Hostinger)

### 2.1 Conectar via SSH

```bash
ssh root@<IP_DA_VPS>
```

### 2.2 Atualizar sistema, firewall e instalar Docker

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Configurar firewall (apenas SSH, HTTP, HTTPS)
apt install ufw -y
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status

# Instalar Docker
curl -fsSL https://get.docker.com | sh

# Instalar Docker Compose plugin
apt install docker-compose-plugin -y

# Verificar
docker --version
docker compose version
```

### 2.3 Criar usuario de deploy

```bash
adduser deploy --disabled-password
usermod -aG docker deploy

# Configurar chave SSH para o usuario deploy
mkdir -p /home/deploy/.ssh
echo "ssh-ed25519 AAAA... sua-chave-publica" >> /home/deploy/.ssh/authorized_keys
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh

# Desabilitar autenticacao por senha
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

> A partir daqui, use `ssh deploy@<IP_DA_VPS>` para conectar.

### 2.4 Criar diretorio do projeto

```bash
mkdir -p /opt/bens-seguros/nginx/certs
mkdir -p /opt/bens-seguros/scripts
mkdir -p /opt/bens-seguros/backups
chown -R deploy:deploy /opt/bens-seguros
```

### 2.5 Enviar arquivos para a VPS

Da sua maquina local, na raiz do projeto:

```bash
# Compose e Nginx config
scp docker-compose.prod.yml deploy@<IP_DA_VPS>:/opt/bens-seguros/
scp nginx/prod.conf deploy@<IP_DA_VPS>:/opt/bens-seguros/nginx/prod.conf
scp scripts/mongo-init-replica.sh deploy@<IP_DA_VPS>:/opt/bens-seguros/scripts/
scp scripts/backup.sh deploy@<IP_DA_VPS>:/opt/bens-seguros/scripts/

# Certificados Cloudflare Origin (gerados no Step 1.5)
scp cloudflare-origin.pem deploy@<IP_DA_VPS>:/opt/bens-seguros/nginx/certs/
scp cloudflare-origin-key.pem deploy@<IP_DA_VPS>:/opt/bens-seguros/nginx/certs/
```

### 2.6 Gerar keyfile do MongoDB (replica set com auth)

O MongoDB em modo replica set com `--auth` exige um keyfile para autenticacao interna entre membros.

```bash
ssh deploy@<IP_DA_VPS>
cd /opt/bens-seguros

# Gerar keyfile
openssl rand -base64 756 > mongo-keyfile

# Permissoes estritas (uid 999 = usuario mongodb dentro do container)
chmod 400 mongo-keyfile
chown 999:999 mongo-keyfile
```

### 2.7 Criar arquivo .env na VPS

```bash
cd /opt/bens-seguros

# Gerar senhas (hex para evitar caracteres especiais em URLs de conexao)
echo "DB_PASSWORD: $(openssl rand -hex 32)"
echo "MONGO_PASSWORD: $(openssl rand -hex 32)"
echo "REDIS_PASSWORD: $(openssl rand -hex 32)"
echo "AUTH_SECRET: $(openssl rand -base64 32)"
echo "SOCKET_JWT_SECRET: $(openssl rand -base64 24)"
echo "ENCRYPTION_KEY: $(openssl rand -hex 32)"
```

Copie as senhas geradas e crie o arquivo `.env`:

```bash
nano .env
```

Cole o template abaixo preenchendo com as senhas geradas e seus dados:

```bash
# === APP ===
NODE_ENV=production
FRONTEND_URL=https://app.bensseg.com
API_URL=https://api.bensseg.com
CHAT_SERVER_URL=https://chat.bensseg.com

# === DATABASES ===
DATABASE_URL=postgresql://bens_prod:<DB_PASSWORD>@postgres:5432/bens_seguros
MONGODB_URL=mongodb://bens_mongo:<MONGO_PASSWORD>@mongodb:27017/bens-chat?replicaSet=rs0&authSource=admin
REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379

# === DATABASE CREDENTIALS ===
DB_USER=bens_prod
DB_PASSWORD=<COLE_AQUI>
DB_NAME=bens_seguros
MONGO_USER=bens_mongo
MONGO_PASSWORD=<COLE_AQUI>
REDIS_PASSWORD=<COLE_AQUI>

# === AUTH ===
AUTH_SECRET=<COLE_AQUI>
SOCKET_JWT_SECRET=<COLE_AQUI>

# === COOKIES (obrigatorio para auth cross-subdomain) ===
COOKIE_DOMAIN=.bensseg.com

# === SECURITY (obrigatorio - criptografia PII) ===
ENCRYPTION_KEY=<COLE_AQUI>

# === STORAGE (Cloudflare R2) ===
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=<seu-account-id>
R2_ACCESS_KEY_ID=<sua-access-key>
R2_SECRET_ACCESS_KEY=<sua-secret-key>
R2_BUCKET_NAME=bens-seguros
R2_PUBLIC_URL=<sua-url-publica-r2>

# === DOCKER ===
DOCKERHUB_USERNAME=<seu-usuario-dockerhub>
TAG=latest

# === OPCIONAL ===
# ANTHROPIC_API_KEY=
# OPENAI_API_KEY=
# RESEND_API_KEY=
# RESEND_FROM_ADDRESS=Bens Seguros <noreply@bensseg.com>
# SENTRY_DSN=
# NEXT_PUBLIC_SENTRY_DSN=
# INTERNAL_API_URL=http://server:3001
# INTERNAL_API_SECRET=<gere-com-openssl-rand-base64-32>
# META_WHATSAPP_TOKEN=
# META_WHATSAPP_VERIFY_TOKEN=
# META_WHATSAPP_PHONE_NUMBER_ID=
```

Proteger o arquivo:

```bash
chmod 600 .env
```

### 2.8 Inicializar MongoDB replica set

```bash
# Subir MongoDB primeiro
docker compose -f docker-compose.prod.yml up -d mongodb

# Aguardar ficar pronto
sleep 10

# Inicializar replica set
source .env
docker compose -f docker-compose.prod.yml exec mongodb mongosh \
  -u "$MONGO_USER" -p "$MONGO_PASSWORD" --authenticationDatabase admin --eval '
  rs.initiate({ _id: "rs0", members: [{ _id: 0, host: "mongodb:27017" }] })
'
```

### 2.9 Subir todos os servicos

```bash
cd /opt/bens-seguros

# Puxar imagens do Docker Hub
docker compose -f docker-compose.prod.yml pull

# Subir databases primeiro
docker compose -f docker-compose.prod.yml up -d postgres mongodb redis

# Aguardar health checks
sleep 15

# Rodar migrations do Prisma
docker compose -f docker-compose.prod.yml run --rm server \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Subir todos os containers
docker compose -f docker-compose.prod.yml up -d

# Verificar status
docker compose -f docker-compose.prod.yml ps
```

Todos os containers devem estar `healthy` ou `running`.

### 2.10 Configurar backup automatico

```bash
chmod +x /opt/bens-seguros/scripts/backup.sh

# Adicionar cron job (como usuario deploy)
crontab -e
```

Adicione esta linha:

```cron
0 3 * * * /opt/bens-seguros/scripts/backup.sh >> /var/log/bens-backup.log 2>&1
```

Backup roda diariamente as 3h da manha (horario do servidor).

---

## Parte 3: GitHub Actions (CI/CD)

### 3.1 Configurar Secrets no GitHub

No repositorio GitHub → Settings → Secrets and variables → Actions, adicione:

| Secret               | Valor                                                              |
| -------------------- | ------------------------------------------------------------------ |
| `DOCKERHUB_USERNAME` | Seu usuario Docker Hub                                             |
| `DOCKERHUB_TOKEN`    | Access token Docker Hub (gere em hub.docker.com/settings/security) |
| `VPS_HOST`           | IP da VPS                                                          |
| `VPS_USER`           | `deploy`                                                           |
| `VPS_SSH_KEY`        | Conteudo da sua chave privada Ed25519                              |

### 3.2 Como funciona o deploy automatico

Apos configurar, o deploy e automatico:

- **Push em `apps/server/**`ou`packages/**`** → builda imagem server, deploya na VPS
- **Push em `apps/chat-server/**`\*\* → builda imagem chat, deploya na VPS
- **Push em `apps/web/**`\*\* → Vercel deploya automaticamente

Cada deploy:

1. Roda quality gates (lint, typecheck, test)
2. Builda imagem Docker com tag SHA
3. Faz SSH na VPS e atualiza containers
4. Roda Prisma migrate (server apenas)
5. Verifica health check
6. Se falhar, faz rollback automatico

---

## Parte 4: Vercel (Frontend)

### 4.1 Importar projeto

1. Acesse https://vercel.com → Import project from GitHub
2. Selecione o repositorio
3. Configure:
   - **Root Directory:** `apps/web`
   - **Build Command:** `cd ../.. && pnpm turbo build --filter=web`
   - **Install Command:** `pnpm install`
   - **Node.js Version:** 22.x

### 4.2 Adicionar variaveis de ambiente

Em Settings → Environment Variables:

| Variavel                      | Valor                      | Scope      |
| ----------------------------- | -------------------------- | ---------- |
| `NEXT_PUBLIC_API_URL`         | `https://api.bensseg.com`  | Production |
| `NEXT_PUBLIC_CHAT_SERVER_URL` | `https://chat.bensseg.com` | Production |
| `NEXT_PUBLIC_SENTRY_DSN`      | `<seu-dsn-sentry>`         | Production |
| `SENTRY_ORG`                  | `<sua-org-sentry>`         | Production |
| `SENTRY_PROJECT`              | `<seu-project-sentry>`     | Production |
| `SENTRY_AUTH_TOKEN`           | `<seu-auth-token-sentry>`  | Production |

### 4.3 Configurar dominio custom

1. Vercel → Project Settings → Domains
2. Adicionar `app.bensseg.com`
3. Vercel vai verificar o DNS (ja configurado no Cloudflare Step 1.3)

### 4.4 Ignored Build Step (opcional)

Em Settings → Git → Ignored Build Step, adicione:

```bash
npx turbo-ignore web
```

Isso faz a Vercel pular builds quando nenhum arquivo relevante mudou.

---

## Parte 5: Monitoramento

### 5.1 Sentry (Error Tracking)

Ja integrado no codigo. Ative adicionando `SENTRY_DSN` no `.env` da VPS.

### 5.2 UptimeRobot (Uptime Monitoring)

1. Crie conta em https://uptimerobot.com (gratis)
2. Adicione 3 monitores:

| Monitor     | URL                               | Intervalo |
| ----------- | --------------------------------- | --------- |
| API Health  | `https://api.bensseg.com/health`  | 5 min     |
| Chat Health | `https://chat.bensseg.com/health` | 5 min     |
| Frontend    | `https://app.bensseg.com`         | 5 min     |

3. Configure alertas (email, Telegram, etc.)

---

## Comandos Uteis

### Ver logs de um container

```bash
docker compose -f docker-compose.prod.yml logs -f server --tail 100
```

### Reiniciar um servico

```bash
docker compose -f docker-compose.prod.yml restart server
```

### Ver status de todos os containers

```bash
docker compose -f docker-compose.prod.yml ps
```

### Rollback manual para versao anterior

```bash
cd /opt/bens-seguros
PREV_TAG=$(cat .current-tag)
export TAG=$PREV_TAG
docker compose -f docker-compose.prod.yml up -d server worker
```

### Executar backup manualmente

```bash
/opt/bens-seguros/scripts/backup.sh
```

### Restaurar backup PostgreSQL

```bash
gunzip -c backups/postgres_YYYY-MM-DD_HH-MM.sql.gz | \
  docker compose -f docker-compose.prod.yml exec -T postgres psql -U bens_prod bens_seguros
```

### Restaurar backup MongoDB

```bash
gunzip -c backups/mongo_YYYY-MM-DD_HH-MM.archive.gz | \
  docker compose -f docker-compose.prod.yml exec -T mongodb mongorestore --archive \
  -u bens_mongo -p <MONGO_PASSWORD> --authenticationDatabase admin
```

### Ver uso de recursos

```bash
docker stats --no-stream
```
