import { HeroBackground } from './hero-background'
import { HeroContent } from './hero-content'
import { DashboardPreview } from './dashboard-preview'

export function HeroSection(): React.ReactElement {
  return (
    <section
      id="hero"
      className="relative overflow-hidden bg-gradient-to-br from-[#0a101f] via-slate-900 to-[#111827] px-6 pb-20 pt-32"
    >
      <HeroBackground />
      <HeroContent />
      <DashboardPreview />
    </section>
  )
}
