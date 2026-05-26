'use client'

import { DunningBanner } from './dunning-banner'
import { TrialBanner } from './trial-banner'

/**
 * Banners persistentes de billing pra mounting no shell do dashboard.
 *
 * Cada banner auto-esconde quando o subscription status não bate. Wrapper
 * existe pra que o consumer monte um único componente em vez de N.
 */
export function BillingBanners() {
  return (
    <div className="mb-4 space-y-2 empty:hidden">
      <DunningBanner />
      <TrialBanner />
    </div>
  )
}
