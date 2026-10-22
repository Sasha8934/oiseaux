// Petites fonctions utilisées partout dans l'application.

/**
 * Crée un élément HTML.
 * h('button', { class: 'bouton', onclick: f }, 'Texte') → <button class="bouton">Texte</button>
 */
export function h(balise, attributs = {}, ...enfants) {
  const element = document.createElement(balise);
  for (const [nom, valeur] of Object.entries(attributs ?? {})) {
    if (nom.startsWith('on')) element.addEventListener(nom.slice(2), valeur);
    else if (nom === 'class') element.className = valeur;
    else if (valeur === true) element.setAttribute(nom, '');
    else if (valeur !== false && valeur != null) element.setAttribute(nom, valeur);
  }
  for (const enfant of enfants.flat()) {
    if (enfant == null || enfant === false) continue;
    element.append(enfant instanceof Node ? enfant : String(enfant));
  }
  return element;
}

/** Renvoie une copie mélangée du tableau (mélange de Fisher-Yates). */
export function melanger(tableau) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** Ligne de crédit d'un média : « Auteur · CC BY-SA 4.0 · source » */
export function credit(media) {
  if (!media) return null;
  return h('p', { class: 'credit' },
    media.auteur, ' · ', media.licence, ' · ',
    h('a', { href: media.source, target: '_blank', rel: 'noopener' }, 'source'));
}

/** Petite photo carrée d'une espèce (ou un emplacement vide si pas de photo). */
export function vignette(espece) {
  return espece.photo
    ? h('img', { class: 'vignette', src: espece.photo.fichier, alt: espece.nom, loading: 'lazy' })
    : h('span', { class: 'vignette vide' });
}
