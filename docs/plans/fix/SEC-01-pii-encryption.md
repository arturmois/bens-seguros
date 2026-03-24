# SEC-01. Criptografia de PII (CPF/CNPJ)

> **Severidade:** CRITICO (LGPD) | **Esforco:** G (3-5 dias) | **Prioridade:** Mes 1

---

## Problema

CPF/CNPJ armazenado em plaintext no PostgreSQL. SECURITY-SPEC (SEC-1) exige AES-256-GCM + SHA-256 hash para busca.

## Especificacao

```
Campo: document (CPF/CNPJ)
Storage: PostgreSQL
Metodo: documentEncrypted (AES-256-GCM) + documentHash (SHA-256 para busca)
Chave: ENCRYPTION_KEY em .env (min 32 chars, ja definido em @repo/env)
```

## Implementacao

### Etapa 1: Schema Migration

```prisma
model Client {
  // Manter document temporariamente para migracao
  document           String?
  documentEncrypted  String   // AES-256-GCM ciphertext
  documentHash       String   // SHA-256 para busca por CPF/CNPJ
  // ...

  @@index([organizationId, documentHash])
}
```

### Etapa 2: Crypto Utils

```typescript
// packages/core/src/shared/crypto.ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'

export function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decrypt(ciphertext: string, key: Buffer): string {
  const buf = Buffer.from(ciphertext, 'base64')
  const iv = buf.subarray(0, 12)
  const authTag = buf.subarray(12, 28)
  const encrypted = buf.subarray(28)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted) + decipher.final('utf8')
}

export function hashDocument(document: string): string {
  const normalized = document.replace(/\D/g, '')
  return createHash('sha256').update(normalized).digest('hex')
}
```

### Etapa 3: Atualizar ClientMapper

```typescript
// toPersistence
return {
  documentEncrypted: encrypt(domain.document, encryptionKey),
  documentHash: hashDocument(domain.document),
}

// toDomain
return {
  document: decrypt(row.documentEncrypted, encryptionKey),
}
```

### Etapa 4: Migration Script (Backfill)

```typescript
// scripts/migrate-encrypt-documents.ts
// Para cada client com document != null:
//   1. encrypt(document) -> documentEncrypted
//   2. hashDocument(document) -> documentHash
//   3. set document = null (apos confirmar)
```

### Etapa 5: Busca por CPF/CNPJ

```typescript
// No use case FindClientByDocument:
const hash = hashDocument(inputCpf)
const client = await prisma.client.findFirst({
  where: { organizationId, documentHash: hash },
})
```

## Riscos

- Migration de backfill deve ser testada em staging antes de producao
- Perda da ENCRYPTION_KEY = dados irrecuperaveis (documentar rotacao)
- Performance: encrypt/decrypt por request (mitigado por cache)

## Criterios de Aceite

- [ ] `documentEncrypted` e `documentHash` no schema Prisma
- [ ] `encrypt()` e `decrypt()` com testes unitarios
- [ ] `hashDocument()` normaliza antes de hashear (remove pontos/tracos)
- [ ] Migration script backfill funcional
- [ ] Busca por CPF/CNPJ funciona via hash
- [ ] Campo `document` removido do schema apos migracao
- [ ] `ENCRYPTION_KEY` documentada no `.env.example`
- [ ] Nunca retornar `documentEncrypted` ou `documentHash` na API
