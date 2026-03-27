# SCRUM-37: Visualizacao de Documentos

## Contexto

Apos upload de documentos, o usuario precisa poder visualizar e baixar os arquivos anexados. Atualmente o sistema tem um botao "Abrir" que abre a signed URL em nova aba, mas usa icone generico (ExternalLink) e nao oferece download dedicado.

## Decisoes de Design

### Visualizacao em nova aba (sem modal inline)

Manter o comportamento atual de abrir em nova aba. O browser lida com PDF viewer nativo e imagens. Trocar apenas o icone de ExternalLink para Eye para comunicar melhor a acao.

### Download via fetch+blob (frontend-only)

Forcar download sem alterar backend. Usar `fetch` para obter o arquivo via signed URL, criar um `Blob`, gerar `URL.createObjectURL`, e disparar download via `<a download>`. Funciona com R2 e local storage provider sem mudancas.

### Layout dos botoes no DocumentRow

3 botoes na area de acoes de cada documento:

| Botao      | Icone               | Acao                                           |
| ---------- | ------------------- | ---------------------------------------------- |
| Visualizar | `Eye` (lucide)      | `window.open(signedUrl, '_blank', 'noopener')` |
| Download   | `Download` (lucide) | fetch + blob + `<a download>`                  |
| Excluir    | `Trash2` (lucide)   | Dialog de confirmacao (ja existe)              |

## Alteracoes Necessarias

### Frontend

**`document-list.tsx`** — unico arquivo a modificar:

1. Trocar icone `ExternalLink` por `Eye` no botao de abrir
2. Atualizar aria-label de "Abrir" para "Visualizar"
3. Adicionar botao Download com icone `Download` entre Visualizar e Excluir
4. Implementar funcao `handleDownload` que:
   - Busca signed URL via `/api/v1/documents/:id/url`
   - Faz `fetch(url)` para obter o blob
   - Cria `URL.createObjectURL(blob)`
   - Cria elemento `<a>` temporario com atributo `download` e filename original
   - Dispara click programatico e limpa o object URL
5. Mostrar estado de loading no botao durante download

### Backend

Nenhuma alteracao necessaria.

### Schema

Nenhuma alteracao necessaria.

## Criterios de Aceite

- [ ] Botao com icone Eye abre documento em nova aba
- [ ] Botao com icone Download forca download do arquivo com nome original
- [ ] Download funciona para todos os tipos: imagens, PDF, Word, Excel
- [ ] Estado de loading visivel durante download
- [ ] Tamanho e data de upload visiveis na lista (ja implementado)
- [ ] Botao Excluir continua funcionando com dialog de confirmacao
- [ ] Funciona em todas as listagens de documentos (proposta, cliente, apolice, sinistro)
