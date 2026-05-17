export const metadata = {
  title: 'Politique de confidentialité — Proprely',
}

export default function ConfidentialitePage() {
  return (
    <article className="max-w-3xl mx-auto prose prose-slate prose-sm py-8 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold mb-1">Politique de confidentialité</h1>
      <p className="text-xs text-slate-500 mb-6">Version provisoire — à valider juridiquement (RGPD, CNIL) avant la mise en production.</p>

      <h2 className="text-lg font-semibold mt-6">1. Responsable de traitement</h2>
      <p>
        Le responsable du traitement des données personnelles collectées via Proprely est
        l'éditeur de la plateforme (coordonnées à compléter avant production).
      </p>

      <h2 className="text-lg font-semibold mt-6">2. Données collectées</h2>
      <ul>
        <li>Données d'identification : nom, prénom, email professionnel.</li>
        <li>Données d'entreprise : raison sociale, SIRET, adresse, contact.</li>
        <li>Données opérationnelles : prospects, clients, sites, missions, agents, heures.</li>
        <li>Données techniques : adresse IP, navigateur, journaux de connexion.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">3. Finalités du traitement</h2>
      <ul>
        <li>Fourniture du Service et exécution du contrat.</li>
        <li>Authentification et sécurisation des accès.</li>
        <li>Support client et amélioration de la plateforme.</li>
        <li>Respect des obligations légales (comptabilité, traçabilité).</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">4. Base légale</h2>
      <p>
        Les traitements reposent principalement sur l'exécution du contrat conclu avec
        l'utilisateur, ainsi que sur les obligations légales applicables.
      </p>

      <h2 className="text-lg font-semibold mt-6">5. Hébergement et sous-traitants</h2>
      <p>
        Les données sont hébergées chez des prestataires conformes au RGPD et stockées
        dans l'Union européenne (Supabase, Vercel — région EU). Aucune donnée n'est
        transférée hors UE sans clause de protection adéquate.
      </p>

      <h2 className="text-lg font-semibold mt-6">6. Durée de conservation</h2>
      <p>
        Les données sont conservées pendant la durée d'utilisation du Service, puis
        archivées conformément aux obligations légales applicables (durée maximale
        recommandée : 5 ans après cessation d'usage).
      </p>

      <h2 className="text-lg font-semibold mt-6">7. Droits des personnes</h2>
      <p>
        Conformément au RGPD, chaque utilisateur dispose des droits d'accès, de
        rectification, d'effacement, de limitation, d'opposition et de portabilité.
        Ces droits peuvent être exercés par email à l'adresse indiquée par
        l'éditeur (à compléter).
      </p>

      <h2 className="text-lg font-semibold mt-6">8. Sécurité</h2>
      <p>
        L'accès aux données est protégé par authentification (lien magique), chiffrement
        des communications (TLS), isolation par entreprise (row-level security), journal
        d'audit et politique de mots de passe robuste pour les comptes administrateurs.
      </p>

      <p className="text-xs text-slate-500 mt-8 italic">
        Ce document est un brouillon. Il doit être complété par un DPO ou un avocat
        spécialisé avant la mise en production. Désigner formellement un DPO si nécessaire.
      </p>
    </article>
  )
}
