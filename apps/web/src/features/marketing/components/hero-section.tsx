import { DashboardPreview } from './dashboard-preview'
import { HeroBackground } from './hero-background'
import { HeroContent } from './hero-content'

export function HeroSection(): React.ReactElement {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-linear-to-br from-[#0a101f] via-slate-900 to-[#111827] px-6 pt-32 pb-20"
    >
      <HeroBackground />
      <HeroContent />
      <DashboardPreview />
    </section>
  )
}
