// Chargement des espèces et de leurs médias (sons, photos).

/** Les trois façons d'interroger une espèce : sur son chant, son cri ou sa photo. */
export const MODES = {
  chant: { titre: 'Chants', question: 'Quel oiseau chante ?' },
  cri: { titre: 'Cris', question: 'Quel oiseau crie ?' },
  photo: { titre: 'Photos', question: 'Quel est cet oiseau ?' },
};

let especes = [];

export async function chargerEspeces() {
  const [listeEspeces, medias] = await Promise.all([
    lireJson('data/especes.json'),
    lireJson('data/medias.json'),
  ]);
  especes = listeEspeces.map((espece) => ({
    ...espece,
    sons: medias[espece.id]?.sons ?? [],
    photo: medias[espece.id]?.photo ?? null,
  }));
  return especes;
}

export function toutesLesEspeces() {
  return especes;
}

export function especeParId(id) {
  return especes.find((espece) => espece.id === id);
}

/** Le son d'une espèce pour un mode donné ('chant' ou 'cri'). */
export function sonDe(espece, mode) {
  return espece.sons.find((son) => son.type === mode) ?? null;
}

/**
 * Toutes les cartes d'un mode. Une carte = une espèce interrogée d'une façon.
 * Son identifiant (« merle-noir:chant ») ne change jamais : c'est lui qui garde la progression.
 */
export function cartesDuMode(mode) {
  return especes
    .filter((espece) => (mode === 'photo' ? espece.photo : sonDe(espece, mode)))
    .map((espece) => ({ id: `${espece.id}:${mode}`, espece, mode }));
}

export function toutesLesCartes() {
  return Object.keys(MODES).flatMap(cartesDuMode);
}

let savoirs = null;

/** Contenus de l'onglet Savoirs (chargés seulement quand on en a besoin). */
export async function chargerSavoirs() {
  savoirs ??= await lireJson('data/savoirs.json');
  return savoirs;
}

async function lireJson(chemin) {
  const reponse = await fetch(chemin);
  if (!reponse.ok) throw new Error(`Impossible de lire ${chemin}`);
  return reponse.json();
}
