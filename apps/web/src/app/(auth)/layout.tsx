export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-muted flex min-h-dvh items-center justify-center">
      <div className="bg-card w-full max-w-md rounded-lg border p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-primary text-2xl font-semibold">Bens Seguros</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
