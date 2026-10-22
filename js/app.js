// Point d'entrée : charge les données puis affiche la bonne page selon l'adresse.
// Les adresses ont la forme #/quiz/chant, #/fiches/merle-noir, etc.

import { h } from './outils.js';
import { chargerEspeces } from './donnees.js';
import { arreterSon } from './lecteur.js';
import { activerHorsLigne } from './hors-ligne.js';
import { activerBarresMasquables } from './barres.js';
import { vueAccueil } from './vues/accueil.js';
import { vueChoixFlashcards, vueSessionFlashcards, vueSessionCiblee } from './vues/flashcards.js';
import { vueChoixQuiz, vueQuiz } from './vues/quiz.js';
import { vueListeFiches, vueFiche } from './vues/fiches.js';
import { vueReglages } from './vues/reglages.js';
import { vueSuivi } from './vues/suivi.js';
import { vueListeSavoirs, vueTheme, vueTest } from './vues/savoirs.js';

const MODES_VALIDES = ['chant', 'cri', 'photo'];

function vuePour(page, parametre, option) {
  switch (page) {
    case 'flashcards':
      if (parametre === 'cible') return vueSessionCiblee(option);
      return MODES_VALIDES.includes(parametre)
        ? vueSessionFlashcards(parametre, option === 'tout')
        : vueChoixFlashcards();
    case 'quiz':
      return [...MODES_VALIDES, 'melange'].includes(parametre) ? vueQuiz(parametre) : vueChoixQuiz();
    case 'fiches':
      return parametre ? vueFiche(parametre) : vueListeFiches();
    case 'suivi':
      return vueSuivi();
    case 'savoirs':
      if (!parametre) return vueListeSavoirs();
      return option === 'test' ? vueTest(parametre) : vueTheme(parametre);
    case 'reglages':
      return vueReglages();
    default:
      return vueAccueil();
  }
}

function afficher() {
  arreterSon();
  const [page = 'accueil', parametre, option] = location.hash.replace(/^#\/?/, '').split('/');
  const vue = document.getElementById('vue');
  vue.dataset.page = page; // choisit le décor botanique de l'onglet (voir style.css)
  vue.replaceChildren(vuePour(page, parametre, option));

  for (const lien of document.querySelectorAll('[data-onglet]')) {
    if (lien.dataset.onglet === page) lien.setAttribute('aria-current', 'page');
    else lien.removeAttribute('aria-current');
  }
  window.scrollTo(0, 0);
}

async function demarrer() {
  activerHorsLigne();
  activerBarresMasquables();
  try {
    await chargerEspeces();
  } catch (erreur) {
    document.getElementById('vue').replaceChildren(
      h('p', { class: 'page' }, `Impossible de charger les données : ${erreur.message}`));
    return;
  }
  window.addEventListener('hashchange', afficher);
  afficher();
}

demarrer();
