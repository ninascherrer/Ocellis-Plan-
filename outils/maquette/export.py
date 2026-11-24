# -*- coding: utf-8 -*-
"""Génère public/maquette/scene.json à partir de plateau.py.

    python3 outils/maquette/export.py
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import eng
import plateau as pl

TAGS_IMPORTANTS = {'siege', 'table', 'meuble', 'plante', 'pers'}

def chevauche(b, x0, y0, x1, y1):
    return b[0] < x1 and b[2] > x0 and b[1] < y1 and b[3] > y0

def hauteur_auto(w):
    """Hauteur d'un mur quand la pièce cachée est au sud ou à l'est (vue depuis le nord ou l'ouest)."""
    if w['k'] != 'int' or 'h2' in w:
        return
    x0, y0, x1, y1 = w['r']
    horiz = (x1 - x0) >= (y1 - y0)
    bande = (x0, y1, x1, y1 + 1.4) if horiz else (x1, y0, x1 + 1.4, y1)
    occupe = any(o.get('t') in TAGS_IMPORTANTS and o['b'][5] > 0.3 and chevauche(o['b'], *bande) for o in eng.OBJS)
    haut = w['h'] if w['h'] > pl.H_CUT + 0.01 else pl.H_PART
    w['h2'] = eng.r(min(haut, pl.H_CUT) if occupe else haut)

for w in eng.WALLS:
    hauteur_auto(w)

xs = [p[0] for p in pl.INTERIEUR + pl.TERRASSE]; ys = [p[1] for p in pl.INTERIEUR + pl.TERRASSE]
scene = {
    'version': 1,
    'source': "Plan d'implantation OCELLIS X CDG, indice 8 du 16-10-2026 (1/125)",
    'bornes': [eng.r(min(xs)), eng.r(min(ys)), eng.r(max(xs)), eng.r(max(ys))],
    # Passage du repère du plan du site (624 x 625) aux mètres de la maquette : X = (x - ox) / kx, Y = (y - oy) / ky
    'repere': {'ox': 33, 'oy': 2, 'kx': 23.47, 'ky': 23.73},
    'hauteurs': {'facadeAvant': pl.H_FRONT, 'facadeFond': pl.H_BACK},
    'sol': eng.FLOOR,
    'ombres': eng.SHADOW,
    'seuils': eng.THRESH,
    'marquages': eng.LAB,
    'murs': eng.WALLS,
    'objets': eng.OBJS,
}
dest = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'maquette', 'scene.json')
os.makedirs(os.path.dirname(dest), exist_ok=True)
txt = json.dumps(scene, ensure_ascii=False, separators=(',', ':'))
open(dest, 'w').write(txt)
print('objets', len(eng.OBJS), 'murs', len(eng.WALLS), 'personnes', eng.PERS_COUNT[0], 'taille', len(txt) // 1024, 'Ko')
