import { SUPPORT_EMAIL } from '@/lib/constants'

export const metadata = {
  title: 'Conditions générales — Proprely',
}

export default function CGUPage() {
  return (
    <article className="max-w-3xl mx-auto prose prose-slate prose-sm py-8 bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
      <h1 className="text-2xl font-semibold mb-1">Conditions générales d&apos;utilisation</h1>
      <p className="text-xs text-slate-500 mb-6">
        Version 1.0 — applicable en phase de bêta privée. Ce document est rédigé pour
        validation juridique externe avant ouverture commerciale.
      </p>

      <h2 className="text-lg font-semibold mt-6">1. Préambule</h2>
      <p>
        Les présentes conditions générales d&apos;utilisation (« CGU ») sont conclues entre
        Proprely (ci-après « l&apos;Éditeur ») et tout utilisateur de la plateforme
        Proprely (ci-après « l&apos;Utilisateur »). Les coordonnées de l&apos;Éditeur figurent
        à l&apos;article 13 (Contact).
      </p>

      <h2 className="text-lg font-semibold mt-6">2. Objet</h2>
      <p>
        L&apos;Éditeur met à disposition de l&apos;Utilisateur un logiciel en mode SaaS
        (Software-as-a-Service) destiné aux sociétés de propreté et de nettoyage,
        permettant la gestion des prospects, devis, missions, plannings, agents et
        heures de travail (ci-après « le Service »). Le Service est accessible depuis
        l&apos;adresse indiquée par l&apos;Éditeur, après création d&apos;un compte.
      </p>

      <h2 className="text-lg font-semibold mt-6">3. Définitions</h2>
      <ul>
        <li>
          <strong>Compte</strong> : espace personnel rattaché à une entreprise, créé par un
          owner et accessible à ses collaborateurs invités.
        </li>
        <li>
          <strong>Owner</strong> : créateur du Compte, responsable contractuel vis-à-vis de
          l&apos;Éditeur. Un seul owner par entreprise.
        </li>
        <li>
          <strong>Siège</strong> : place utilisateur dans un Compte. La bêta privée est limitée à
          1 owner + 5 sièges collaborateurs (manager, supervisor, agent).
        </li>
        <li>
          <strong>Données Client</strong> : ensemble des données saisies ou importées par
          l&apos;Utilisateur dans le Service (clients, prospects, missions, etc.).
        </li>
      </ul>

      <h2 className="text-lg font-semibold mt-6">4. Inscription et compte</h2>
      <p>
        L&apos;inscription au Service requiert la fourniture d&apos;une adresse email
        professionnelle valide. L&apos;authentification s&apos;effectue via un lien magique
        (sans mot de passe). L&apos;owner est seul responsable de la confidentialité de
        son accès et de la véracité des informations communiquées. L&apos;owner s&apos;engage
        à invalider sans délai tout accès collaborateur qui ne devrait plus être actif.
      </p>

      <h2 className="text-lg font-semibold mt-6">5. Tarification et facturation</h2>
      <p>
        Le Service est mis à disposition gratuitement pendant toute la durée de la
        bêta privée. La mise en place d&apos;une tarification commerciale fera l&apos;objet
        d&apos;une notification préalable par email au minimum 30 jours avant son entrée
        en vigueur. L&apos;Utilisateur reste libre de résilier son Compte à cette
        occasion sans coût.
      </p>

      <h2 className="text-lg font-semibold mt-6">6. Données Client et confidentialité</h2>
      <p>
        L&apos;Utilisateur reste seul propriétaire des Données Client qu&apos;il saisit. L&apos;Éditeur
        agit en qualité de sous-traitant au sens du Règlement Général sur la Protection
        des Données (Article 28 du RGPD). Les modalités précises de traitement,
        finalités, durées de conservation et sous-traitants sont décrites dans la{' '}
        <a href="/confidentialite" className="text-slate-900 underline">
          politique de confidentialité
        </a>
        , qui fait partie intégrante des CGU.
      </p>

      <h2 className="text-lg font-semibold mt-6">7. Disponibilité du Service</h2>
      <p>
        L&apos;Éditeur met en œuvre les moyens raisonnables pour assurer la disponibilité
        du Service. En phase de bêta privée, aucun engagement contractuel de niveau de
        service (SLA) n&apos;est consenti. Des interruptions liées à la maintenance, au
        développement ou à des incidents techniques peuvent survenir. L&apos;Éditeur
        informera les owners par email de toute interruption planifiée significative.
      </p>

      <h2 className="text-lg font-semibold mt-6">8. Limitation de responsabilité</h2>
      <p>
        L&apos;Éditeur ne peut être tenu pour responsable que des dommages directs et
        prouvés résultant d&apos;une faute caractérisée de sa part. Sa responsabilité
        totale, tous chefs de préjudice confondus, est plafonnée au montant des sommes
        effectivement payées par l&apos;Utilisateur au titre du Service pendant les douze
        (12) mois précédant le fait générateur, sans pouvoir excéder ce montant.
        L&apos;Éditeur décline toute responsabilité pour les dommages indirects (perte
        d&apos;exploitation, manque à gagner, atteinte à l&apos;image) et pour les pertes de
        données imputables à l&apos;Utilisateur ou à un tiers.
      </p>

      <h2 className="text-lg font-semibold mt-6">9. Résiliation</h2>
      <p>
        L&apos;Utilisateur peut résilier son Compte à tout moment en envoyant une demande à{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-900 underline">
          {SUPPORT_EMAIL}
        </a>
        . Sur demande explicite, l&apos;Éditeur fournit dans un délai de trente (30) jours un
        export des Données Client au format CSV/JSON, puis procède à l&apos;effacement ou
        l&apos;anonymisation des données conformément à la politique de conservation.
      </p>

      <h2 className="text-lg font-semibold mt-6">10. Propriété intellectuelle</h2>
      <p>
        L&apos;Éditeur conserve l&apos;intégralité des droits de propriété intellectuelle sur le
        Service, son code, son design et sa marque. L&apos;Utilisateur dispose d&apos;un droit
        d&apos;usage personnel, non-exclusif et non-transférable, limité à la durée du
        Compte. Aucune reproduction, décompilation ou rétro-ingénierie n&apos;est autorisée.
      </p>

      <h2 className="text-lg font-semibold mt-6">11. Modifications des CGU</h2>
      <p>
        L&apos;Éditeur se réserve le droit de modifier les présentes CGU. Toute modification
        substantielle sera notifiée par email au moins quinze (15) jours avant son
        entrée en vigueur. La poursuite de l&apos;utilisation du Service après ce délai
        vaut acceptation des nouvelles CGU.
      </p>

      <h2 className="text-lg font-semibold mt-6">12. Droit applicable et juridiction</h2>
      <p>
        Les présentes CGU sont régies par le droit français. À défaut de résolution
        amiable, tout litige sera porté devant les tribunaux compétents du ressort du
        siège de l&apos;Éditeur, sauf disposition légale impérative contraire.
      </p>

      <h2 className="text-lg font-semibold mt-6">13. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU, contacter l&apos;Éditeur à{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-slate-900 underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>

      <hr className="my-6 border-slate-200" />

      <h2 className="text-lg font-semibold mt-6">Informations légales de l&apos;Éditeur</h2>
      <p className="text-xs text-slate-500">
        Raison sociale, forme juridique, capital, RCS, SIREN, siège social et nom du
        directeur de la publication : <em>à compléter par l&apos;Éditeur avant ouverture
        commerciale</em>. Ces mentions sont rendues obligatoires par les articles 6-III et
        19 de la LCEN (Loi pour la confiance dans l&apos;économie numérique).
      </p>
    </article>
  )
}
