// Page d'accueil : ce qu'il y a à réviser aujourd'hui, aperçu du calendrier et accès rapides.

import { h } from '../outils.js';
import { MODES, cartesDuMode, toutesLesCartes, toutesLesEspeces } from '../donnees.js';
import { bilan, sessionsParJour, revisionsPrevues, serieEnCours, BOITE_MAITRISEE } from '../progression.js';
import { apercuSemaines } from '../calendrier.js';

export function vueAccueil() {
  const general = bilan(toutesLesCartes());
  const serie = serieEnCours();

  // La carte « à revoir » mène directement à la session correspondante
  const resume = general.aRevoir > 0
    ? h('a', { class: 'carte-resume cliquable', href: '#/flashcards/cible/a-revoir' },
      h('p', { class: 'grand-chiffre' }, general.aRevoir),
      h('p', {}, general.aRevoir === 1 ? 'carte à revoir aujourd\'hui' : 'cartes à revoir aujourd\'hui'),
      h('p', { class: 'lien' }, 'Commencer la révision →'))
    : h('a', { class: 'carte-resume cliquable', href: '#/flashcards' },
      h('p', { class: 'grand-chiffre' }, '0'),
      h('p', {}, 'carte à revoir aujourd\'hui'),
      h('p', { class: 'lien' }, `Découvrir des nouvelles cartes (${general.nouvelles}) →`));

  return h('section', { class: 'page' },
    h('h1', {}, 'Bonjour !'),
    h('p', { class: 'intro' },
      `${toutesLesEspeces().length} espèces à apprendre, à la vue et à l'oreille.`),

    resume,

    h('div', { class: 'actions' },
      h('a', { class: 'bouton', href: '#/flashcards' }, 'Flashcards'),
      h('a', { class: 'bouton', href: '#/quiz' }, 'Quiz'),
      general.difficiles
        ? h('a', { class: 'bouton bouton-clair', href: '#/flashcards/cible/difficiles' }, `Cartes difficiles (${general.difficiles})`)
        : null),

    h('div', { class: 'entete-section' },
      h('h2', {}, 'Mes dernières semaines'),
      h('a', { class: 'lien', href: '#/suivi' }, 'Voir le suivi')),
    h('a', { class: 'apercu', href: '#/suivi', 'aria-label': 'Ouvrir le calendrier de suivi' },
      apercuSemaines(5, { sessionsParJour: sessionsParJour(), prevues: revisionsPrevues(toutesLesCartes()) }),
      h('p', { class: 'texte-doux' }, serie
        ? `${serie} jour${serie > 1 ? 's' : ''} d'affilée, continuez !`
        : 'Pas encore de session aujourd\'hui.')),

    h('h2', {}, 'Ma progression'),
    h('div', { class: 'grille-bilans' }, Object.keys(MODES).map((mode) => carteBilan({ mode, ...bilan(cartesDuMode(mode)) }))),
    explicationBilan(),

    conseilInstallation());
}

/** Bilan d'un paquet : barre « maîtrisées » + « en cours », avec les chiffres. */
export function carteBilan({ mode, total, nouvelles, enCours, maitrisees }) {
  const part = (n) => (total ? (n / total) * 100 : 0);
  return h('div', { class: 'bilan' },
    h('h3', {}, MODES[mode].titre),
    h('div', {
      class: 'jauge', role: 'img',
      'aria-label': `${maitrisees} maîtrisées, ${enCours} en cours, ${nouvelles} nouvelles sur ${total}`,
    },
    h('span', { class: 'maitrisees', style: `width:${part(maitrisees)}%` }),
    h('span', { class: 'en-cours', style: `width:${part(enCours)}%` })),
    h('ul', { class: 'legende-bilan' },
      h('li', {}, h('i', { class: 'pastille maitrisees' }), `${maitrisees} maîtrisée${maitrisees > 1 ? 's' : ''}`),
      h('li', {}, h('i', { class: 'pastille en-cours' }), `${enCours} en cours`),
      h('li', {}, h('i', { class: 'pastille' }), `${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''}`)));
}

export function explicationBilan() {
  return h('details', { class: 'explication' },
    h('summary', {}, 'Comment est calculée la progression ?'),
    h('p', {}, 'Une carte est « en cours » dès qu\'on y a répondu une fois. Elle devient « maîtrisée » après '
      + `${BOITE_MAITRISEE} bonnes réponses de suite, espacées dans le temps : la carte revient après 1 jour, puis 3, puis 7. `
      + 'Il faut donc au moins 11 jours pour maîtriser une carte. C\'est voulu : c\'est l\'espacement qui ancre la mémoire à long terme.'),
    h('p', {}, 'Une erreur renvoie la carte au début, et elle revient le jour même.'));
}

/** Sur iPhone et iPad, explique comment ajouter l'application à l'écran d'accueil. */
function conseilInstallation() {
  const estAppleMobile = /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const dejaInstallee = window.navigator.standalone === true
    || window.matchMedia('(display-mode: standalone)').matches;
  if (!estAppleMobile || dejaInstallee) return null;

  return h('div', { class: 'encart' },
    h('h3', {}, 'Installer l\'application'),
    h('p', {}, 'Dans Safari, touchez le bouton Partager, puis « Sur l\'écran d\'accueil ». '
      + 'L\'application s\'ouvrira en plein écran et votre progression sera mieux conservée.'));
}
