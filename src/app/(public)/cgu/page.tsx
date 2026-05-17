export const metadata = {
  title: 'Conditions générales — Proprely',
}

export default function CGUPage() {
  return (
    <article className="max-w-3xl mx-auto prose prose-slate prose-sm py-8 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold mb-1">Conditions générales d'utilisation</h1>
      <p className="text-xs text-slate-500 mb-6">Version provisoire — à valider juridiquement avant la mise en production.</p>

      <h2 className="text-lg font-semibold mt-6">1. Objet</h2>
      <p>
        Les présentes conditions générales d'utilisation régissent l'accès et l'utilisation
        de la plateforme Proprely, un logiciel de gestion destiné aux entreprises de propreté
        et de nettoyage (ci-après « le Service »).
      </p>

      <h2 className="text-lg font-semibold mt-6">2. Acceptation</h2>
      <p>
        L'utilisation du Service implique l'acceptation pleine et entière des présentes
        conditions. L'utilisateur reconnaît avoir pris connaissance des conditions avant
        de créer un compte.
      </p>

      <h2 className="text-lg font-semibold mt-6">3. Inscription et compte</h2>
      <p>
        L'inscription nécessite une adresse email valide. Le propriétaire du compte est
        responsable de la confidentialité de son accès et de toutes les actions effectuées
        depuis son compte ou ceux des collaborateurs qu'il a invités.
      </p>

      <h2 className="text-lg font-semibold mt-6">4. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans la
        <a href="/confidentialite" className="text-slate-900 underline mx-1">politique de confidentialité</a>.
      </p>

      <h2 className="text-lg font-semibold mt-6">5. Responsabilités</h2>
      <p>
        L'éditeur s'efforce d'assurer la disponibilité du Service mais ne saurait être tenu
        responsable des interruptions, pertes de données ou dommages indirects résultant
        de son utilisation, dans les limites permises par la loi française.
      </p>

      <h2 className="text-lg font-semibold mt-6">6. Modifications</h2>
      <p>
        L'éditeur se réserve le droit de modifier les présentes conditions à tout moment.
        Les utilisateurs seront informés des modifications substantielles par email.
      </p>

      <h2 className="text-lg font-semibold mt-6">7. Droit applicable</h2>
      <p>
        Les présentes conditions sont soumises au droit français. Tout litige relatif à
        leur interprétation ou exécution relève de la compétence exclusive des tribunaux
        français.
      </p>

      <p className="text-xs text-slate-500 mt-8 italic">
        Ce document est un brouillon. Il doit être complété et validé par un avocat avant
        la mise en production pour usage commercial.
      </p>
    </article>
  )
}
