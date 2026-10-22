// Quiz à choix multiples : 10 questions, 4 propositions.
// Les mauvaises propositions sont choisies de préférence dans la même famille,
// pour s'entraîner sur les vraies confusions de terrain.

import { h, credit, melanger } from '../outils.js';
import { MODES, cartesDuMode, sonDe, toutesLesEspeces } from '../donnees.js';
import { choisirCartes, enregistrerReponse, nouvelleSession, noterDansSession } from '../progression.js';
import { arreterSon, lecteurSon } from '../lecteur.js';

const QUESTIONS_PAR_QUIZ = 10;
const NOMBRE_PROPOSITIONS = 4;

const TYPES_QUIZ = {
  chant: 'Chants',
  cri: 'Cris',
  photo: 'Photos',
  melange: 'Mélange',
};

export function vueChoixQuiz() {
  return h('section', { class: 'page' },
    h('h1', {}, 'Quiz'),
    h('p', { class: 'intro' }, `${QUESTIONS_PAR_QUIZ} questions, ${NOMBRE_PROPOSITIONS} propositions. Les cartes à revoir passent en premier.`),
    h('div', { class: 'grille-choix' }, Object.entries(TYPES_QUIZ).map(([type, titre]) =>
      h('a', { class: 'choix', href: `#/quiz/${type}` },
        h('strong', {}, titre),
        h('span', { class: 'texte-doux' }, type === 'melange' ? 'Chants, cris et photos' : `Reconnaître les ${titre.toLowerCase()}`)))));
}

export function vueQuiz(type) {
  const modes = type === 'melange' ? Object.keys(MODES) : [type];
  const toutes = modes.flatMap(cartesDuMode);
  // Les cartes à revoir et nouvelles d'abord, complétées au hasard si besoin
  const prioritaires = choisirCartes(toutes, QUESTIONS_PAR_QUIZ);
  const complement = melanger(toutes.filter((carte) => !prioritaires.includes(carte)));
  const questions = melanger([...prioritaires, ...complement].slice(0, QUESTIONS_PAR_QUIZ));

  const page = h('section', { class: 'page' });
  const erreurs = [];
  const historique = nouvelleSession('quiz', TYPES_QUIZ[type]);
  let numero = 0;

  const afficherQuestion = () => {
    arreterSon(); // le son de la question précédente ne doit pas continuer
    page.replaceChildren();
    if (numero >= questions.length) return afficherFin();
    const carte = questions[numero];
    page.append(
      h('p', { class: 'compteur' }, `Question ${numero + 1} / ${questions.length}`),
      question(carte, (reussi) => {
        enregistrerReponse(carte.id, reussi);
        noterDansSession(historique, reussi);
        if (!reussi) erreurs.push(carte);
      }, () => {
        numero += 1;
        afficherQuestion();
      }));
  };

  const afficherFin = () => {
    const score = questions.length - erreurs.length;
    page.append(...[
      h('h1', {}, 'Résultat'),
      h('p', { class: 'grand-chiffre' }, `${score} / ${questions.length}`),
      h('p', {}, messageScore(score / questions.length)),
      erreurs.length ? h('h2', {}, 'À retravailler') : null,
      erreurs.length ? h('ul', { class: 'liste-especes' }, erreurs.map(({ espece, mode }) =>
        h('li', {}, h('a', { href: `#/fiches/${espece.id}` },
          h('strong', {}, espece.nom), ' ', h('span', { class: 'texte-doux' }, `(${MODES[mode].titre.toLowerCase()})`))))) : null,
      h('div', { class: 'actions' },
        h('button', { type: 'button', class: 'bouton', onclick: () => page.replaceWith(vueQuiz(type)) }, 'Nouveau quiz'),
        h('a', { class: 'bouton bouton-clair', href: '#/quiz' }, 'Autres quiz')),
    ].filter(Boolean)); // append() écrirait « null » pour les éléments absents
  };

  afficherQuestion();
  return page;
}

function question({ espece, mode }, noter, suivante) {
  const propositions = melanger([espece, ...leurres(espece, NOMBRE_PROPOSITIONS - 1)]);
  const retour = h('div', { class: 'retour', 'aria-live': 'polite' });

  const boutons = propositions.map((proposition) => h('button', {
    type: 'button',
    class: 'proposition',
    onclick: () => {
      const reussi = proposition.id === espece.id;
      noter(reussi);
      for (const [i, bouton] of boutons.entries()) {
        bouton.disabled = true;
        if (propositions[i].id === espece.id) bouton.classList.add('juste');
      }
      if (!reussi) boutons[propositions.indexOf(proposition)].classList.add('faux');
      retour.append(...[
        h('p', { class: reussi ? 'message juste' : 'message faux' },
          reussi ? 'Bonne réponse !' : `Non : c'était ${espece.nom}.`),
        mode !== 'photo' && espece.photo ? h('img', { class: 'photo petite', src: espece.photo.fichier, alt: espece.nom }) : null,
        h('p', {}, h('a', { class: 'lien', href: `#/fiches/${espece.id}` }, `Fiche : ${espece.nom}`)),
        h('button', { type: 'button', class: 'bouton bouton-large', onclick: suivante }, 'Question suivante'),
      ].filter(Boolean));
    },
  }, h('span', {}, proposition.nom), h('em', {}, proposition.sci)));

  const son = mode === 'photo' ? null : sonDe(espece, mode);
  return h('article', { class: 'flashcard' },
    h('p', { class: 'question' }, MODES[mode].question),
    son
      ? lecteurSon(son, { lectureAuto: true, credits: false })
      : h('img', { class: 'photo', src: espece.photo.fichier, alt: 'Photo à identifier' }),
    mode === 'photo' ? credit(espece.photo) : null,
    h('div', { class: 'propositions' }, boutons),
    retour);
}

/**
 * Mauvaises propositions tirées au hasard à chaque question, pour ne pas s'y habituer.
 * Les espèces proches ont plus de chances d'être tirées (même famille : 4 fois plus,
 * même ordre : 2 fois plus), pour s'entraîner sur les vraies confusions.
 */
function leurres(espece, nombre) {
  const poids = (autre) => (autre.famille === espece.famille ? 4 : autre.ordre === espece.ordre ? 2 : 1);
  const restantes = toutesLesEspeces().filter((autre) => autre.id !== espece.id);
  const choisies = [];
  while (choisies.length < nombre && restantes.length) {
    let tirage = Math.random() * restantes.reduce((somme, autre) => somme + poids(autre), 0);
    const index = restantes.findIndex((autre) => (tirage -= poids(autre)) < 0);
    choisies.push(...restantes.splice(index === -1 ? restantes.length - 1 : index, 1));
  }
  return choisies;
}

function messageScore(taux) {
  if (taux === 1) return 'Parfait !';
  if (taux >= 0.8) return 'Très bien !';
  if (taux >= 0.5) return 'Bien, continuez comme ça.';
  return 'Ça viendra : les erreurs reviendront plus souvent.';
}
