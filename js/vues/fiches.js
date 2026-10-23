// Fiches espèces : la liste (avec recherche) et le détail d'une espèce.

import { h, credit, vignette } from '../outils.js';
import { toutesLesEspeces, especeParId, sonDe } from '../donnees.js';
import { lecteurSon } from '../lecteur.js';

export function vueListeFiches() {
  const especes = [...toutesLesEspeces()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  const liste = h('ul', { class: 'liste-fiches' });

  const filtrer = (texte) => {
    const recherche = normaliser(texte);
    liste.replaceChildren(...especes
      .filter((e) => [e.nom, e.sci, e.en, e.famille].some((champ) => normaliser(champ).includes(recherche)))
      .map((e) => h('li', {}, h('a', { href: `#/fiches/${e.id}` },
        vignette(e),
        h('span', {}, h('strong', {}, e.nom), h('em', {}, e.sci))))));
  };
  filtrer('');

  return h('section', { class: 'page' },
    h('p', { class: 'sur-titre' }, `${especes.length} espèces`),
    h('h1', {}, 'Fiches espèces'),
    h('input', {
      type: 'search', class: 'recherche', placeholder: 'Rechercher (nom, nom scientifique, famille…)',
      'aria-label': 'Rechercher une espèce', oninput: (e) => filtrer(e.target.value),
    }),
    liste);
}

export function vueFiche(id) {
  const e = especeParId(id);
  if (!e) return h('section', { class: 'page' }, h('p', {}, 'Espèce introuvable.'), h('a', { href: '#/fiches' }, 'Retour aux fiches'));
  const r = e.reglementation;

  return h('article', { class: 'page fiche' },
    h('a', { class: 'lien retour-liste', href: '#/fiches' }, '← Toutes les fiches'),
    e.photo ? h('img', { class: 'photo', src: e.photo.fichier, alt: e.nom }) : null,
    credit(e.photo),
    h('p', { class: 'sur-titre' }, `${e.ordre} · ${e.famille}`),
    h('h1', { class: 'nom' }, e.nom),
    h('p', { class: 'nom-sci' }, e.sci),
    h('p', { class: 'texte-doux' }, e.en),

    h('dl', { class: 'mesures' },
      h('dt', {}, 'Longueur'), h('dd', {}, e.mesures.longueur),
      h('dt', {}, 'Envergure'), h('dd', {}, e.mesures.envergure),
      h('dt', {}, 'Poids'), h('dd', {}, e.mesures.poids)),

    section('Identification', liste(e.identification)),
    section('Risques de confusion', liste(e.confusions)),

    section('Chant',
      h('p', {}, e.sons.chant),
      sonDe(e, 'chant') ? lecteurSon(sonDe(e, 'chant')) : null),
    section('Cris',
      h('p', {}, e.sons.cris),
      sonDe(e, 'cri') ? lecteurSon(sonDe(e, 'cri')) : null),

    section('Statut et phénologie', h('p', {}, e.statut), h('p', {}, e.phenologie)),
    section('Habitat et répartition', h('p', {}, e.habitat), h('p', {}, e.repartition)),
    section('En ville', h('p', {}, e.urbain)),
    section('Alimentation', h('p', {}, e.alimentation)),
    section('Reproduction', tableauReproduction(e.reproduction)),
    section('Statuts réglementaires',
      h('dl', { class: 'statuts' },
        h('dt', {}, 'Protection nationale'), h('dd', {}, r.protection),
        h('dt', {}, 'Directive Oiseaux'), h('dd', {}, r.directiveOiseaux),
        h('dt', {}, 'Liste rouge France (nicheurs)'), h('dd', {}, r.listeRougeFrance)),
      h('p', { class: 'texte-doux petit' }, 'Liste rouge des oiseaux nicheurs de France métropolitaine (UICN France, MNHN, LPO, SEOF, ONCFS, 2016). '
        + 'Pour une étude, vérifier aussi la dernière édition et la Liste rouge régionale d\'Île-de-France.')),
    h('aside', { class: 'encart' }, h('h2', {}, 'Sur le terrain'), h('p', {}, e.terrain)));
}

/** Résumé court de la reproduction, affiché au verso des flashcards. */
export function resumeReproduction(espece) {
  const r = espece.reproduction;
  if (!r) return null;
  return h('ul', { class: 'puces' },
    h('li', {}, h('span', {}, 'Nid'), r.typeNid),
    h('li', {}, h('span', {}, 'Ponte'), `${r.oeufs} œufs`),
    h('li', {}, h('span', {}, 'Incubation'), r.incubation.split(',')[0]),
    h('li', {}, h('span', {}, 'Au nid'), r.sejourNid.split(';')[0]));
}

function tableauReproduction(r) {
  return [
    h('dl', { class: 'statuts' },
      h('dt', {}, 'Type de nid'), h('dd', {}, r.typeNid),
      h('dt', {}, 'Période'), h('dd', {}, r.periode),
      h('dt', {}, 'Nombre de pontes'), h('dd', {}, r.pontes),
      h('dt', {}, 'Œufs par ponte'), h('dd', {}, r.oeufs),
      h('dt', {}, 'Incubation'), h('dd', {}, r.incubation),
      h('dt', {}, 'Séjour au nid'), h('dd', {}, r.sejourNid),
      h('dt', {}, 'Développement'), h('dd', {}, r.developpement)),
    h('p', {}, r.nid),
    r.remarque ? h('p', {}, r.remarque) : null,
    h('p', { class: 'texte-doux petit' }, 'Valeurs indicatives tirées de la littérature ; elles varient selon les régions et les années.'),
  ];
}

function section(titre, ...contenu) {
  return h('section', { class: 'bloc' }, h('h2', {}, titre), ...contenu);
}

function liste(elements) {
  return h('ul', {}, elements.map((texte) => h('li', {}, texte)));
}

/** Minuscules sans accents, pour une recherche tolérante (« mesange » trouve « Mésange »). */
function normaliser(texte) {
  return (texte ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}
