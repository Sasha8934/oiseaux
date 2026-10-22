// Réglages : progression, sauvegarde et transfert, mode hors ligne, crédits.

import { h, credit } from '../outils.js';
import { toutesLesEspeces } from '../donnees.js';
import { exporter, importer, reinitialiser } from '../progression.js';
import { CACHE_MEDIAS } from '../hors-ligne.js';

export function vueReglages() {
  const message = h('p', { class: 'message', 'aria-live': 'polite' });

  // --- Sauvegarde de la progression ---
  const boutonExporter = h('button', { type: 'button', class: 'bouton' }, 'Exporter ma progression');
  boutonExporter.addEventListener('click', () => {
    const fichier = new Blob([exporter()], { type: 'application/json' });
    const lien = h('a', {
      href: URL.createObjectURL(fichier),
      download: `progression-oiseaux-${new Date().toISOString().slice(0, 10)}.json`,
    });
    document.body.append(lien);
    lien.click();
    lien.remove();
  });

  const choixFichier = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
  choixFichier.addEventListener('change', async () => {
    const fichier = choixFichier.files[0];
    if (!fichier) return;
    try {
      importer(await fichier.text());
      message.textContent = 'Progression importée.';
    } catch (erreur) {
      message.textContent = `Import impossible : ${erreur.message}`;
    }
  });
  const boutonImporter = h('button', { type: 'button', class: 'bouton bouton-clair', onclick: () => choixFichier.click() }, 'Importer une progression');

  const boutonEffacer = h('button', { type: 'button', class: 'bouton bouton-rate' }, 'Effacer ma progression');
  boutonEffacer.addEventListener('click', () => {
    if (confirm('Effacer toute la progression sur cet appareil ? Pensez à l\'exporter avant.')) {
      reinitialiser();
      message.textContent = 'Progression effacée.';
    }
  });

  return h('section', { class: 'page' },
    h('p', { class: 'sur-titre' }, 'Paramètres'),
    h('h1', {}, 'Réglages'),

    h('p', { class: 'intro' }, 'La progression détaillée et le calendrier sont dans l\'onglet ', h('a', { href: '#/suivi' }, 'Suivi'), '.'),

    h('h2', {}, 'Sauvegarde et transfert'),
    h('p', {}, 'La progression (cartes, sessions, tests) est enregistrée sur chaque appareil séparément. '
      + 'Pour la transférer, exportez-la ici, puis importez le fichier sur l\'autre appareil.'),
    h('div', { class: 'actions' }, boutonExporter, boutonImporter, choixFichier),
    message,

    h('h2', {}, 'Utiliser sans connexion'),
    blocHorsLigne(),

    h('h2', {}, 'Zone sensible'),
    h('div', { class: 'actions' }, boutonEffacer),

    h('h2', {}, 'Crédits'),
    h('p', {}, 'Sons : xeno-canto.org. Photos : Wikimedia Commons. Merci aux auteurs, sous licences Creative Commons.'),
    h('details', {},
      h('summary', {}, 'Détail des crédits'),
      h('ul', { class: 'credits' }, toutesLesEspeces().map((e) => h('li', {},
        h('strong', {}, e.nom),
        credit(e.photo),
        e.sons.map((son) => credit(son)))))));
}

/** Télécharge tous les sons et photos sur l'appareil pour une utilisation hors ligne. */
function blocHorsLigne() {
  if (!('caches' in window)) {
    return h('p', { class: 'texte-doux' }, 'Ce navigateur ne permet pas le mode hors ligne.');
  }
  const etat = h('p', { class: 'texte-doux' },
    'Les sons et photos sont gardés au fur et à mesure que vous les consultez. '
    + 'Vous pouvez aussi tout télécharger d\'un coup avant une sortie.');
  const bouton = h('button', { type: 'button', class: 'bouton' }, 'Tout télécharger');

  bouton.addEventListener('click', async () => {
    bouton.disabled = true;
    const fichiers = toutesLesEspeces().flatMap((e) => [e.photo?.fichier, ...e.sons.map((s) => s.fichier)]).filter(Boolean);
    const cache = await caches.open(CACHE_MEDIAS);
    let faits = 0;
    let echecs = 0;
    for (const fichier of fichiers) {
      if (!(await cache.match(fichier))) {
        try {
          await cache.add(fichier);
        } catch {
          echecs += 1;
        }
      }
      faits += 1;
      etat.textContent = `Téléchargement… ${faits} / ${fichiers.length}`;
    }
    etat.textContent = echecs
      ? `Terminé, mais ${echecs} fichier(s) n'ont pas pu être téléchargés. Réessayez avec une meilleure connexion.`
      : 'Tout est disponible hors ligne sur cet appareil.';
    bouton.disabled = false;
  });

  return h('div', {}, etat, h('div', { class: 'actions' }, bouton));
}
