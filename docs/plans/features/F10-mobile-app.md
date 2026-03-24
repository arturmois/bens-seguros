# F10. App Mobile (PWA / React Native)

> **Esforco:** G (6-8 semanas para MVP) | **Impacto:** Retencao + Diferenciacao | **Prioridade:** Mes 5-6

---

## Descricao

App mobile para corretores em campo: consultar apolice, registrar sinistro com foto, chat com cliente, dashboard rapido.

## Por Que

Corretor visita cliente e precisa consultar dados no celular. Web responsiva funciona mas app nativo e melhor para: push notifications, camera, offline.

## Problema que Resolve

Corretor sem acesso rapido a dados em campo. Abre browser → login → navegar = lento.

## Opcoes

### Opcao A: PWA (Recomendado para MVP)

- Usar Next.js existente como PWA
- Adicionar `next-pwa` com service worker
- Manifest.json para "Add to Home Screen"
- Push notifications via Web Push API

**Vantagens:** Reutiliza 100% do codigo existente, sem app store
**Desvantagens:** Sem acesso a camera nativo (mas `<input type="file" capture>` funciona)
**Esforco:** P-M (1-2 semanas)

### Opcao B: React Native (Expo)

- App nativo com Expo
- Reutiliza `@repo/shared` (tipos, DTOs)
- API client reusavel
- Push notifications nativas

**Vantagens:** Camera, push, offline, performance nativa
**Desvantagens:** Codebase separada, publicacao app store
**Esforco:** G (6-8 semanas)

## Recomendacao

**Comecar com PWA** (opcao A) e avaliar necessidade de React Native baseado em feedback dos usuarios.

## Implementacao PWA

### Etapa 1: Configuracao

```bash
pnpm add next-pwa -F web
```

```typescript
// next.config.ts
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA(nextConfig)
```

### Etapa 2: Manifest

```json
// apps/web/public/manifest.json
{
  "name": "Bens Seguros",
  "short_name": "Bens",
  "start_url": "/dashboard",
  "display": "standalone",
  "theme_color": "#1f4b5f",
  "background_color": "#ffffff",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192" },
    { "src": "/icon-512.png", "sizes": "512x512" }
  ]
}
```

### Etapa 3: Telas Mobile-First

Priorizar telas para uso em campo:

1. Dashboard rapido (stats resumidos)
2. Busca de cliente/apolice
3. Chat com cliente
4. Registrar sinistro (com foto)
5. Consulta de apolice (mostrar para segurado)

### Etapa 4: Push Notifications

```typescript
// Web Push API para alertas (F04)
Notification.requestPermission().then((permission) => {
  if (permission === 'granted') {
    // Registrar subscription no servidor
  }
})
```

## Criterios de Aceite

### PWA

- [ ] "Add to Home Screen" funcional (Android + iOS)
- [ ] Icone e splash screen
- [ ] Offline: tela de "sem conexao" amigavel
- [ ] Push notifications para alertas

### Mobile UX

- [ ] Dashboard carrega em < 2s no 4G
- [ ] Busca de cliente funcional
- [ ] Chat funcional em mobile
- [ ] Camera para fotos de sinistro
