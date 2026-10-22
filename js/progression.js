// Suivi de la progression avec la méthode des boîtes de Leitner (répétition espacée).
//
// Chaque carte est dans une boîte de 0 à 5. Bonne réponse : la carte monte d'une boîte
// et revient plus tard. Erreur : retour en boîte 0, la carte revient tout de suite.
// L'historique des sessions sert au calendrier de l'onglet Suivi.
// Tout est enregistré sur l'appareil (localStorage).

import { melanger } from './outils.js';

const CLE = 'oiseaux.progression.v1';
export const JOUR = 24 * 60 * 60 * 1000;

/** Délai avant de revoir une carte, en jours, selon sa boîte. */
const INTERVALLES_JOURS = [0, 1, 3, 7, 14, 30];
export const BOITE_MAITRISEE = 4;

/** Au-delà de ce nombre de jours sans être revue, une carte est considérée comme « oubliée ». */
export const JOURS_OUBLI = 14;

let etat = charger();

function etatVide() {
  return { version: 1, cartes: {}, sessions: [], tests: {} };
}

function charger() {
  try {
    const texte = localStorage.getItem(CLE);
    return texte ? { ...etatVide(), ...JSON.parse(texte) } : etatVide();
  } catch {
    return etatVide(); // navigation privée ou stockage bloqué
  }
}

function sauver() {
  try {
    localStorage.setItem(CLE, JSON.stringify(etat));
  } catch {
    // stockage indisponible : la progression ne dure que le temps de la session
  }
}

// --- Cartes ----------------------------------------------------------------------

export function suiviDe(idCarte) {
  return etat.cartes[idCarte] ?? null;
}

export function enregistrerReponse(idCarte, reussi) {
  const suivi = etat.cartes[idCarte] ?? { boite: 0, vues: 0, reussites: 0, echecs: 0 };
  suivi.vues += 1;
  if (reussi) {
    suivi.reussites += 1;
    suivi.boite = Math.min(suivi.boite + 1, INTERVALLES_JOURS.length - 1);
  } else {
    suivi.echecs = (suivi.echecs ?? 0) + 1;
    suivi.boite = 0;
  }
  suivi.derniere = Date.now();
  suivi.prochaine = Date.now() + INTERVALLES_JOURS[suivi.boite] * JOUR;
  etat.cartes[idCarte] = suivi;
  sauver();
}

export function estARevoir(idCarte) {
  const suivi = suiviDe(idCarte);
  return suivi !== null && suivi.prochaine <= Date.now();
}

/** Cartes qui résistent : ratée la dernière fois, ou moins de 60 % de réussite sur au moins 3 réponses. */
export function estDifficile(idCarte) {
  const suivi = suiviDe(idCarte);
  if (!suivi) return false;
  return suivi.boite === 0 || (suivi.vues >= 3 && suivi.reussites / suivi.vues < 0.6);
}

/** Cartes déjà vues mais pas revues depuis longtemps. */
export function estOubliee(idCarte) {
  const suivi = suiviDe(idCarte);
  if (!suivi) return false;
  return Date.now() - (suivi.derniere ?? suivi.prochaine) > JOURS_OUBLI * JOUR;
}

/**
 * Choisit les cartes d'une session : d'abord celles à revoir (les plus en retard
 * en premier), puis des nouvelles cartes jamais vues.
 */
export function choisirCartes(cartes, maximum) {
  const aRevoir = cartes
    .filter((carte) => estARevoir(carte.id))
    .sort((a, b) => suiviDe(a.id).prochaine - suiviDe(b.id).prochaine);
  const nouvelles = cartes.filter((carte) => suiviDe(carte.id) === null);
  return [...aRevoir, ...melanger(nouvelles)].slice(0, maximum);
}

/** Compte les cartes nouvelles, en cours d'apprentissage, maîtrisées, à revoir et difficiles. */
export function bilan(cartes) {
  const resultat = { total: cartes.length, nouvelles: 0, enCours: 0, maitrisees: 0, aRevoir: 0, difficiles: 0 };
  for (const carte of cartes) {
    const suivi = suiviDe(carte.id);
    if (!suivi) resultat.nouvelles += 1;
    else if (suivi.boite >= BOITE_MAITRISEE) resultat.maitrisees += 1;
    else resultat.enCours += 1;
    if (estARevoir(carte.id)) resultat.aRevoir += 1;
    if (estDifficile(carte.id)) resultat.difficiles += 1;
  }
  return resultat;
}

/** Nombre de cartes qui seront à revoir chaque jour (pour le calendrier). */
export function revisionsPrevues(cartes) {
  const parJour = new Map();
  for (const carte of cartes) {
    const suivi = suiviDe(carte.id);
    if (!suivi) continue;
    const jour = cleJour(Math.max(suivi.prochaine, Date.now()));
    parJour.set(jour, (parJour.get(jour) ?? 0) + 1);
  }
  return parJour;
}

// --- Historique des sessions -----------------------------------------------------

/**
 * Prépare une session. type : 'flashcards', 'quiz' ou 'test' ;
 * titre : ce qui est travaillé (« Chants », « Réglementation »…).
 */
export function nouvelleSession(type, titre) {
  return { date: null, type, titre, questions: 0, reussites: 0 };
}

/**
 * Compte une réponse dans la session. La session entre dans l'historique dès
 * la première réponse : une session interrompue apparaît quand même au calendrier.
 */
export function noterDansSession(session, reussi) {
  if (session.date === null) {
    session.date = Date.now();
    etat.sessions.push(session);
  }
  session.questions += 1;
  if (reussi) session.reussites += 1;
  sauver();
}

export function sessions() {
  return etat.sessions;
}

export function sessionsParJour() {
  const parJour = new Map();
  for (const session of etat.sessions) {
    const jour = cleJour(session.date);
    if (!parJour.has(jour)) parJour.set(jour, []);
    parJour.get(jour).push(session);
  }
  return parJour;
}

/** Nombre de jours consécutifs (jusqu'à aujourd'hui ou hier) avec au moins une session. */
export function serieEnCours() {
  const jours = sessionsParJour();
  let date = new Date();
  if (!jours.has(cleJour(date))) date.setDate(date.getDate() - 1);
  let serie = 0;
  while (jours.has(cleJour(date))) {
    serie += 1;
    date.setDate(date.getDate() - 1);
  }
  return serie;
}

/** Meilleur score d'un test de connaissances. */
export function enregistrerTest(id, score, total) {
  const precedent = etat.tests[id];
  etat.tests[id] = {
    dernier: score,
    total,
    meilleur: Math.max(score, precedent?.meilleur ?? 0),
    date: Date.now(),
  };
  sauver();
}

export function resultatTest(id) {
  return etat.tests[id] ?? null;
}

/** « 2026-10-22 » : identifie un jour, en heure locale. */
export function cleJour(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// --- Sauvegarde et transfert entre appareils ---------------------------------

export function exporter() {
  return JSON.stringify({ ...etat, exporteLe: new Date().toISOString() }, null, 2);
}

export function importer(texte) {
  const donnees = JSON.parse(texte);
  if (!donnees || typeof donnees.cartes !== 'object') {
    throw new Error("Ce fichier n'est pas une sauvegarde de progression.");
  }
  etat = {
    ...etatVide(),
    cartes: donnees.cartes,
    sessions: Array.isArray(donnees.sessions) ? donnees.sessions : [],
    tests: donnees.tests ?? {},
  };
  sauver();
}

export function reinitialiser() {
  etat = etatVide();
  sauver();
}
