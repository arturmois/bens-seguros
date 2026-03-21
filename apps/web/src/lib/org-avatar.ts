const COLORS = [
  '#0d4f4f',
  '#6b5b95',
  '#d4a843',
  '#c0392b',
  '#2980b9',
  '#27ae60',
  '#8e44ad',
  '#e67e22',
  '#1abc9c',
  '#34495e',
];

export function getOrgInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function getOrgColor(id: string): string {
  let hash = 0;
  for (const char of id) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index] ?? '#0d4f4f';
}
