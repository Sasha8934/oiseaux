// Suivi : calendrier des sessions, révisions prévues, et cartes à travailler en priorité.

import { h } from '../outils.js';
import { MODES, cartesDuMode, toutesLesCartes, chargerSavoirs } from '../donnees.js';
import {
  bilan, sessions, sessionsParJour, serieEnCours, revisionsPrevues, resultatTest, cleJour,
} from '../progression.js';
import { calendrierMois, legendeCalendrier } from '../calendrier.js';
import { CIBLES } from './flashcards.js';
import { carteBilan, explicationBilan } from './accueil.js';

const NOMS_TYPES = { flashcards: 'Flashcards', quiz: 'Quiz', test: 'Test' };

export function vueSuivi() {
  const toutes = sessions();
  const cartesTravaillees = toutes.reduce((somme, s) => somme + s.questions, 0);
  const parJour = sessionsParJour();
  const prevues = revisionsPrevues(toutesLesCartes());

  let affiche = new Date();
  let jourChoisi = cleJour(new Date());
  const zoneCalendrier = h('div', {});
  const zoneJour = h('div', { class: 'detail-jour', 'aria-live': 'polite' });

  const dessiner = () => {
    const titreMois = affiche.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    zoneCalendrier.replaceChildren(
      h('div', { class: 'navigation-mois' },
        h('button', { type: 'button', class: 'bouton-secondaire', 'aria-label': 'Mois précédent', onclick: () => changerMois(-1) }, '‹'),
        h('strong', {}, titreMois.charAt(0).toUpperCase() + titreMois.slice(1)),
        h('button', { type: 'button', class: 'bouton-secondaire', 'aria-label': 'Mois suivant', onclick: () => changerMois(1) }, '›')),
      calendrierMois(affiche.getFullYear(), affiche.getMonth(), {
        sessionsParJour: parJour,
        prevues,
        choisi: jourChoisi,
        surChoix: (cle) => { jourChoisi = cle; dessiner(); },
      }),
      legendeCalendrier());
    zoneJour.replaceChildren(...detailJour(jourChoisi, parJour.get(jourChoisi) ?? [], prevues.get(jourChoisi) ?? 0));
  };
  const changerMois = (decalage) => {
    affiche = new Date(affiche.getFullYear(), affiche.getMonth() + decalage, 1);
    dessiner();
  };
  dessiner();

  const zoneTests = h('div', { class: 'grille-bilans' });
  chargerSavoirs().then((themes) => zoneTests.replaceChildren(...themes.map((theme) => {
    const resultat = resultatTest(theme.id);
    return h('a', { class: 'choix', href: `#/savoirs/${theme.id}` },
      h('strong', {}, theme.titre),
      h('span', { class: 'texte-doux' }, resultat
        ? `Meilleur score : ${resultat.meilleur} / ${resultat.total} · dernier : ${resultat.dernier} / ${resultat.total}`
        : 'Test pas encore fait'));
  })));

  return h('section', { class: 'page' },
    h('h1', {}, 'Mon suivi'),

    h('div', { class: 'chiffres' },
      chiffre(serieEnCours(), 'jour(s) d\'affilée'),
      chiffre(toutes.length, 'sessions'),
      chiffre(cartesTravaillees, 'réponses données')),

    h('h2', {}, 'À travailler en priorité'),
    h('p', { class: 'texte-doux' }, 'Pour retenir sur le long terme : revoir les cartes au bon moment, insister sur celles qui résistent, et ne pas laisser les autres de côté trop longtemps.'),
    h('div', { class: 'grille-choix' }, Object.entries(CIBLES).map(([id, cible]) => {
      const nombre = toutesLesCartes().filter(cible.filtre).length;
      return h('a', { class: `choix${nombre ? ' a-faire' : ''}`, href: `#/flashcards/cible/${id}` },
        h('strong', {}, cible.titre),
        h('span', { class: 'texte-doux' }, nombre ? `${nombre} carte(s) · lancer une session` : 'Rien pour le moment'));
    })),

    h('h2', {}, 'Calendrier'),
    zoneCalendrier,
    zoneJour,

    h('h2', {}, 'Progression par paquet'),
    h('div', { class: 'grille-bilans' }, Object.keys(MODES).map((mode) => carteBilan({ mode, ...bilan(cartesDuMode(mode)) }))),
    explicationBilan(),

    h('h2', {}, 'Tests de connaissances'),
    zoneTests);
}

function chiffre(valeur, libelle) {
  return h('div', { class: 'chiffre' }, h('strong', {}, valeur), h('span', {}, libelle));
}

function detailJour(cle, sessionsDuJour, nbPrevues) {
  const date = new Date(`${cle}T12:00:00`);
  const titre = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const futur = cle > cleJour(new Date());
  return [
    h('h3', {}, titre.charAt(0).toUpperCase() + titre.slice(1)),
    sessionsDuJour.length
      ? h('ul', { class: 'liste-sessions' }, sessionsDuJour.map((s) => h('li', {},
        h('span', { class: 'heure' }, new Date(s.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })),
        h('span', {}, `${NOMS_TYPES[s.type] ?? s.type} · ${s.titre}`),
        h('span', { class: 'score' }, `${s.reussites} / ${s.questions}`))))
      : h('p', { class: 'texte-doux' }, futur ? 'Pas de session (jour à venir).' : 'Aucune session ce jour-là.'),
    nbPrevues && cle >= cleJour(new Date())
      ? h('p', {}, `${nbPrevues} carte(s) ${futur ? 'reviendront' : 'sont à revoir'} ce jour-là.`)
      : null,
  ].filter(Boolean);
}
