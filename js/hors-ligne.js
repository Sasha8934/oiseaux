// Mode hors ligne et mises à jour, grâce au « service worker » (fichier sw.js).

/** Même nom que dans sw.js : le cache où sont gardés sons et photos. */
export const CACHE_MEDIAS = 'oiseaux-medias';

export function activerHorsLigne() {
  if (!('serviceWorker' in navigator)) return;
  // Sur l'ordinateur en développement, on veut toujours voir la toute dernière version
  if (['localhost', '127.0.0.1'].includes(location.hostname)) return;

  const avaitUneVersion = Boolean(navigator.serviceWorker.controller);
  const bandeau = document.getElementById('mise-a-jour');
  const bouton = document.getElementById('bouton-mise-a-jour');

  navigator.serviceWorker.register('sw.js').then((enregistrement) => {
    const proposer = (nouvelleVersion) => {
      bandeau.hidden = false;
      bouton.onclick = () => nouvelleVersion.postMessage('activer');
    };
    if (enregistrement.waiting && avaitUneVersion) proposer(enregistrement.waiting);
    enregistrement.addEventListener('updatefound', () => {
      const installation = enregistrement.installing;
      installation.addEventListener('statechange', () => {
        if (installation.state === 'installed' && navigator.serviceWorker.controller) proposer(installation);
      });
    });
    // Cherche une nouvelle version à chaque retour dans l'application
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') enregistrement.update();
    });
  });

  // La nouvelle version a pris la main : on recharge la page une fois
  let dejaRecharge = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!avaitUneVersion || dejaRecharge) return;
    dejaRecharge = true;
    location.reload();
  });
}
