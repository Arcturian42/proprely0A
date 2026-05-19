import { SUPPORT_EMAIL } from '@/lib/constants'

export const metadata = {
  title: 'Politique de confidentialité — Proprely',
}

const PRIVACY_EMAIL = 'privacy@proprely.fr'

export default function ConfidentialitePage() {
  return (
    <article className="max-w-3xl mx-auto prose prose-slate prose-sm py-8 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold mb-1">Politique de confidentialité</h1>
      <p className="text-xs text-slate-500 mb-6">
        Version 1.0 — applicable en phase de bêta privée. Conforme au RGPD (Règlement
        UE 2016/679). Validation juridique externe recommandée avant ouverture
        commerciale.
      </p>

      <h2 className="text-lg font-semibold mt-6">1. Responsable de traitement</h2>
      <p>
        Le responsable du traitement des données personnelles collectées via Proprely
        (ci-après « Proprely » ou « l&apos;Éditeur ») est la société éditrice du Service.
        Les coordonnées complètes (raison sociale, siège social, SIREN) sont précisées
        dans les{' '}
        <a href="/cgu" className="text-slate-900 underline">
          conditions générales d&apos;utilisation
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold mt-6">2. Délégué à la protection des données (DPO)</h2>
      <p>
        En phase de bêta privée, la nomination d&apos;un DPO n&apos;est pas obligatoire au
        regard des seuils RGPD (volume et nature des données traitées). Un référent
        protection des données est cependant joignable à{' '}
        <a href={`mailto:${PRIVACY_EMAIL}`} className="text-slate-900 underline">
          {PRIVACY_EMAIL}
        </a>{' '}
        pour toute demande relative à la protection des données.
      </p>

      <h2 className="text-lg font-semibold mt-6">3. Données collectées</h2>
      <ul>
        <li>
          <strong>Données d&apos;identification</strong> : nom, prénom, adresse email
          professionnelle, rôle dans l&apos;entreprise.
        </li>
        <li>
          <strong>Données d&apos;entreprise</strong> : raison sociale, SIRET, adresse
          professionnelle, coordonnées.
        </li>
        <li>
          <strong>Données métier saisies</strong> : prospects, clients, sites, missions,
          devis, agents, heures travaillées, protocoles SOP.
        </li>
        <li>
          <strong>Données de connexion</strong> : adresse IP, type de navigateur,
          horodatage des connexions, journaux d&apos;audit (création/modification
          d&apos;enregistrements).
        </li>
        <li>
          <strong>Données d&apos;usage</strong> : événements anonymisés collectés via PostHog
          (clics, pages consultées) à des fins d&apos;amélioration produit.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">4. Finalités du traitement</h2>
      <ul>
        <li>Fourniture du Service et exécution du contrat (Art. 6.1.b RGPD).</li>
        <li>Authentification et sécurisation des accès.</li>
        <li>Support client et assistance technique.</li>
        <li>
          Amélioration du Service et analyse statistique d&apos;usage (intérêt légitime —
          Art. 6.1.f RGPD ; données anonymisées).
        </li>
        <li>Respect des obligations légales (comptabilité, traçabilité, sécurité).</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">5. Bases légales</h2>
      <p>
        Les traitements reposent sur les bases légales suivantes :
      </p>
      <ul>
        <li>
          <strong>Exécution du contrat</strong> (Art. 6.1.b RGPD) — fourniture du Service,
          authentification, support.
        </li>
        <li>
          <strong>Obligation légale</strong> (Art. 6.1.c RGPD) — conservation des données
          de facturation et de connexion.
        </li>
        <li>
          <strong>Intérêt légitime</strong> (Art. 6.1.f RGPD) — sécurité de la plateforme,
          analyses statistiques anonymisées.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">6. Destinataires et sous-traitants</h2>
      <p>
        Les données sont accessibles aux collaborateurs de l&apos;Éditeur ayant besoin d&apos;en
        connaître pour assurer le fonctionnement et le support du Service. L&apos;Éditeur
        recourt aux sous-traitants suivants, tous engagés contractuellement à respecter
        le RGPD :
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> (Allemagne — UE) : hébergement de la base de données
          et de l&apos;authentification.
        </li>
        <li>
          <strong>Vercel</strong> (Union européenne — région Frankfurt) : hébergement
          applicatif.
        </li>
        <li>
          <strong>Resend</strong> : envoi d&apos;emails transactionnels (magic links,
          notifications).
        </li>
        <li>
          <strong>DocuSeal</strong> : signature électronique de devis (sous-traitant
          activé uniquement pour les comptes l&apos;utilisant).
        </li>
        <li>
          <strong>Sentry</strong> : collecte d&apos;erreurs applicatives à des fins de
          diagnostic.
        </li>
        <li>
          <strong>PostHog</strong> (région EU) : analytics produit anonymisé.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">7. Transferts hors Union européenne</h2>
      <p>
        En configuration standard, aucune donnée n&apos;est transférée en dehors de
        l&apos;Espace économique européen. Si un sous-traitant nécessitait un transfert
        hors UE (par exemple support technique), celui-ci serait encadré par des
        clauses contractuelles types (CCT) approuvées par la Commission européenne.
      </p>

      <h2 className="text-lg font-semibold mt-6">8. Durées de conservation</h2>
      <ul>
        <li>
          <strong>Données du Compte actif</strong> : conservées pendant toute la durée
          d&apos;utilisation du Service.
        </li>
        <li>
          <strong>Après résiliation</strong> : effacement ou anonymisation des Données
          Client dans un délai de 30 jours après confirmation, sauf obligation légale
          de conservation.
        </li>
        <li>
          <strong>Données comptables</strong> : conservées 10 ans conformément à
          l&apos;article L.123-22 du Code de commerce.
        </li>
        <li>
          <strong>Journaux de connexion</strong> : 12 mois maximum.
        </li>
        <li>
          <strong>Données d&apos;audit (audit_logs)</strong> : 3 ans après la dernière
          activité du Compte.
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">9. Droits des personnes</h2>
      <p>
        Conformément au RGPD, toute personne concernée dispose des droits suivants :
        accès, rectification, effacement, limitation, opposition, portabilité, ainsi
        que du droit de définir des directives post-mortem. Ces droits peuvent être
        exercés à tout moment en écrivant à{' '}
        <a href={`mailto:${PRIVACY_EMAIL}`} className="text-slate-900 underline">
          {PRIVACY_EMAIL}
        </a>
        . Une réponse est apportée sous un (1) mois, prorogeable de deux (2) mois en
        cas de complexité.
      </p>

      <h2 className="text-lg font-semibold mt-6">10. Cookies et traceurs</h2>
      <p>
        Proprely utilise uniquement les cookies suivants :
      </p>
      <ul>
        <li>
          <strong>Cookies de session</strong> (Supabase Auth) : strictement nécessaires
          au maintien de la session connectée. Exemptés de consentement (Art. 82 LIL).
        </li>
        <li>
          <strong>Cookies de mesure d&apos;audience</strong> (PostHog) : anonymisés et
          configurés pour respecter les recommandations de la CNIL (pas d&apos;identifiant
          persistant croisé entre sites). Exemptés de consentement sous réserve de
          conformité avec la configuration en vigueur.
        </li>
      </ul>
      <p>
        Aucun cookie publicitaire ni traceur tiers n&apos;est déposé. L&apos;Utilisateur peut à
        tout moment configurer son navigateur pour bloquer les cookies, sans impact
        majeur sur le fonctionnement du Service hormis la session.
      </p>

      <h2 className="text-lg font-semibold mt-6">11. Sécurité</h2>
      <p>
        L&apos;Éditeur met en œuvre des mesures techniques et organisationnelles adaptées
        pour protéger les données :
      </p>
      <ul>
        <li>Authentification sans mot de passe (magic link, jetons à durée limitée).</li>
        <li>Chiffrement des communications (TLS 1.2 minimum).</li>
        <li>Isolation multi-tenant par row-level security (PostgreSQL).</li>
        <li>Journal d&apos;audit horodaté des actions critiques.</li>
        <li>Sauvegardes quotidiennes chiffrées hébergées dans l&apos;UE.</li>
        <li>Tests de sécurité et revues de code réguliers.</li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">12. Notification de violation</h2>
      <p>
        En cas de violation de données présentant un risque élevé pour les droits et
        libertés des personnes concernées, l&apos;Éditeur s&apos;engage à notifier la CNIL dans
        un délai de 72 heures et à informer sans délai les owners concernés,
        conformément aux articles 33 et 34 du RGPD.
      </p>

      <h2 className="text-lg font-semibold mt-6">13. Réclamation auprès de la CNIL</h2>
      <p>
        Si l&apos;Utilisateur estime que ses droits ne sont pas respectés, il peut
        introduire une réclamation auprès de la Commission Nationale de l&apos;Informatique
        et des Libertés (CNIL) — 3 Place de Fontenoy, TSA 80715, 75334 Paris Cedex 07 —{' '}
        <a
          href="https://www.cnil.fr/fr/plaintes"
          target="_blank"
          rel="noreferrer"
          className="text-slate-900 underline"
        >
          cnil.fr/plaintes
        </a>
        .
      </p>

      <h2 className="text-lg font-semibold mt-6">14. Modifications de la politique</h2>
      <p>
        Cette politique peut être mise à jour pour refléter des évolutions
        réglementaires ou techniques. Toute modification substantielle sera notifiée
        aux owners par email au moins quinze (15) jours avant son entrée en vigueur.
      </p>

      <h2 className="text-lg font-semibold mt-6">15. Contact</h2>
      <p>
        Questions générales :{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-900 underline">
          {SUPPORT_EMAIL}
        </a>
        .<br />
        Demandes RGPD (exercice de droits, accès, effacement) :{' '}
        <a href={`mailto:${PRIVACY_EMAIL}`} className="text-slate-900 underline">
          {PRIVACY_EMAIL}
        </a>
        .
      </p>
    </article>
  )
}
