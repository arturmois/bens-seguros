const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

export function formatCurrency(valueInCents: number): string {
  return currencyFormatter.format(valueInCents / 100);
}

export function formatDate(dateStr: string): string {
  return dateFormatter.format(new Date(dateStr));
}
