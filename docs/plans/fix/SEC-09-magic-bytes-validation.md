# SEC-09. Validacao de Magic Bytes em Upload

> **Severidade:** MEDIO | **Esforco:** P (1h) | **Prioridade:** Semana 2

---

## Problema

Upload valida apenas MIME type do header, nao os magic bytes do conteudo. Executavel disfarado de imagem pode ser aceito.

## Especificacao (SECURITY-SPEC S10)

Validar magic bytes com `file-type` lib, nao apenas extensao. Bloquear executaveis.

## Implementacao

```bash
pnpm add file-type -F @repo/core
```

```typescript
// packages/core/src/modules/document/application/upload-document.ts
import { fileTypeFromBuffer } from 'file-type'

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'video/mp4',
  'audio/mpeg',
  'audio/ogg',
])

const BLOCKED_EXTENSIONS = new Set([
  'exe',
  'bat',
  'cmd',
  'sh',
  'ps1',
  'msi',
  'dll',
  'com',
  'scr',
])

async function validateFileContent(
  buffer: Buffer,
  fileName: string
): Promise<void> {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    throw new InvalidFileTypeError(ext)
  }

  const detected = await fileTypeFromBuffer(buffer)
  if (detected && !ALLOWED_TYPES.has(detected.mime)) {
    throw new InvalidFileTypeError(detected.mime)
  }
}
```

## Criterios de Aceite

- [ ] Upload de `.exe` renomeado para `.jpg` rejeitado
- [ ] Upload de imagem valida aceito
- [ ] Upload de PDF aceito
- [ ] Error message amigavel (nao expor detalhes internos)
