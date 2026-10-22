// Lecteur de son avec spectrogramme.
//
// Le spectrogramme montre le son en image : le temps de gauche à droite,
// la fréquence (grave en bas, aigu en haut), et l'intensité par la couleur.
// Il est calculé directement dans le navigateur à partir du fichier audio.

import { h, credit } from './outils.js';

const FREQUENCE_MAX = 12000; // Hz : l'essentiel des chants d'oiseaux est en dessous
const TAILLE_FFT = 1024;
const PLAGE_DB = 70; // dynamique affichée, en décibels

let audioEnCours = null; // un seul son à la fois
const imagesEnCache = new Map(); // spectrogrammes déjà calculés

/** Arrête le son en cours (par exemple en changeant de page). */
export function arreterSon() {
  audioEnCours?.pause();
}

/**
 * Crée un lecteur : bouton lecture, bouton « réécouter », spectrogramme cliquable.
 * options.lectureAuto : lance le son tout de suite (doit suivre un clic sur iPhone).
 * options.credits : affiche l'auteur et la licence de l'enregistrement.
 */
export function lecteurSon(son, { lectureAuto = false, credits = true } = {}) {
  const audio = new Audio(son.fichier);
  audio.preload = 'auto';

  const boutonLecture = h('button', { type: 'button', class: 'bouton-lecture', 'aria-label': 'Lecture' });
  const boutonDebut = h('button', { type: 'button', class: 'bouton-secondaire', 'aria-label': 'Réécouter depuis le début' }, '↺ Depuis le début');
  const curseur = h('div', { class: 'curseur' });
  const toile = h('canvas', { class: 'toile-spectro', 'aria-hidden': 'true' });
  const zone = h('div', { class: 'spectro', title: 'Cliquer pour se déplacer dans le son' },
    toile, curseur,
    h('span', { class: 'echelle' }, `${FREQUENCE_MAX / 1000} kHz`),
    h('span', { class: 'echelle bas' }, '0'));

  const majBouton = () => {
    const enLecture = !audio.paused;
    boutonLecture.textContent = enLecture ? '❚❚' : '▶';
    boutonLecture.setAttribute('aria-label', enLecture ? 'Pause' : 'Lecture');
  };
  majBouton();

  const lire = () => {
    if (audioEnCours && audioEnCours !== audio) audioEnCours.pause();
    audioEnCours = audio;
    audio.play().catch(() => {}); // lecture refusée sans clic préalable : on attend l'utilisateur
  };

  boutonLecture.addEventListener('click', () => (audio.paused ? lire() : audio.pause()));
  boutonDebut.addEventListener('click', () => { audio.currentTime = 0; lire(); });
  zone.addEventListener('click', (evenement) => {
    if (!audio.duration) return;
    const rect = zone.getBoundingClientRect();
    audio.currentTime = ((evenement.clientX - rect.left) / rect.width) * audio.duration;
    lire();
  });

  audio.addEventListener('play', majBouton);
  audio.addEventListener('pause', majBouton);
  audio.addEventListener('ended', majBouton);

  // Le curseur suit la lecture
  const suivre = () => {
    if (audio.duration) curseur.style.left = `${(audio.currentTime / audio.duration) * 100}%`;
    if (!audio.paused) requestAnimationFrame(suivre);
  };
  audio.addEventListener('play', () => requestAnimationFrame(suivre));
  audio.addEventListener('seeked', suivre);

  // Le dessin attend que le lecteur soit affiché, pour connaître sa largeur
  requestAnimationFrame(() => dessinerSpectrogramme(toile, son.fichier));
  if (lectureAuto) lire();

  return h('div', { class: 'lecteur' },
    zone,
    h('div', { class: 'commandes' }, boutonLecture, boutonDebut),
    credits && son.auteur ? creditSon(son) : null);
}

function creditSon(son) {
  const ligne = credit(son);
  ligne.prepend(`${son.lieu} · `);
  return ligne;
}

// --- Calcul du spectrogramme ---------------------------------------------------

let contexteAudio = null;

function decoder(donnees) {
  contexteAudio ??= new (window.AudioContext || window.webkitAudioContext)();
  // Forme avec fonctions de rappel : compatible avec les anciennes versions de Safari
  return new Promise((ok, erreur) => contexteAudio.decodeAudioData(donnees, ok, erreur));
}

async function dessinerSpectrogramme(toile, url) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const largeur = Math.min(Math.round((toile.clientWidth || 600) * ratio), 1400);
  const hauteur = Math.round((toile.clientHeight || 150) * ratio);
  toile.width = largeur;
  toile.height = hauteur;
  const contexte = toile.getContext('2d');

  const cle = `${url}|${largeur}x${hauteur}`;
  try {
    if (!imagesEnCache.has(cle)) {
      const donnees = await (await fetch(url)).arrayBuffer();
      const son = await decoder(donnees);
      imagesEnCache.set(cle, calculerIntensites(son, largeur, hauteur));
    }
    contexte.putImageData(colorer(imagesEnCache.get(cle), largeur, hauteur), 0, 0);
  } catch {
    contexte.fillStyle = couleurCss('--texte-doux');
    contexte.font = `${14 * ratio}px system-ui, sans-serif`;
    contexte.fillText('Spectrogramme indisponible', 12 * ratio, hauteur / 2);
  }
}

/**
 * Renvoie l'intensité (0 à 1) de chaque pixel : une colonne par instant,
 * une ligne par fréquence.
 */
function calculerIntensites(son, largeur, hauteur) {
  const echantillons = son.getChannelData(0);
  const N = TAILLE_FFT;
  const fenetre = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)));
  const reel = new Float32Array(N);
  const imaginaire = new Float32Array(N);
  const binMax = Math.min(N / 2, Math.floor((FREQUENCE_MAX / son.sampleRate) * N));
  const db = new Float32Array(largeur * hauteur);

  for (let x = 0; x < largeur; x++) {
    const debut = Math.floor((x / largeur) * Math.max(0, echantillons.length - N));
    for (let i = 0; i < N; i++) {
      reel[i] = (echantillons[debut + i] || 0) * fenetre[i];
      imaginaire[i] = 0;
    }
    fft(reel, imaginaire);
    for (let y = 0; y < hauteur; y++) {
      const bin = Math.round(((hauteur - 1 - y) / (hauteur - 1)) * (binMax - 1));
      const puissance = reel[bin] * reel[bin] + imaginaire[bin] * imaginaire[bin];
      db[y * largeur + x] = 10 * Math.log10(puissance + 1e-12);
    }
  }

  // Le bruit de fond (les 75 % de pixels les plus faibles) est effacé pour faire ressortir les chants
  const tries = Array.from(db.filter((_, i) => i % 7 === 0)).sort((a, b) => a - b);
  const max = tries[tries.length - 1];
  const plancher = Math.max(tries[Math.floor(tries.length * 0.75)], max - PLAGE_DB);
  return db.map((valeur) => Math.min(1, Math.max(0, (valeur - plancher) / (max - plancher))));
}

/** Transforme les intensités en image, avec les couleurs du thème (clair ou sombre). */
function colorer(intensites, largeur, hauteur) {
  const fond = rvb(couleurCss('--spectro-fond'));
  const encre = rvb(couleurCss('--spectro-encre'));
  const image = new ImageData(largeur, hauteur);
  for (let i = 0; i < intensites.length; i++) {
    const t = Math.pow(intensites[i], 0.8);
    image.data[i * 4] = fond[0] + (encre[0] - fond[0]) * t;
    image.data[i * 4 + 1] = fond[1] + (encre[1] - fond[1]) * t;
    image.data[i * 4 + 2] = fond[2] + (encre[2] - fond[2]) * t;
    image.data[i * 4 + 3] = 255;
  }
  return image;
}

/** Transformée de Fourier rapide (radix 2), calculée sur place. */
function fft(reel, imaginaire) {
  const n = reel.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [reel[i], reel[j]] = [reel[j], reel[i]];
      [imaginaire[i], imaginaire[j]] = [imaginaire[j], imaginaire[i]];
    }
  }
  for (let taille = 2; taille <= n; taille <<= 1) {
    const angle = (-2 * Math.PI) / taille;
    const pasR = Math.cos(angle);
    const pasI = Math.sin(angle);
    for (let debut = 0; debut < n; debut += taille) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < taille / 2; k++) {
        const a = debut + k;
        const b = a + taille / 2;
        const tR = reel[b] * wR - imaginaire[b] * wI;
        const tI = reel[b] * wI + imaginaire[b] * wR;
        reel[b] = reel[a] - tR;
        imaginaire[b] = imaginaire[a] - tI;
        reel[a] += tR;
        imaginaire[a] += tI;
        [wR, wI] = [wR * pasR - wI * pasI, wR * pasI + wI * pasR];
      }
    }
  }
}

function couleurCss(variable) {
  return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
}

function rvb(hexa) {
  const valeur = parseInt(hexa.replace('#', ''), 16);
  return [(valeur >> 16) & 255, (valeur >> 8) & 255, valeur & 255];
}
