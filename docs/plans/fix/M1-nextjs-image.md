# M1. Tags img sem Next.js Image

> **Severidade:** MEDIO (performance) | **Esforco:** P (30min) | **Prioridade:** Semana 2

---

## Problema

Imagens de perfil de contato no chat usam `<img>` nativo sem otimizacao.

## Arquivos

- `apps/web/src/features/chat/components/chat-header.tsx` linha 146-150
- `apps/web/src/features/chat/components/contact-profile.tsx` linha 55-59

## Impacto

- Sem otimizacao automatica (WebP/AVIF)
- Sem lazy loading nativo
- Sem prevencao de CLS (falta width/height)

## Correcao

```tsx
import Image from 'next/image'

// Substituir:
<img src={contact.profilePicUrl} alt={displayName} className="..." />

// Por:
<div className="relative h-10 w-10">
  <Image
    src={contact.profilePicUrl}
    alt={displayName}
    fill
    className="rounded-full object-cover"
  />
</div>
```

Verificar `next.config.ts` > `images.remotePatterns` inclui dominios de perfil WhatsApp (`pps.whatsapp.net`).

## Criterios de Aceite

- [ ] Zero `<img>` tags em componentes de chat
- [ ] `next/image` com `fill` prop
- [ ] Lazy loading automatico
- [ ] Sem CLS ao carregar imagens
