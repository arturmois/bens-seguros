import { defineConfig } from 'orval'

export default defineConfig({
  bensSeguros: {
    input: {
      target: 'http://localhost:3001/api/docs/openapi.json',
      filters: {
        mode: 'exclude',
        tags: ['default'],
      },
    },
    output: {
      mode: 'tags-split',
      target: 'src/api/endpoints',
      schemas: 'src/api/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
      override: {
        mutator: {
          path: './src/lib/api-mutator.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
          useInfinite: false,
          useInfiniteQueryParam: 'cursor',
          usePrefetch: true,
          signal: true,
          options: {
            staleTime: 60000,
          },
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },

  bensSegurosZod: {
    input: {
      target: 'http://localhost:3001/api/docs/openapi.json',
      filters: {
        mode: 'exclude',
        tags: ['default'],
      },
    },
    output: {
      mode: 'tags-split',
      client: 'zod',
      target: 'src/api/endpoints',
      fileExtension: '.zod.ts',
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
})
