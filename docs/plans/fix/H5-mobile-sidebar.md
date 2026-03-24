# H5. Sidebar Expandida por Default no Mobile

> **Severidade:** HIGH (UX) | **Esforco:** P (30min) | **Prioridade:** Semana 1

---

## Problema

No primeiro load em viewport < 768px, a sidebar inicia expandida ocupando ~70% da tela. Conteudo principal fica invisivel.

## Arquivo

`apps/web/src/components/ui/sidebar.tsx` ou componente de layout

## Impacto

Primeira impressao ruim em mobile. Corretores brasileiros usam celular frequentemente.

## Correcao

```typescript
const [isOpen, setIsOpen] = useState(() => {
  if (typeof window === 'undefined') return true
  return window.innerWidth >= 768
})
```

Ou usar hook `useMediaQuery`:

```typescript
const isDesktop = useMediaQuery('(min-width: 768px)')
const [isOpen, setIsOpen] = useState(isDesktop)
```

## Criterios de Aceite

- [ ] Mobile (375px): sidebar inicia colapsada
- [ ] Desktop (1440px): sidebar inicia expandida
- [ ] Toggle funciona normalmente em ambos
- [ ] Sem flash/flicker no SSR
