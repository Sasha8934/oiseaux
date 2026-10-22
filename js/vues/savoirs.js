// Savoirs : fiches de connaissances générales (réglementation, biologie) et tests associés.

import { h, melanger } from '../outils.js';
import { chargerSavoirs } from '../donnees.js';
import { enregistrerTest, resultatTest, nouvelleSession, noterDansSession } from '../progression.js';

const QUESTIONS_PAR_TEST = 10;
const MAUVAISES_REPONSES = 3;

/** Affiche « Chargement… » puis le contenu une fois les savoirs chargés. */
function pageAsynchrone(construire) {
  const page = h('section', { class: 'page' }, h('p', { class: 'chargement' }, 'Chargement…'));
  chargerSavoirs()
    .then((themes) => page.replaceChildren(...construire(themes, page)))
    .catch(() => page.replaceChildren(h('p', {}, 'Impossible de charger les contenus.')));
  return page;
}

export function vueListeSavoirs() {
  return pageAsynchrone((themes) => [
    h('h1', {}, 'Savoirs'),
    h('p', { class: 'intro' }, 'Les connaissances générales du naturaliste en bureau d\'études, avec un test à refaire pour consolider.'),
    h('div', { class: 'grille-choix' }, themes.map((theme) => {
      const resultat = resultatTest(theme.id);
      return h('a', { class: 'choix', href: `#/savoirs/${theme.id}` },
        h('strong', {}, theme.titre),
        h('span', { class: 'texte-doux' }, theme.intro),
        h('span', { class: 'texte-doux' }, resultat
          ? `Test : meilleur score ${resultat.meilleur} / ${resultat.total}`
          : `${theme.chapitres.length} chapitres · test de ${QUESTIONS_PAR_TEST} questions`));
    })),
  ]);
}

export function vueTheme(id) {
  return pageAsynchrone((themes) => {
    const theme = themes.find((t) => t.id === id);
    if (!theme) return [h('p', {}, 'Thème introuvable.')];
    const resultat = resultatTest(theme.id);
    return [
      h('a', { class: 'lien retour-liste', href: '#/savoirs' }, '← Tous les savoirs'),
      h('h1', {}, theme.titre),
      h('p', { class: 'intro' }, theme.intro),
      h('div', { class: 'actions' },
        h('a', { class: 'bouton', href: `#/savoirs/${theme.id}/test` }, 'Faire le test'),
        resultat ? h('span', { class: 'texte-doux' }, `Meilleur score : ${resultat.meilleur} / ${resultat.total}`) : null),
      ...theme.chapitres.map((chapitre, i) => h('details', { class: 'chapitre', open: i === 0 },
        h('summary', {}, chapitre.titre),
        chapitre.contenu.map((bloc) => (Array.isArray(bloc)
          ? h('ul', {}, bloc.map((ligne) => h('li', {}, ligne)))
          : h('p', {}, bloc))))),
      h('div', { class: 'actions' }, h('a', { class: 'bouton', href: `#/savoirs/${theme.id}/test` }, 'Faire le test')),
    ];
  });
}

export function vueTest(id) {
  return pageAsynchrone((themes, page) => {
    const theme = themes.find((t) => t.id === id);
    if (!theme) return [h('p', {}, 'Thème introuvable.')];

    const questions = melanger(theme.questions).slice(0, QUESTIONS_PAR_TEST);
    const historique = nouvelleSession('test', theme.titre);
    let numero = 0;
    let score = 0;

    const afficherQuestion = () => {
      if (numero >= questions.length) return afficherFin();
      const q = questions[numero];
      // La bonne réponse + 3 mauvaises tirées au hasard parmi toutes celles prévues,
      // pour ne pas s'habituer aux mêmes propositions ; puis on mélange l'ordre
      const choix = melanger([
        { texte: q.juste, juste: true },
        ...melanger(q.faux).slice(0, MAUVAISES_REPONSES).map((texte) => ({ texte, juste: false })),
      ]);
      const retour = h('div', { class: 'retour', 'aria-live': 'polite' });

      const boutons = choix.map((c) => h('button', {
        type: 'button',
        class: 'proposition',
        onclick: () => {
          if (c.juste) score += 1;
          noterDansSession(historique, c.juste);
          boutons.forEach((bouton, i) => {
            bouton.disabled = true;
            if (choix[i].juste) bouton.classList.add('juste');
          });
          if (!c.juste) boutons[choix.indexOf(c)].classList.add('faux');
          retour.append(
            h('p', { class: c.juste ? 'message juste' : 'message faux' }, c.juste ? 'Bonne réponse !' : 'Pas tout à fait.'),
            h('p', {}, q.explication),
            h('button', {
              type: 'button', class: 'bouton bouton-large',
              onclick: () => { numero += 1; afficherQuestion(); window.scrollTo(0, 0); },
            }, numero + 1 < questions.length ? 'Question suivante' : 'Voir le résultat'));
        },
      }, h('span', {}, c.texte)));

      page.replaceChildren(
        h('p', { class: 'compteur' }, `${theme.titre} · question ${numero + 1} / ${questions.length}`),
        h('article', { class: 'flashcard' },
          h('p', { class: 'question' }, q.question),
          h('div', { class: 'propositions' }, boutons),
          retour));
    };

    const afficherFin = () => {
      enregistrerTest(theme.id, score, questions.length);
      page.replaceChildren(
        h('h1', {}, 'Résultat'),
        h('p', { class: 'grand-chiffre' }, `${score} / ${questions.length}`),
        h('p', {}, `Meilleur score : ${resultatTest(theme.id).meilleur} / ${questions.length}. `
          + `Les questions sont tirées au hasard parmi ${theme.questions.length} : refaites le test pour tout couvrir.`),
        h('div', { class: 'actions' },
          h('button', { type: 'button', class: 'bouton', onclick: () => page.replaceWith(vueTest(id)) }, 'Refaire le test'),
          h('a', { class: 'bouton bouton-clair', href: `#/savoirs/${theme.id}` }, 'Relire les chapitres')));
    };

    // Le contenu est placé par afficherQuestion : on renvoie une liste vide
    queueMicrotask(afficherQuestion);
    return [];
  });
}
