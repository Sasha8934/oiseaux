// Thème de l'application : automatique (suit l'appareil), clair ou sombre.
// Le choix est gardé sur l'appareil ; index.html l'applique dès l'ouverture.

const CLE = 'syrinx.theme';
export const THEMES = { auto: 'Automatique', clair: 'Clair', sombre: 'Sombre' };

export function themeChoisi() {
  try {
    return localStorage.getItem(CLE) ?? 'auto';
  } catch {
    return 'auto';
  }
}

export function choisirTheme(theme) {
  try {
    localStorage.setItem(CLE, theme);
  } catch {
    // stockage indisponible : le choix ne vaut que pour cette session
  }
  const racine = document.documentElement;
  if (theme === 'clair') racine.dataset.theme = 'light';
  else if (theme === 'sombre') racine.dataset.theme = 'dark';
  else delete racine.dataset.theme;
}
