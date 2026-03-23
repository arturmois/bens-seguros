import { DashboardPreview } from '@/features/marketing/components/dashboard-preview'

export function AuthPreviewPanel(): React.ReactElement {
  return (
    <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a101f] via-slate-900 to-[#111827] lg:flex">
      {/* Grid dots */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:24px_24px]"
        aria-hidden="true"
      />

      {/* Teal gradient orb */}
      <div
        className="animate-orb-drift bg-primary-500/20 absolute left-1/2 top-0 h-[400px] w-[400px] -translate-x-1/2 rounded-full blur-[60px]"
        aria-hidden="true"
      />

      {/* Gold gradient orb */}
      <div
        className="animate-orb-drift bg-accent-500/15 absolute bottom-0 right-0 h-[300px] w-[300px] rounded-full blur-[60px]"
        style={{ animationDelay: '-5s' }}
        aria-hidden="true"
      />

      {/* Dashboard preview */}
      <div className="relative z-10 w-full max-w-lg px-8">
        <DashboardPreview />
      </div>
    </div>
  )
}
