# Super-admin lifecycle runbook

Status: **ATIVO** desde 2026-05-24 (SE4d, Fase 0 do projeto billing).

Esse runbook documenta o processo manual de **conceder, auditar e revogar** o flag `User.isSuperAdmin` no Bens Seguros. Super-admin é o claim mais sensível do sistema — ele bypassa multi-tenancy, RLS e quotas de billing. **NUNCA exponha CREATE/REVOKE via API.**

---

## 1. Quem é super-admin

Super-admin é um **claim de plataforma**, não um role da org. Tem acesso a endpoints `/api/internal/admin/*` (Fase 4) que permitem:

- `override-status` de Subscription (ex.: forçar ACTIVE)
- `credit` em qualquer org
- `extend-trial` em qualquer org
- `toggle billingManagedExternally` (clientes pagos externamente)
- Replay de webhook Asaas (dry-run + execute)
- CREATE/UPDATE de `Plan` (SE5 — write lockdown)

Hoje o sistema não tem nenhum desses endpoints (eles serão criados na Fase 4). Quando existirem, todos serão protegidos por `requireSuperAdmin` + `requireSuperAdmin2FA` (SE4a) + audit log + out-of-band alert.

---

## 2. Conceder super-admin (CREATE)

**SOMENTE via SQL direto no banco de produção.** Nunca via API, nunca via Prisma Studio remoto (essa interface não tem audit log nativo).

### Pré-requisitos

- User já existe no sistema com `User.emailVerified = true`.
- Há justificativa documentada (incidente, função permanente, debug auth) — escreve no `AuditLog.notes` quando criar.
- Quem está concedendo tem acesso SSH ao VPS prod (única forma de chegar no Postgres).

### Comando

```bash
# 1. SSH no host de prod
ssh bens-vps

# 2. Abrir psql com password DB (não use DATABASE_ADMIN_URL — esse é pro app)
psql "$DATABASE_URL"

# 3. Verificar que o user existe e é o correto
SELECT id, email, name, emailVerified, isSuperAdmin
FROM "User"
WHERE email = 'admin@example.com';

# 4. Conceder (UPDATE explícito, não INSERT — usuário precisa pré-existir)
UPDATE "User"
SET "isSuperAdmin" = true
WHERE email = 'admin@example.com' AND emailVerified = true;
# Esperado: UPDATE 1

# 5. Confirmar
SELECT id, email, "isSuperAdmin" FROM "User" WHERE email = 'admin@example.com';
```

### Pós-CREATE (obrigatório)

1. **Onboarding 2FA TOTP** (SE4a, quando implementado): user faz login + acessa `/settings/admin/security` + escaneia QR code TOTP + valida primeiro código. Sem 2FA configurado, endpoints `/admin/*` retornam 403 mesmo com `isSuperAdmin=true`.
2. **Notificar canal de segurança** (Slack `#sec` ou email fundador) com: quem concedeu, quem recebeu, motivo, prazo de validade (se temporário).
3. **Registrar no `AuditLog`** manualmente:
   ```sql
   INSERT INTO "AuditLog" (id, "entityType", "entityId", action, "actorUserId", notes, "createdAt")
   VALUES (
     gen_random_uuid(),
     'User',
     '<user-id>',
     'GRANT_SUPER_ADMIN',
     '<actor-user-id>',
     'Motivo: <justificativa>. Prazo: <permanente | até YYYY-MM-DD>.',
     NOW()
   );
   ```

---

## 3. Auditar super-admins ativos

**Cadência recomendada:** mensal, após cada offboarding de funcionário, após incidentes de segurança.

```sql
-- Lista atual
SELECT id, email, name, "emailVerified", "createdAt", "updatedAt"
FROM "User"
WHERE "isSuperAdmin" = true
ORDER BY "updatedAt" DESC;

-- Histórico de GRANT/REVOKE (via AuditLog)
SELECT
  a."createdAt",
  a.action,
  u.email AS target_email,
  actor.email AS actor_email,
  a.notes
FROM "AuditLog" a
LEFT JOIN "User" u ON u.id = a."entityId"
LEFT JOIN "User" actor ON actor.id = a."actorUserId"
WHERE a."entityType" = 'User'
  AND a.action IN ('GRANT_SUPER_ADMIN', 'REVOKE_SUPER_ADMIN')
ORDER BY a."createdAt" DESC
LIMIT 50;
```

Se a lista atual contém alguém não esperado → **incidente de segurança**. Trate com revogação imediata + investigação de como o flag foi setado (procurar SQL command history no VPS, logs do banco).

---

## 4. Revogar super-admin (REVOKE)

Toda vez que: funcionário sai, contrato termina, suspeita de comprometimento, debug temporário acabou.

```bash
# 1. SSH no host de prod
ssh bens-vps

# 2. psql
psql "$DATABASE_URL"

# 3. Revogar
UPDATE "User"
SET "isSuperAdmin" = false, "updatedAt" = NOW()
WHERE id = '<user-id>';

# 4. Invalidar sessões ativas (força re-login sem o claim)
DELETE FROM "Session" WHERE "userId" = '<user-id>';

# 5. Confirmar
SELECT id, email, "isSuperAdmin" FROM "User" WHERE id = '<user-id>';
SELECT COUNT(*) FROM "Session" WHERE "userId" = '<user-id>';
```

### Pós-REVOKE (obrigatório)

1. Registrar `AuditLog` com action `REVOKE_SUPER_ADMIN` e motivo.
2. Se comprometimento: rotar `AUTH_SECRET`, invalidar TODAS as sessions ativas (`TRUNCATE Session`), force logout global.
3. Notificar canal de segurança.

---

## 5. Anti-patterns (NÃO faça)

- **NÃO** exponha CREATE/REVOKE via endpoint HTTP, mesmo "protegido por super-admin". Isso cria recursão (super-admin para super-admin, sem audit externo).
- **NÃO** use Prisma Studio web pra editar `isSuperAdmin`. Não tem audit log.
- **NÃO** marque `isSuperAdmin=true` em ambiente dev/staging e replique pra prod via seed. Concessão é SEMPRE manual em prod.
- **NÃO** conceda super-admin sem prazo definido. Privilégio permanente é dívida de segurança.
- **NÃO** compartilhe conta super-admin entre pessoas. Uma conta por humano, sempre.

---

## 6. Quando promover para automação

Quando o time crescer (> 3 pessoas com acesso super-admin), considerar:

- Workflow PR-based: arquivo `super-admins.yml` versionado no repo, script aplica via migration. Garante review + audit no git log.
- Approval flow (SE4c): ação destrutiva via API exige 2º super-admin aprovar. Hoje (solo dev) é challenge OTP + delay 60s + email auto.
- SAML/OIDC: super-admin é provisionado via IdP corporativo, não DB direto.

Por enquanto (solo dev, 1 super-admin), SQL manual + AuditLog + 2FA TOTP é suficiente.
