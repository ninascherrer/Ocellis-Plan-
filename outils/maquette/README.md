# Générateur de la maquette illustrée

Décrit le plateau R6 en primitives 3D (murs, vitrages, mobilier, personnages,
végétation) et produit `public/maquette/scene.json`, lu par `src/maquette/rendu.ts`.

```bash
python3 outils/maquette/export.py
```

- `plateau.py` : la scène. Coordonnées relevées sur le PDF d'implantation rastérisé
  à 110 dpi (1/125 : 34,7 px = 1 m), origine à l'angle intérieur nord-ouest.
- `meubles.py` : bibliothèque (sièges, tables, rangements, plantes, arbre, portes, vitrages, murs).
- `eng.py` : primitives exportées (polygones, lignes, boîtes, prismes, billboards, personnages).
- `export.py` : hauteur des cloisons vue depuis le nord ou l'ouest, puis écriture du JSON.

Hauteur d'un mur : `h` quand la pièce cachée est au nord ou à l'ouest (choix de la
planche vue du sud-est), `h2` calculée quand elle est au sud ou à l'est (1 m si du
mobilier se trouve dans la bande de 1,4 m masquée). Les façades (`k: 'ext'`) sont
coupées à 0,42 m quand leur normale extérieure `o` regarde la caméra.

Le passage du repère du plan du site (624 × 625) aux mètres est dans `scene.json`
(`repere`) : `X = (x − 33) / 23,47`, `Y = (y − 2) / 23,73`.
