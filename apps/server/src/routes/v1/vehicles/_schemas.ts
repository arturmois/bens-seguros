import { z } from 'zod'

const PLATE_OLD = /^[A-Z]{3}[0-9]{4}$/
const PLATE_MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/

const plateInput = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => v.replace(/[-\s]/g, ''))
  .refine((v) => PLATE_OLD.test(v) || PLATE_MERCOSUL.test(v), {
    message: 'Placa inválida',
  })

const chassiInput = z
  .string()
  .trim()
  .toUpperCase()
  .length(17, { message: 'Chassi deve ter 17 caracteres' })
  .regex(/^[A-HJ-NPR-Z0-9]{17}$/, { message: 'Chassi inválido' })

export const lookupVehicleBody = z
  .object({
    plate: plateInput.optional(),
    chassi: chassiInput.optional(),
    proposalId: z.string().min(1).optional(),
  })
  .refine((d) => Boolean(d.plate) || Boolean(d.chassi), {
    message: 'Informe placa ou chassi',
    path: ['plate'],
  })

const fuelTypeSchema = z.enum([
  'GASOLINE',
  'ETHANOL',
  'FLEX',
  'DIESEL',
  'ELECTRIC',
  'HYBRID',
  'OTHER',
])

export const vehicleDataSchema = z.object({
  vehicle: z.string(),
  manufacturingYear: z.number().int(),
  modelYear: z.number().int(),
  color: z.string().nullable(),
  fuelType: fuelTypeSchema.nullable(),
  chassi: z.string().nullable(),
  plate: z.string().nullable(),
})

export const lookupVehicleResponse = z.object({
  success: z.literal(true),
  data: vehicleDataSchema,
  meta: z.object({
    source: z.enum(['cache', 'provider']),
  }),
})
