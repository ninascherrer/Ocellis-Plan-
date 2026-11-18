# -*- coding: utf-8 -*-
"""Moteur d'export de la maquette axonométrique.

Le générateur décrit la scène en primitives 3D indépendantes du point de vue ;
le rendu (src/maquette/rendu.ts) projette, trie et dessine à chaque image.

Repère : mètres, X vers l'est, Y vers le sud, Z vers le haut.
Les « billboards » (feuilles, pastilles, abat-jour…) sont ancrés sur un point 3D
avec des décalages en pixels exprimés pour une échelle de 40 px / m.
"""
import math, random

INK = '#2b2724'
S = 40.0   # échelle de référence des décalages en pixels

OBJS = []     # volumes triés à chaque image
FLOOR = []    # sol, dans l'ordre
SHADOW = []   # ombres de contact
THRESH = []   # seuils, arcs de portes
LAB = []      # marquages au sol (cheminement terrasse…)
WALLS = []    # murs à hauteur variable selon le point de vue

def r(v):
    return round(v, 3)

def flat3(pts):
    out = []
    for p in pts:
        out += [r(p[0]), r(p[1]), r(p[2])]
    return out

def flat2(pts):
    out = []
    for p in pts:
        out += [r(p[0]), r(p[1])]
    return out

def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

def shade(h, f):
    rr, g, b = hexrgb(h)
    if f <= 1:
        rr, g, b = rr * f, g * f, b * f
    else:
        t = f - 1
        rr, g, b = rr + (255 - rr) * t, g + (255 - g) * t, b + (255 - b) * t
    return '#%02x%02x%02x' % (int(max(0, min(255, rr))), int(max(0, min(255, g))), int(max(0, min(255, b))))

# ---------------------------------------------------------------- primitives
def P(pts3, fill, stroke=INK, sw=0.5, **o):
    """Polygone 3D plan (o : op=opacité du fond, sop, dash, n=[nx,ny] normale pour masquer de dos,
    nf=[nx,ny,couleurDos] couleur selon le côté vu, det=1 détail)."""
    return [['P', flat3(pts3), fill, stroke, sw, o]] if o else [['P', flat3(pts3), fill, stroke, sw]]

def L(pts3, stroke=INK, sw=0.5, **o):
    return [['L', flat3(pts3), stroke, sw, o]] if o else [['L', flat3(pts3), stroke, sw]]

def H(pts3, fill, stroke=INK, sw=0.5):
    return [['H', flat3(pts3), fill, stroke, sw]]

def BOX(x0, y0, x1, y1, z0, z1, col, sw=0.5, top=None, stroke=INK):
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    a = ['B', r(x0), r(y0), r(x1), r(y1), r(z0), r(z1), col, sw]
    if top or stroke != INK:
        a += [top or 0, stroke]
    return [a]

def PR(pts2, z0, z1, col, sw=0.5, smooth=False, top=None, face=None, stroke=INK):
    """Prisme. face=[ux,uy,couleur] : faces dont la normale suit (ux,uy) prennent cette couleur."""
    a = ['R', flat2(pts2), r(z0), r(z1), col, sw, 1 if smooth else 0]
    if top or face or stroke != INK:
        a += [top or 0, face or 0, stroke]
    return [a]

def C(p3, rx, ry, fill, stroke=INK, sw=0.4):
    return [['C', r(p3[0]), r(p3[1]), r(p3[2]), r(rx), r(ry), fill, stroke, sw]]

def LEAF(p3, a, b, w, fill, sw=0.35, op=1.0, n=None, det=0):
    o = [r(p3[0]), r(p3[1]), r(p3[2]), r(a[0]), r(a[1]), r(b[0]), r(b[1]), r(w), fill, sw]
    ext = {}
    if op != 1.0: ext['op'] = op
    if n: ext['n'] = n
    if det: ext['det'] = 1
    return [['F'] + o + ([ext] if ext else [])]

def BL(p3, offs, fill, stroke=INK, sw=0.4, closed=True):
    """Billboard : polygone (ou ligne si closed=False) en décalages px autour d'un point 3D."""
    return [['K', r(p3[0]), r(p3[1]), r(p3[2]), flat2(offs), fill, stroke, sw, 1 if closed else 0]]

def BQ(p3, ctrl, end, stroke, sw):
    """Billboard : courbe quadratique depuis l'ancre."""
    return [['Q', r(p3[0]), r(p3[1]), r(p3[2]), r(ctrl[0]), r(ctrl[1]), r(end[0]), r(end[1]), stroke, sw]]

def G(c3, prims):
    """Sous-groupe trié selon la profondeur de son centre c3."""
    return [['G', [r(c3[0]), r(c3[1]), r(c3[2])], prims]]

PERS_COUNT = [0]
def PERS(x, y, ang, pose, seat, lean, st):
    PERS_COUNT[0] += 1
    return [['M', r(x), r(y), r(ang), pose, r(seat), r(lean),
             [st['skin'], st['hair'], st['top'], st['pants'], st['hs'], 1 if st['skirt'] else 0, st['shoes']]]]

def add(bb, prims, margin=0, depth=None, tag=None):
    x0, y0, x1, y1, z0, z1 = bb
    o = {'b': [r(x0), r(y0), r(x1), r(y1), r(z0), r(z1)], 'p': prims}
    if margin: o['m'] = margin
    if tag: o['t'] = tag
    OBJS.append(o)
    return o

# ---------------------------------------------------------------- géométrie
def hull2(P_):
    P_ = sorted(set((round(x, 4), round(y, 4)) for x, y in P_))
    if len(P_) <= 2:
        return P_
    def cross(o, a, b):
        return (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0])
    lo, up = [], []
    for p in P_:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0: lo.pop()
        lo.append(p)
    for p in reversed(P_):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0: up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]

def rot(P_, cx, cy, ang):
    c, s = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    return [(cx + x * c - y * s, cy + x * s + y * c) for x, y in P_]

def rect_pts(cx, cy, w, d, ang=0):
    return rot([(-w/2, -d/2), (w/2, -d/2), (w/2, d/2), (-w/2, d/2)], cx, cy, ang)

def circle_pts(cx, cy, rad, n=28, a0=0, a1=360, ry=None):
    ry = ry or rad
    out = []
    for k in range(n):
        t = math.radians(a0 + (a1 - a0) * k / (n if a1 - a0 >= 360 else n - 1))
        out.append((cx + rad * math.cos(t), cy + ry * math.sin(t)))
    return out

def stadium_pts(cx, cy, Ln, W, ang=0, n=10):
    rad = W / 2; hl = Ln / 2 - rad
    P_ = []
    for k in range(n + 1):
        t = math.radians(-90 + 180 * k / n); P_.append((hl + rad * math.cos(t), rad * math.sin(t)))
    for k in range(n + 1):
        t = math.radians(90 + 180 * k / n); P_.append((-hl + rad * math.cos(t), rad * math.sin(t)))
    return rot(P_, cx, cy, ang)

def rrect_pts(cx, cy, w, d, rad, ang=0, n=4):
    P_ = []
    hw, hd = w / 2 - rad, d / 2 - rad
    for (sx, sy, a0) in ((1, 1, 0), (-1, 1, 90), (-1, -1, 180), (1, -1, 270)):
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / n)
            P_.append((sx * hw + rad * math.cos(t), sy * hd + rad * math.sin(t)))
    return rot(P_, cx, cy, ang)

def bb2(P_, z0, z1):
    xs = [p[0] for p in P_]; ys = [p[1] for p in P_]
    return (min(xs), min(ys), max(xs), max(ys), z0, z1)

def shadow(P_, op=0.075, grow=0.05, off=(0.05, 0.05)):
    cx = sum(p[0] for p in P_) / len(P_); cy = sum(p[1] for p in P_) / len(P_)
    Q = []
    for x, y in P_:
        dx, dy = x - cx, y - cy
        l = math.hypot(dx, dy) or 1
        Q.append((x + dx / l * grow + off[0], y + dy / l * grow + off[1], 0))
    SHADOW.extend(P(Q, '#5a4636', None, 0, op=op))

def floor_poly(P2, fill, stroke=None, sw=0.0, z=0.0, layer=None, **o):
    (layer if layer is not None else FLOOR).extend(P([(x, y, z) for x, y in P2], fill, stroke, sw, **o))

def SEGS(pairs3, stroke, sw, **o):
    pts = []
    for a, b in pairs3:
        pts += [a, b]
    return [['S', flat3(pts), stroke, sw, o]] if o else [['S', flat3(pts), stroke, sw]]

def floor_lines(lines, stroke, sw, z=0.0, layer=None, **o):
    lay = layer if layer is not None else FLOOR
    lay.extend(SEGS([((a[0], a[1], z), (b[0], b[1], z)) for a, b in lines], stroke, sw, **o))
