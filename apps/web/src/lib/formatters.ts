const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatCurrency(valueInCents: number): string {
  return currencyFormatter.format(valueInCents / 100)
}

export function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr))
}

export function formatPercentage(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(1)}%`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
