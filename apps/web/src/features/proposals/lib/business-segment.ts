import { BUSINESS_SEGMENT_VALUES, type BusinessSegment } from '@repo/shared'

export { BUSINESS_SEGMENT_VALUES }
export type { BusinessSegment }

export const BUSINESS_SEGMENT_LABELS: Record<BusinessSegment, string> = {
  INDUSTRY: 'Indústria',
  RETAIL: 'Comércio Varejista',
  WHOLESALE: 'Comércio Atacadista',
  WAREHOUSE_LOGISTICS: 'Armazém / Logística',
  CONSTRUCTION: 'Construção',
  HEALTH_CLINIC: 'Saúde / Clínica',
  EDUCATION: 'Educação',
  HOSPITALITY_RESTAURANT: 'Hospedagem / Restaurante',
  PROFESSIONAL_SERVICES: 'Serviços Profissionais',
  TECHNOLOGY: 'Tecnologia',
  CONSULTING: 'Consultoria',
  OTHER: 'Outros',
}

export const BUSINESS_SEGMENT_OPTIONS = BUSINESS_SEGMENT_VALUES.map(
  (value) => ({
    value,
    label: BUSINESS_SEGMENT_LABELS[value],
  })
)
