// Flashcards : le recto montre le chant, le cri ou la photo ; le verso donne la réponse.
// On note soi-même si on savait, et la carte reviendra plus ou moins vite.

import { h, credit, melanger } from '../outils.js';
import { MODES, cartesDuMode, sonDe, toutesLesCartes } from '../donnees.js';
import {
  bilan, choisirCartes, enregistrerReponse, estARevoir, estDifficile, estOubliee,
  nouvelleSession, noterDansSession, suiviDe, JOURS_OUBLI,
} from '../progression.js';
import { arreterSon, lecteurSon } from '../lecteur.js';
import { resumeReproduction } from './fiches.js';

const CARTES_PAR_SESSION = 20;

/** Sessions ciblées, tous modes confondus (proposées par l'accueil et le suivi). */
export const CIBLES = {
  'a-revoir': {
    titre: 'À revoir aujourd\'hui',
    filtre: (carte) => estARevoir(carte.id),
    vide: 'Aucune carte à revoir aujourd\'hui. Bravo !',
  },
  difficiles: {
    titre: 'Cartes difficiles',
    filtre: (carte) => estDifficile(carte.id),
    vide: 'Aucune carte difficile pour le moment.',
  },
  oubliees: {
    titre: 'Pas revues depuis longtemps',
    filtre: (carte) => estOubliee(carte.id),
    vide: `Aucune carte laissée de côté depuis plus de ${JOURS_OUBLI} jours.`,
  },
};

/** Choix du paquet de cartes. */
export function vueChoixFlashcards() {
  return h('section', { class: 'page' },
    h('h1', {}, 'Flashcards'),
    h('p', { class: 'intro' }, 'Écoutez ou observez, retournez la carte, puis dites honnêtement si vous saviez.'),
    h('div', { class: 'grille-choix' }, Object.keys(MODES).map((mode) => {
      const b = bilan(cartesDuMode(mode));
      return h('a', { class: 'choix', href: `#/flashcards/${mode}` },
        h('strong', {}, MODES[mode].titre),
        h('span', { class: 'texte-doux' }, `${b.aRevoir} à revoir · ${b.nouvelles} nouvelles`));
    })),
    h('h2', {}, 'Sessions ciblées'),
    h('div', { class: 'grille-choix' }, Object.entries(CIBLES).map(([id, cible]) =>
      h('a', { class: 'choix', href: `#/flashcards/cible/${id}` },
        h('strong', {}, cible.titre),
        h('span', { class: 'texte-doux' }, `${toutesLesCartes().filter(cible.filtre).length} cartes`)))));
}

/** Session dans un paquet : cartes à revoir puis nouvelles. */
export function vueSessionFlashcards(mode, toutReviser = false) {
  const cartes = cartesDuMode(mode);
  const file = toutReviser
    ? melanger(cartes).slice(0, CARTES_PAR_SESSION)
    : choisirCartes(cartes, CARTES_PAR_SESSION);
  return session({
    titre: MODES[mode].titre,
    file,
    vide: 'Rien à revoir pour le moment : toutes les cartes sont programmées pour plus tard. Bravo !',
    relancer: () => vueSessionFlashcards(mode),
    reviserQuandMeme: () => vueSessionFlashcards(mode, true),
  });
}

/** Session ciblée : à revoir, difficiles ou oubliées. */
export function vueSessionCiblee(idCible) {
  const cible = CIBLES[idCible] ?? CIBLES['a-revoir'];
  const file = melanger(toutesLesCartes().filter(cible.filtre))
    // les plus en retard d'abord
    .sort((a, b) => (suiviDe(a.id)?.prochaine ?? 0) - (suiviDe(b.id)?.prochaine ?? 0))
    .slice(0, CARTES_PAR_SESSION);
  return session({ titre: cible.titre, file, vide: cible.vide, relancer: () => vueSessionCiblee(idCible) });
}

function session({ titre, file, vide, relancer, reviserQuandMeme }) {
  const page = h('section', { class: 'page' });

  if (file.length === 0) {
    page.append(
      h('h1', {}, titre),
      h('p', {}, vide),
      h('div', { class: 'actions' },
        reviserQuandMeme
          ? h('button', { type: 'button', class: 'bouton', onclick: () => page.replaceWith(reviserQuandMeme()) }, 'Réviser quand même')
          : null,
        h('a', { class: 'bouton bouton-clair', href: '#/flashcards' }, 'Autres paquets')));
    return page;
  }

  const historique = nouvelleSession('flashcards', titre);
  const ratees = new Set(); // une carte ratée revient une fois en fin de session

  const afficher = () => {
    arreterSon(); // le son de la carte précédente ne doit pas continuer
    page.replaceChildren();
    if (file.length === 0) return afficherFin();
    const carte = file[0];
    page.append(
      h('p', { class: 'compteur' }, `${titre} · encore ${file.length} carte${file.length > 1 ? 's' : ''}`),
      carteFlash(carte, (savait) => {
        enregistrerReponse(carte.id, savait);
        noterDansSession(historique, savait);
        file.shift();
        if (!savait && !ratees.has(carte.id)) {
          ratees.add(carte.id);
          file.push(carte);
        }
        afficher();
      }));
  };

  const afficherFin = () => {
    page.append(
      h('h1', {}, 'Session terminée'),
      h('p', { class: 'grand-chiffre' }, `${historique.reussites} / ${historique.questions}`),
      h('p', {}, 'réponses connues'),
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'bouton', onclick: () => page.replaceWith(relancer()) }, 'Encore une session'),
        h('a', { class: 'bouton bouton-clair', href: '#/suivi' }, 'Voir mon suivi')));
  };

  afficher();
  return page;
}

function carteFlash({ espece, mode }, repondre) {
  const son = mode === 'photo' ? null : sonDe(espece, mode);
  const verso = h('div', { class: 'verso' },
    mode !== 'photo' && espece.photo
      ? h('img', { class: 'photo', src: espece.photo.fichier, alt: espece.nom }) : null,
    h('h2', { class: 'nom' }, espece.nom),
    h('p', { class: 'nom-sci' }, espece.sci),
    h('p', { class: 'texte-doux' }, `${espece.en} · ${espece.famille}`),
    mode === 'photo' ? credit(espece.photo) : credit(son),
    resumeReproduction(espece),
    // Pour une photo, on peut écouter le chant au verso
    mode === 'photo' && sonDe(espece, 'chant') ? lecteurSon(sonDe(espece, 'chant'), { credits: false }) : null,
    h('a', { class: 'lien', href: `#/fiches/${espece.id}` }, 'Voir la fiche complète'),
    h('div', { class: 'actions reponse' },
      h('button', { type: 'button', class: 'bouton bouton-rate', onclick: () => repondre(false) }, 'Pas encore'),
      h('button', { type: 'button', class: 'bouton bouton-reussi', onclick: () => repondre(true) }, 'Je savais')));
  verso.hidden = true;

  const boutonRetourner = h('button', { type: 'button', class: 'bouton bouton-large' }, 'Retourner la carte');
  boutonRetourner.addEventListener('click', () => {
    verso.hidden = false;
    boutonRetourner.remove();
  });

  return h('article', { class: 'flashcard' },
    h('p', { class: 'question' }, MODES[mode].question),
    son
      ? lecteurSon(son, { lectureAuto: true, credits: false })
      : h('img', { class: 'photo', src: espece.photo.fichier, alt: 'Photo à identifier' }),
    boutonRetourner,
    verso);
}
