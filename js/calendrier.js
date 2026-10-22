// Calendriers : le mois complet (onglet Suivi) et l'aperçu des dernières semaines (accueil).
// Jours passés : colorés selon le nombre de cartes travaillées.
// Jours à venir : un petit chiffre indique les révisions prévues.

import { h } from './outils.js';
import { cleJour } from './progression.js';

const JOURS_SEMAINE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Intensité de 0 à 4 selon le nombre de cartes travaillées dans la journée. */
function niveau(sessionsDuJour) {
  const cartes = (sessionsDuJour ?? []).reduce((somme, s) => somme + s.questions, 0);
  if (cartes === 0) return 0;
  if (cartes < 10) return 1;
  if (cartes < 25) return 2;
  if (cartes < 50) return 3;
  return 4;
}

/** Lundi = 0 … dimanche = 6 */
function jourSemaine(date) {
  return (date.getDay() + 6) % 7;
}

function caseJour(date, { sessionsParJour, prevues, choisi, surChoix, compact }) {
  const cle = cleJour(date);
  const aujourdhui = cle === cleJour(new Date());
  const futur = date > new Date() && !aujourdhui;
  const nbPrevues = prevues?.get(cle) ?? 0;
  const sessions = sessionsParJour.get(cle) ?? [];

  const description = [
    date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    sessions.length ? `${sessions.length} session(s)` : null,
    nbPrevues && (futur || aujourdhui) ? `${nbPrevues} carte(s) à revoir` : null,
  ].filter(Boolean).join(', ');

  const classes = ['jour', `niveau-${niveau(sessions)}`];
  if (aujourdhui) classes.push('aujourdhui');
  if (choisi === cle) classes.push('choisi');

  return h(surChoix ? 'button' : 'span', {
    type: surChoix ? 'button' : null,
    class: classes.join(' '),
    title: description,
    'aria-label': description,
    onclick: surChoix ? () => surChoix(cle) : null,
  },
  compact ? null : h('span', { class: 'numero' }, date.getDate()),
  nbPrevues && (futur || aujourdhui) && !compact ? h('span', { class: 'prevues' }, nbPrevues) : null);
}

/** Calendrier d'un mois (mois de 0 à 11). */
export function calendrierMois(annee, mois, options) {
  const premier = new Date(annee, mois, 1);
  const nbJours = new Date(annee, mois + 1, 0).getDate();
  const cases = [];
  for (let i = 0; i < jourSemaine(premier); i++) cases.push(h('span', { class: 'jour vide' }));
  for (let jour = 1; jour <= nbJours; jour++) cases.push(caseJour(new Date(annee, mois, jour), options));

  return h('div', { class: 'calendrier' },
    JOURS_SEMAINE.map((j) => h('span', { class: 'entete-jour' }, j)),
    cases);
}

/** Aperçu compact : les dernières semaines jusqu'à la semaine en cours. */
export function apercuSemaines(nbSemaines, options) {
  const debut = new Date();
  debut.setHours(12, 0, 0, 0);
  debut.setDate(debut.getDate() - jourSemaine(debut) - 7 * (nbSemaines - 1));
  const cases = [];
  for (let i = 0; i < nbSemaines * 7; i++) {
    const date = new Date(debut);
    date.setDate(debut.getDate() + i);
    cases.push(caseJour(date, { ...options, compact: true }));
  }
  return h('div', { class: 'calendrier compact' },
    JOURS_SEMAINE.map((j) => h('span', { class: 'entete-jour' }, j)),
    cases);
}

export function legendeCalendrier() {
  return h('div', { class: 'legende' },
    h('span', {}, 'Moins'),
    [0, 1, 2, 3, 4].map((n) => h('span', { class: `jour niveau-${n}`, 'aria-hidden': 'true' })),
    h('span', {}, 'Plus de cartes travaillées'));
}
