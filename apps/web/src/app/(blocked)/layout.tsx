import { Logo } from '@/components/shared/logo'

export default function BlockedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b px-6 py-4">
        <Logo />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">{children}</div>
      </main>
    </div>
  )
}
