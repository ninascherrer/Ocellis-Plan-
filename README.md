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
à droite) affiche le plan d'architecte d'origine (`public/plan/plan-ocellis.png`).

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

- **Navigation** : glisser pour pivoter et incliner (rotation libre), molette ou
  pincement pour zoomer, clic droit, `Maj` + glisser ou deux doigts pour déplacer,
  double-clic pour zoomer ; boutons de quart de tour à côté du zoom ;
  **Vue générale** (touche `0`) revient à la vue de trois quarts depuis le sud-est.
- **Coupe automatique** : selon l'angle, les façades tournées vers la caméra sont
  coupées bas et les cloisons qui masquent une pièce meublée sont coupées à 1 m ;
  les murs qui cachent l'espace sélectionné s'abaissent.
- **Espaces** : les contours de `espaces.json` sont cliquables sur la maquette
  (survol, sélection, fiche, recherche, filtres, liens `#<identifiant>`) ; le
  reste du plan s'estompe autour de l'espace choisi. Les noms s'affichent au sol.
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
  édition met aussi à jour la couleur aubergine du dessin.
- **Couleurs et épaisseurs** : variables `--plan-*` dans `src/styles/theme.css`.
- **Contrôle de l'alignement** : ouvrez l'application avec `?calque` pour
  superposer le plan d'origine en transparence au dessin.
- **Source de meilleure qualité** : un export DWG/DXF, PDF vectoriel ou SVG du
  plan permettrait de reprendre les mesures exactes au lieu de les relever sur
  l'image (624 × 625 pixels). Le repère `plan.largeur` / `plan.hauteur`
  resterait le même.

## Charte graphique

Les variables de design sont dans `src/styles/theme.css` : palette réduite
(aubergine de la charte Ocellis pour les circulations, la sélection et les
actions ; blanc et beige très clair pour le fond ; anthracite pour les traits
et le texte), typographies (Poppins pour les titres, Roboto pour le texte,
EB Garamond pour l'exergue), tailles de texte, espacements, rayons, ombres et
durées d'animation. Le logo (`src/assets/ocellis-logo.png`) est extrait tel
quel de la charte.

Les couleurs des catégories (`categories` dans `espaces.json`) sont des
nuances d'aubergine, de rose poudré, de sable et de gris ; elles n'apparaissent
que dans la légende, la liste et au survol ou au filtrage des zones.

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

Les noms viennent de la liste des espaces fournie par Ocellis, associée à
chaque zone d'après le mobilier dessiné sur le plan. Les zones dont
l'association reste à valider affichent « Informations à confirmer »
(`"aConfirmer": true` dans `espaces.json`). Deux zones n'ont pas de
correspondance dans la liste et gardent un nom provisoire : **Espace 07**
(volume annoté « Box autonome » au plan) et **Espace 09** (petit local de la
colonne de services).

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
