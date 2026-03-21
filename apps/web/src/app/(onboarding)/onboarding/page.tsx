import { Suspense } from 'react';
import { OnboardingContent } from './content';

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
