// Barres du haut et du bas qui s'effacent pendant le défilement :
// l'en-tête ne revient que tout en haut de la page, la barre d'onglets que tout en bas.
// À l'ouverture d'une page, les deux sont visibles jusqu'au premier défilement.

const MARGE_BORDS = 40; // distance (en pixels) au haut ou au bas de la page considérée comme « tout en haut / en bas »

export function activerBarresMasquables() {
  let enAttente = false;

  const mettreAJour = () => {
    enAttente = false;
    const position = Math.max(0, window.scrollY); // ignore le rebond élastique d'iOS
    const enHaut = position < MARGE_BORDS;
    const enBas = window.innerHeight + position >= document.documentElement.scrollHeight - MARGE_BORDS;
    document.body.classList.toggle('entete-cachee', !enHaut);
    document.body.classList.toggle('onglets-caches', !enBas && !enHaut);
  };

  window.addEventListener('scroll', () => {
    if (!enAttente) {
      enAttente = true;
      requestAnimationFrame(mettreAJour);
    }
  }, { passive: true });

  // À chaque changement de page, les deux barres réapparaissent
  window.addEventListener('hashchange', () => {
    document.body.classList.remove('entete-cachee', 'onglets-caches');
  });
}
