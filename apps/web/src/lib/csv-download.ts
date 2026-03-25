const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export async function downloadCsvBlob(
  path: string,
  filename: string
): Promise<void> {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Falha ao exportar CSV')
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
