import { AnimateOnScroll } from '@/features/marketing/components/animate-on-scroll'
import { HeroSection } from '@/features/marketing/components/hero-section'
import { LogosSection } from '@/features/marketing/components/logos-section'
import { ProblemSection } from '@/features/marketing/components/problem-section'
import { FeaturesSection } from '@/features/marketing/components/features-section'
import { HowItWorksSection } from '@/features/marketing/components/how-it-works-section'
import { TestimonialsSection } from '@/features/marketing/components/testimonials-section'
import { PricingSection } from '@/features/marketing/components/pricing-section'
import { FaqCtaSection } from '@/features/marketing/components/faq-cta-section'

export default function MarketingPage(): React.ReactElement {
  return (
    <>
      <HeroSection />
      <AnimateOnScroll>
        <LogosSection />
      </AnimateOnScroll>
      <AnimateOnScroll>
        <ProblemSection />
      </AnimateOnScroll>
      <AnimateOnScroll>
        <FeaturesSection />
      </AnimateOnScroll>
      <AnimateOnScroll>
        <HowItWorksSection />
      </AnimateOnScroll>
      <AnimateOnScroll>
        <TestimonialsSection />
      </AnimateOnScroll>
      <AnimateOnScroll>
        <PricingSection />
      </AnimateOnScroll>
      <AnimateOnScroll>
        <FaqCtaSection />
      </AnimateOnScroll>
    </>
  )
}
