# C3. Favicon Ausente

> **Severidade:** CRITICO (cosmetico) | **Esforco:** P (15min) | **Prioridade:** Semana 1

---

## Problema

Toda navegacao gera `404 (Not Found)` para `/favicon.ico` nos logs. Polui logs e da impressao de erro.

## Arquivo

`apps/web/public/` (ausente)

## Correcao

1. Gerar favicon a partir das iniciais "BS" ou logo da aplicacao
2. Adicionar `favicon.ico` (32x32) em `apps/web/public/`
3. Opcionalmente adicionar `favicon.svg` para modern browsers
4. Adicionar meta tags em `apps/web/src/app/layout.tsx`:

```typescript
export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
  },
}
```

## Criterios de Aceite

- [ ] `favicon.ico` existe em `apps/web/public/`
- [ ] Nenhum 404 no DevTools ao navegar
- [ ] Icone visivel na aba do browser
