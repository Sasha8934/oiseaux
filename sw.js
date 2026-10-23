// Service worker : garde l'application sur l'appareil pour qu'elle marche hors ligne.
//
// IMPORTANT : à chaque mise en ligne d'une nouvelle version, augmenter VERSION.
// C'est ce qui déclenche la mise à jour sur l'ordinateur, l'iPhone et l'iPad.

const VERSION = 'v13';
const CACHE_APP = `oiseaux-app-${VERSION}`;
const CACHE_MEDIAS = 'oiseaux-medias'; // même nom que dans js/hors-ligne.js

const FICHIERS_APP = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'polices/polices.css',
  'polices/jost.woff2',
  'polices/cormorant-garamond.woff2',
  'polices/cormorant-garamond-italique.woff2',
  'js/app.js',
  'js/outils.js',
  'js/donnees.js',
  'js/progression.js',
  'js/lecteur.js',
  'js/hors-ligne.js',
  'js/theme.js',
  'js/barres.js',
  'js/calendrier.js',
  'js/vues/accueil.js',
  'js/vues/flashcards.js',
  'js/vues/quiz.js',
  'js/vues/fiches.js',
  'js/vues/reglages.js',
  'js/vues/suivi.js',
  'js/vues/savoirs.js',
  'data/especes.json',
  'data/medias.json',
  'data/savoirs.json',
  'icones/logo.svg',
  'icones/decor-branche.svg',
  'icones/decor-plume.svg',
  'icones/decor-graminees.svg',
  'icones/decor-fougere.svg',
  'icones/decor-ombelle.svg',
  'icones/icone-180.png',
  'icones/icone-192.png',
  'icones/icone-512.png',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(caches.open(CACHE_APP).then((cache) => cache.addAll(FICHIERS_APP)));
});

self.addEventListener('activate', (evenement) => {
  // Supprime les anciennes versions de l'application (les médias sont conservés)
  evenement.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(noms
        .filter((nom) => nom.startsWith('oiseaux-app-') && nom !== CACHE_APP)
        .map((nom) => caches.delete(nom))))
      .then(() => self.clients.claim()));
});

// L'utilisatrice a cliqué sur « Mettre à jour »
self.addEventListener('message', (evenement) => {
  if (evenement.data === 'activer') self.skipWaiting();
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  const url = new URL(requete.url);
  if (requete.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.includes('/media/')) {
    evenement.respondWith(media(requete));
  } else {
    evenement.respondWith(
      caches.match(requete, { ignoreSearch: true }).then((reponse) => reponse || fetch(requete)));
  }
});

/** Sons et photos : gardés après le premier téléchargement. */
async function media(requete) {
  const cache = await caches.open(CACHE_MEDIAS);
  let reponse = await cache.match(requete.url);
  if (!reponse) {
    reponse = await fetch(requete.url); // fichier complet, même si seul un morceau est demandé
    if (reponse.ok) await cache.put(requete.url, reponse.clone());
  }
  const plage = requete.headers.get('range');
  return plage && reponse.ok ? morceau(reponse, plage) : reponse;
}

/**
 * Safari (iPhone, iPad) lit les sons par morceaux (en-tête « Range ») et refuse
 * la lecture si on lui renvoie le fichier entier : on découpe le morceau demandé.
 */
async function morceau(reponse, plage) {
  const contenu = await reponse.blob();
  const [, debutTexte, finTexte] = /bytes=(\d*)-(\d*)/.exec(plage) || [];
  const debut = Number(debutTexte) || 0;
  const fin = finTexte ? Math.min(Number(finTexte), contenu.size - 1) : contenu.size - 1;
  return new Response(contenu.slice(debut, fin + 1), {
    status: 206,
    headers: {
      'Content-Type': reponse.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': `bytes ${debut}-${fin}/${contenu.size}`,
      'Content-Length': String(fin - debut + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}
