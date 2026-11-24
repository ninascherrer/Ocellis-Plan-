# Ocellis · Plan interactif des bureaux

Application web (React, TypeScript, SVG) qui transforme le plan architectural
des nouveaux bureaux en plan d'orientation interactif : zoom, déplacement,
zones cliquables, recherche, filtres par catégorie et fiche descriptive de
chaque espace. Utilisable sur ordinateur et sur mobile.

La vue d'ouverture est une **maquette axonométrique illustrée** en rotation libre
(voir « Maquette illustrée »). Le plan 2D est **redessiné en vecteurs** (`src/plan/PlanDessin.tsx`) dans le
repère exact de l'image d'origine : murs, cloisons, portes, escaliers,
ascenseurs et mobilier principal reprennent les positions relevées sur le plan
d'architecte, sans rien déplacer ni ajouter. Les cotes, trames, hachures et
annotations techniques sont omises. Les zones interactives sont des polygones
SVG transparents superposés au dessin. Le bouton **Dessin / Original** (en bas
à droite) affiche le plan de zoning Ocellis, indice 10 du 20/11/2026
(`public/plan/plan-zoning.jpg`, recadré sur le repère du plan).

## Démarrer

```bash
npm install
npm run dev          # http://localhost:5173
```

| Commande            | Rôle                                                    |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Serveur de développement avec rechargement automatique  |
| `npm run build`     | Vérification TypeScript puis version de production (`dist/`) |
| `npm run preview`   | Aperçu local de la version de production                |
| `npm test`          | Tests (validité de la configuration, géométrie, recherche) |

Le dossier `dist/` est statique : il peut être déposé sur n'importe quel
serveur web ou intranet, y compris dans un sous-dossier.

## Mise en ligne (GitHub Pages)

Le site est publié à l'adresse **https://ninascherrer.github.io/Ocellis-Plan-/**.

Chaque `git push` sur la branche `main` lance le workflow
`.github/workflows/deploy.yml` : tests, construction, puis publication du
dossier `dist/` sur la branche `gh-pages`. L'adresse ne change pas : le QR code
reste valable.

Réglage à faire une seule fois : **Settings → Pages → Build and deployment →
Source : Deploy from a branch**, branche `gh-pages`, dossier `/ (root)`.

**Copie hors ligne.** `npm run build:hors-ligne` produit
`dist-hors-ligne/ocellis-plan-hors-ligne.html` : un fichier HTML unique (code,
polices, données de la maquette et plan d'origine intégrés) qui s'ouvre sans
réseau, depuis le disque ou une clé USB. Recherche, clics sur les espaces,
fiches, vues et animation y fonctionnent. Le workflow la publie aussi à
l'adresse https://ninascherrer.github.io/Ocellis-Plan-/ocellis-plan-hors-ligne.html.

**Confidentialité.** Ce dépôt et le site sont publics : toute personne qui a
l'adresse peut consulter le plan. Le site n'est pas référencé par les moteurs
de recherche (`noindex`). Le PDF d'implantation, marqué « ne peut être
communiqué sans accord », n'est **pas** dans ce dépôt : la superposition du PDF
dans la vue 3D n'apparaît donc pas. Pour l'utiliser en local, placer le fichier
dans `public/plan/plan-pdf.jpg` (ignoré par git) et créer un fichier
`.env.development` contenant `VITE_CALQUE_PDF=1`.

## Fonctionnalités

- **Zoom et déplacement** : molette, pincement, glisser, double-clic ; boutons
  `+` / `−` et **Vue générale** pour revenir au plan entier (raccourcis `+`, `−`, `0`).
- **Zones cliquables** : survol et clic sur le plan ; la zone sélectionnée est
  entourée d'un contour coloré et le reste du plan s'estompe.
- **Fiche d'un espace** : nom, catégorie, description, informations pratiques,
  mention « Informations à confirmer » si besoin, bouton pour centrer et lien
  partageable (`…#<identifiant>`, par exemple `#materiautheque`).
- **Recherche** sans tenir compte des accents ni des majuscules (nom,
  catégorie, description, infos), navigation au clavier (`/` pour y accéder).
- **Filtres** par catégorie : espaces de travail, salles de réunion, espaces
  collaboratifs, espaces de convivialité, services et sanitaires, circulations.

## Maquette illustrée (vue d'ouverture)

Le site s'ouvre sur une **maquette axonométrique illustrée** du plateau, terrasse
comprise : dessin d'architecte à l'encre rehaussé d'aplats doux, mobilier,
personnages et végétation. Boutons **Maquette / Dessin / Original** en bas à droite.

- **Navigation** : à la souris, glisser pour pivoter et incliner (rotation libre) ; sur téléphone, un doigt déplace le plan et la rotation passe par les boutons ↺ ↻, molette ou
  pincement pour zoomer, clic droit, `Maj` + glisser ou deux doigts pour déplacer,
  double-clic pour zoomer ; boutons de quart de tour à côté du zoom ;
  **Vue générale** (touche `0`) revient à la vue de trois quarts depuis le sud-est.
- **Murs** : les cloisons des salles gardent leur hauteur quel que soit l'angle ;
  seules les façades tournées vers la caméra sont coupées bas. Un mur qui cache
  l'espace sélectionné passe en transparence.
- **Personnage animé** (premier essai) : une personne arrive du couloir nord,
  descend le couloir ouest, tourne dans l'allée du bench et va s'asseoir à un
  poste libre de l'open space ; elle y travaille un moment, puis s'efface et
  revient discrètement au départ (boucle d'environ 33 s). Le fauteuil de ce poste
  est dessiné par l'animation (vide, puis occupé).
  Une seconde personne arrive du palier des ascenseurs par la porte d'entrée,
  traverse Le Loby en contournant l'îlot et s'arrête au linéaire café, une tasse
  à la main (boucle d'environ 25 s). Elle est
  triée avec le reste de la maquette : les cloisons placées devant la masquent, et
  elle reste alignée au sol quand on zoome ou pivote. Bouton **Mettre les
  animations en pause** à côté de la rotation (choix mémorisé ; pause par défaut
  si le système demande de réduire les animations). Parcours et pauses :
  `MARCHEURS` dans `outils/maquette/plateau.py` ; déroulé : `src/maquette/marcheur.ts` ;
  les tests vérifient qu'elle reste à distance des cloisons et du mobilier.
  Pour ménager le processeur, seule la zone du personnage est redessinée à chaque image.
- **Matières** : veinage du bois, trame des tissus, lames de parquet et grain
  d'ensemble, posés selon les couleurs de la DA (omis pendant les gestes rapides).
- **Espaces** : les contours de `espaces.json` sont cliquables sur la maquette
  (survol, sélection, fiche, recherche, filtres, liens `#<identifiant>`) ; le
  reste du plan s'estompe autour de l'espace choisi. Au clic (ou via la
  recherche), le nom apparaît dans une bulle ovale reliée à la pièce par un trait
  courbe, en écriture manuscrite (Caveat) ; même bulle en vue Dessin
  (`src/components/Bulle.tsx`).
- **Rendu** : canvas 2D redessiné à chaque mouvement (`src/maquette/rendu.ts`),
  avec un tracé simplifié pendant le geste et une image complète à l'arrêt.
- **Données** : `public/maquette/scene.json`, généré par
  `python3 outils/maquette/export.py` à partir de `outils/maquette/plateau.py`
  (transcription du PDF d'implantation, 1/125). Voir `outils/maquette/README.md`.
- **[à confirmer]** : listés dans la légende de la maquette (`src/maquette/aConfirmer.ts`).
- **Couleurs** : palette de la DA du lieu (lin, sable, rose sable, terracotta,
  sauge, brume, ardoise, bleu pétrole), définie en tête de
  `outils/maquette/meubles.py` pour la maquette (relancer `export.py` après
  modification) et dans `src/styles/theme.css` (variables `--da-*`) pour
  l'interface et le dessin 2D. Couleurs des catégories : `src/config/espaces.json`.

L'ancien aperçu three.js limité au secteur nord (`src/plan3d/`) n'est plus affiché ;
son code est conservé.

Murs, cloisons et portes viennent d'un seul fichier, `src/plan/structure.ts`,
lu à la fois par le dessin 2D et par la 3D.

## Plan dessiné

- **Fichier** : `src/plan/PlanDessin.tsx`, organisé par calques (sol,
  circulations, mobilier, escaliers et ascenseurs, murs, portes, repères
  d'accessibilité). Chaque bloc est commenté avec le nom de l'espace concerné.
- **Circulations** : colorées automatiquement à partir des zones de catégorie
  « circulations » de `espaces.json` ; modifier leur contour dans le mode
  édition met aussi à jour la couleur ardoise du dessin.
- **Couleurs et épaisseurs** : variables `--plan-*` dans `src/styles/theme.css`.
- **Contrôle de l'alignement** : ouvrez l'application avec `?calque` pour
  superposer le plan d'origine en transparence au dessin.
- **Source de meilleure qualité** : un export DWG/DXF, PDF vectoriel ou SVG du
  plan permettrait de reprendre les mesures exactes au lieu de les relever sur
  l'image (624 × 625 pixels). Le repère `plan.largeur` / `plan.hauteur`
  resterait le même.

## Charte graphique

Les variables de design sont dans `src/styles/theme.css`. Couleurs : palette de
la DA du lieu (variables `--da-*`) — lin et sable pour les fonds, bleu pétrole
pour les actions, terracotta pour la sélection, ardoise pour les circulations,
sauge, rose sable, brume et gris bleuté en accents. Aucun violet. Typographies
de la charte Ocellis (Poppins pour les titres, Roboto pour le texte, EB Garamond
pour l'exergue), tailles de texte, espacements, rayons, ombres et durées
d'animation. Le logo (`src/assets/ocellis-logo.png`) est extrait tel quel de la
charte.

Les couleurs des catégories (`categories` dans `espaces.json`) reprennent la
même palette : bleu pétrole, terracotta, sauge, rose sable, gris bleuté et
ardoise.

## Modifier les noms et descriptions

Tout est centralisé dans **`src/config/espaces.json`** :

```jsonc
{
  "id": "espace-13",              // identifiant unique, utilisé dans les liens partagés
  "nom": "Espace 13",             // nom affiché
  "categorie": "reunion",         // travail | reunion | collaboratif | convivialite | services | circulations
  "description": "…",             // fonction de l'espace
  "infos": ["8 places", "Écran"], // informations pratiques (une ligne par élément)
  "aConfirmer": true,             // affiche « Informations à confirmer »
  "contour": [[412, 97], [482, 97], [482, 200], [412, 200]]
}
```

Le fichier est associé à un schéma (`espaces.schema.json`) : dans VS Code,
l'autocomplétion et la description de chaque champ s'affichent
automatiquement. Les libellés et couleurs des catégories se règlent dans la
section `categories` du même fichier, la charte générale (couleur de marque,
police, arrondis) dans `src/styles/theme.css`.

Après une modification, `npm test` signale les erreurs éventuelles
(identifiant en double, catégorie inconnue, sommet hors du plan…).

## Ajuster précisément les contours (mode édition)

Ouvrez l'application avec `?edition` dans l'adresse
(ex. `http://localhost:5173/?edition`). Le bouton **Éditer les zones** n'apparaît
qu'avec ce paramètre ; les collaborateurs ne le voient pas.

- Cliquez sur une zone pour la sélectionner, puis glissez ses sommets.
  Les sommets s'aimantent à ceux des zones voisines (maintenir `Alt` pour
  désactiver) et s'arrondissent au demi-pixel.
- Glissez un point médian pour ajouter un sommet, double-cliquez sur un sommet
  pour le supprimer.
- Flèches : déplacement fin du sommet sélectionné (0,5 ; `Maj` : 5), ou de
  toute la zone si aucun sommet n'est sélectionné. `Maj` + glisser déplace la zone.
- Saisie numérique des coordonnées du sommet sélectionné, ou de tout le
  contour (« Coordonnées (avancé) »).
- **Nouvelle zone** : cliquez chaque sommet sur le plan, puis le premier sommet
  ou `Entrée` pour fermer.
- Nom, catégorie, description, infos et identifiant se modifient dans le
  panneau ; `Ctrl+Z` / `Ctrl+Maj+Z` pour annuler / rétablir.

Les modifications sont conservées comme brouillon dans le navigateur. Pour les
publier : **Exporter espaces.json**, puis remplacez `src/config/espaces.json`
par le fichier téléchargé (son format est identique à l'original) et relancez
le build.

## Repère des coordonnées

Les contours sont exprimés en pixels de l'image d'origine (624 × 625),
déclarés dans `plan.largeur` / `plan.hauteur`, quelle que soit la résolution
des images affichées.

## Noms des espaces

Référence : **plan de zoning Ocellis « OCELLIS X CDG », indice 10 du
20/11/2026** (1/125). Il remplace le plan d'implantation et le plan d'éclairage
IPSO pour les noms, surfaces, places et le découpage des zones. Les murs et le
mobilier sont inchangés.

Principaux espaces : NOVA (salle créativité, 5 places), ECHO (salle de réunion,
4), HALO (salle visio, 3), OREE (salle silence, 5), OCELLE (salle de réunion
client, 10), OSMOSE (salle projet, 8), O'1 et O'2 (OFAD, 1 et 2), deux Bench
(12 et 6), Vue sur CDG (2), deux Touchdown, Box A/B/C et Salle Quatro (box),
Matériauthèque, **Le Loby** (entrée, 10 places) et **Bistro** (espace de vie,
28 places). Box A, B et C gardent ces noms pour les distinguer (le plan les
appelle « Box »).

Écarts du plan lui-même : le tableau récapitulatif indique 8 places pour la
salle créativité et 6 pour la salle de réunion, alors que les étiquettes des
pièces portent 5 et 4 places ; les fiches suivent les étiquettes.

## Concept et conception des espaces

Source : **« New Neuilly – Parcours visiteur – Argumentaire » (18/11/2026)**,
document de travail à compléter. Pour NOVA, ECHO, HALO, OREE, OCELLE, O'1, O'2,
OSMOSE, Bistro et les deux Bench, chaque fiche affiche :

- le **concept** (champ `concept` de `espaces.json`), sous le nom de l'espace ;
- la **conception** par thème (champ `conception`) : technique (acoustique,
  éclairage), mobilier, matériaux, bas carbone, accessibilité, audiovisuel.

Ces champs se modifient dans `espaces.json` ou dans le mode édition, et sont
pris en compte par la recherche (« acoustique », « réemploi »…).

## Organisation du code

```
src/
  assets/                    Logo Ocellis (extrait de la charte)
  config/espaces.json        Configuration centrale (plan, catégories, espaces)
  config/espaces.schema.json Schéma JSON (aide à la saisie)
  config/index.ts            Chargement et validation de la configuration
  components/PlanView.tsx    Plan SVG : dessin ou original, zones, surlignage
  components/Sidebar.tsx     Recherche, filtres et liste des espaces
  components/ZoneDetails.tsx Fiche de l'espace sélectionné
  components/editor/         Mode édition des contours
  hooks/usePanZoom.ts        Zoom, déplacement, pincement, animations
  hooks/usePlanEditor.ts     Logique d'édition des polygones
  hooks/useEditableConfig.ts Brouillon local, annuler / rétablir
  lib/                       Géométrie, recherche, export
  plan/PlanDessin.tsx        Plan redessiné en vecteurs
  plan/structure.ts          Murs, cloisons, portes et échelle (2D et 3D)
  plan3d/                    Aperçu 3D (three.js, chargé à la demande)
  styles/                    Variables de design (theme.css) et mise en page (app.css)
public/plan/                 Plan d'architecte d'origine (PNG) et PDF d'implantation (calque 3D)
```
