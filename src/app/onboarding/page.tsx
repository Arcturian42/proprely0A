import { redirect } from 'next/navigation'

export default function OnboardingIndex() {
  // Le middleware redirige déjà selon la prochaine étape incomplète,
  // mais on protège ce fallback au cas où on arrive ici directement.
  redirect('/onboarding/2')
}
