export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-lg p-4">
        <h1 className="text-primary mb-6 text-center text-2xl font-semibold">Bens Seguros</h1>
        {children}
      </div>
    </div>
  );
}
