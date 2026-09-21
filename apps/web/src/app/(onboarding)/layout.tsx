export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted">
      <main className="w-full max-w-lg p-4">
        <h1 className="mb-6 text-center font-semibold text-2xl text-primary">
          Bens Seguros
        </h1>
        {children}
      </main>
    </div>
  )
}
