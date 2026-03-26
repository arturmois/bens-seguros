import { z } from 'zod'

const autoDetailsSchema = z.object({
  branch: z.literal('AUTO'),
  marca: z.string().min(1),
  modelo: z.string().min(1),
  anoFabricacao: z.number().int().min(1900).max(2100),
  anoModelo: z.number().int().min(1900).max(2100),
  placa: z.string().optional(),
  chassi: z.string().optional(),
  cor: z.string().optional(),
  combustivel: z.string().optional(),
  usoVeiculo: z.string().optional(),
})

const residentialDetailsSchema = z.object({
  branch: z.literal('RESIDENTIAL'),
  tipoImovel: z.string().min(1),
  usoImovel: z.string().min(1),
  cep: z.string().min(1),
  endereco: z.string().optional(),
  construcao: z.string().optional(),
  areaM2: z.number().optional(),
})

const condominiumDetailsSchema = z.object({
  branch: z.literal('CONDOMINIUM'),
  nomeCondominio: z.string().min(1),
  numeroUnidades: z.number().int().min(1),
  cep: z.string().min(1),
  endereco: z.string().optional(),
  anoConstrucao: z.number().int().optional(),
  numeroAndares: z.number().int().optional(),
})

const businessDetailsSchema = z.object({
  branch: z.literal('BUSINESS'),
  razaoSocial: z.string().min(1),
  cnpj: z.string().min(1),
  atividade: z.string().min(1),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  areaM2: z.number().optional(),
})

const lifeDetailsSchema = z.object({
  branch: z.literal('LIFE'),
  profissao: z.string().min(1),
  rendaMensalCentavos: z.number().int().min(0).optional(),
  fumante: z.boolean().optional(),
  esportesRadicais: z.boolean().optional(),
  alturaEmCentimetros: z.number().int().min(100).max(250).optional(),
  pesoEmGramas: z.number().int().min(20000).max(300000).optional(),
  beneficiarios: z.string().optional(),
})

const otherDetailsSchema = z.object({
  branch: z.literal('OTHER'),
  descricao: z.string().min(1),
})

export const insuredObjectDetailsSchema = z.discriminatedUnion('branch', [
  autoDetailsSchema,
  residentialDetailsSchema,
  condominiumDetailsSchema,
  businessDetailsSchema,
  lifeDetailsSchema,
  otherDetailsSchema,
])

export const updateProposalDetailsBodySchema = z.object({
  details: insuredObjectDetailsSchema,
  premiumValueInCents: z.number().int().min(0),
  commissionBasisPoints: z.number().int().min(0).max(10000),
})
