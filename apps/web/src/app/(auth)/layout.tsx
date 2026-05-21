import { Logo } from '@/components/shared/logo'
import { AuthPreviewPanel } from '@/features/auth/components/auth-preview-panel'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="auth-surface flex min-h-dvh">
      {/* Left: Form */}
      <div className="flex flex-1 flex-col justify-center bg-[#0f172a] px-6 lg:max-w-[55%]">
        <div className="mx-auto w-full max-w-[380px]">
          <div className="mb-8">
            <Logo />
          </div>
          {children}
        </div>
      </div>
      {/* Right: Preview */}
      <AuthPreviewPanel />
    </div>
  )
}
