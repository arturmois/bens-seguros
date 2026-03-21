export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-lg p-4">{children}</div>
    </div>
  );
}
