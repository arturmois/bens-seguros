import { tool } from 'ai'
import { z } from 'zod'

export function createConsultarProdutosTool() {
  return tool({
    description: 'Consulta os tipos de seguro oferecidos pela corretora.',
    parameters: z.object({}),
    execute: async () => {
      return {
        produtos: [
          'Seguro Auto',
          'Seguro de Vida',
          'Seguro Residencial',
          'Seguro Empresarial',
          'Seguro Viagem',
          'Responsabilidade Civil',
          'Seguro Saude',
        ],
      }
    },
  })
}
