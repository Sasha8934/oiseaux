// Barres du haut et du bas qui s'effacent en faisant défiler vers le bas,
// et reviennent quand on remonte, en haut de page ou tout en bas de la page.

const SEUIL = 8;          // pixels de défilement avant de réagir (évite les tremblements)
const MARGE_BORDS = 60;   // près du haut ou du bas de la page, les barres restent visibles

export function activerBarresMasquables() {
  let dernierePosition = window.scrollY;
  let enAttente = false;

  const mettreAJour = () => {
    enAttente = false;
    const position = Math.max(0, window.scrollY); // ignore le rebond élastique d'iOS
    const enHaut = position < MARGE_BORDS;
    const enBas = window.innerHeight + position >= document.documentElement.scrollHeight - MARGE_BORDS;
    const ecart = position - dernierePosition;

    if (enHaut || enBas || ecart < -SEUIL) afficher();
    else if (ecart > SEUIL) document.body.classList.add('barres-cachees');

    if (Math.abs(ecart) > SEUIL || enHaut || enBas) dernierePosition = position;
  };

  window.addEventListener('scroll', () => {
    if (!enAttente) {
      enAttente = true;
      requestAnimationFrame(mettreAJour);
    }
  }, { passive: true });

  // À chaque changement de page, les barres réapparaissent
  window.addEventListener('hashchange', afficher);
}

function afficher() {
  document.body.classList.remove('barres-cachees');
}
