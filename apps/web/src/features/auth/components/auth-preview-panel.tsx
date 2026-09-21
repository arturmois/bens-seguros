import { DashboardPreview } from '@/features/marketing/components/dashboard-preview'

export function AuthPreviewPanel(): React.ReactElement {
  return (
    <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a101f] via-slate-900 to-[#111827] lg:flex">
      {/* Grid dots */}
      <div
        className="absolute inset-0 bg-[length:24px_24px] bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)]"
        aria-hidden="true"
      />
      {/* Teal gradient orb */}
      <div
        className="absolute top-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 animate-orb-drift rounded-full bg-primary-500/20 blur-[60px]"
        aria-hidden="true"
      />
      {/* Gold gradient orb */}
      <div
        className="absolute right-0 bottom-0 h-[300px] w-[300px] animate-orb-drift rounded-full bg-accent-500/15 blur-[60px]"
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
