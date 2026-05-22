export function splitAnnualToMonths(annualCents: number): readonly number[] {
  if (annualCents <= 0) return Array(12).fill(0)
  const base = Math.floor(annualCents / 12)
  const remainder = annualCents - base * 12
  const months = Array<number>(12).fill(base)
  months[11] = base + remainder
  return months
}
