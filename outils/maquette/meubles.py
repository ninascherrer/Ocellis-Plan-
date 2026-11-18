# -*- coding: utf-8 -*-
"""Mobilier, architecture, végétation et personnages, en primitives 3D."""
import math, random
from eng import *
import eng

R = random.Random(7)

WHITE = '#f7f4ee'; WOOD = '#e4cda8'; WOOD2 = '#d8bb8f'; OAK_DARK = '#b8946a'
SAGE = '#b9c3a5'; SAGE_L = '#d7ddca'; SAGE_D = '#8e9b7a'
BEIGE = '#e9dcc6'; BEIGE_D = '#d4c2a5'
PLUM = '#7a3e63'; PLUM_M = '#a96b92'; PLUM_L = '#c9a2bb'; PLUM_XL = '#e6d3de'
ROSE = '#dcc4bf'; ROSE_D = '#c9aaa4'
GREYL = '#e8e5df'; GREY = '#cdc9c2'; GREYM = '#a7a29b'; CHAR = '#5f5a55'
GLASS = '#cfe4e2'; TERRA = '#c98b6b'; BLUEG = '#8fa6b3'
WALL_S = '#f2ede4'
FINE = 0.45

def G(c3, prims, bias=0.0):
    g = ['G', [r(c3[0]), r(c3[1]), r(c3[2])], prims]
    if bias: g.append(bias)
    return [g]

# ---------------------------------------------------------------- personnages
SKINS = ['#f2d0b6', '#e5b694', '#c99069', '#9c6a4a', '#73503a', '#f7dfcc', '#d9a47e']
HAIRS = ['#2c2420', '#5b3e2c', '#8b6a4a', '#c8a46e', '#b9b3aa', '#1f1b1a', '#7b3f2b', '#3d2f28']
TOPS = [SAGE, PLUM_M, '#d9b2ad', '#56637a', BEIGE_D, '#d6ad62', '#c98b6b', '#a9c0cc', '#f3efe6', '#8a8f63', '#e8d6a8', PLUM]
PANTS = ['#4a5569', '#4b4744', '#cdbb9c', '#6f879f', '#3a3634', '#7e8460', '#8b5e4f', '#e2d8c6']

def style(rng):
    return dict(skin=rng.choice(SKINS), hair=rng.choice(HAIRS), top=rng.choice(TOPS),
                pants=rng.choice(PANTS), hs=rng.choice(['short', 'short', 'long', 'bun', 'crop', 'long']),
                skirt=rng.random() < 0.18, shoes=rng.choice(['#3a3532', '#6b5a4d', '#f1ede6', '#3a3532']))

def person_prims(x, y, ang, pose='stand', seat=0.46, st=None, lean=0.0):
    return PERS(x, y, ang, pose, seat, lean, st or style(R))

def person(x, y, ang, pose='stand', st=None):
    shadow(circle_pts(x, y, 0.2, 14), op=0.08, grow=0.0, off=(0.04, 0.04))
    return add((x - 0.22, y - 0.22, x + 0.22, y + 0.22, 0, 1.72), person_prims(x, y, ang, pose, st=st), margin=6, tag='pers')

def _seat_person(parts, x, y, ang, pose, seat_h, st=None, lean=0.0):
    if pose:
        parts += G((x, y, seat_h), person_prims(x, y, ang, pose, seat_h, st, lean), 0.001)

# ---------------------------------------------------------------- sièges
def task_chair(x, y, ang, col=None, person=None, st=None):
    col = col or R.choice([CHAR, '#77726c', SAGE_D, '#77726c'])
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa))
    base = []
    for k in range(5):
        t = fa + math.radians(36 + 72 * k)
        b = (x + 0.30 * math.cos(t), y + 0.30 * math.sin(t), 0.04)
        base += L([(x, y, 0.07), b], INK, 1.2)
        base += C((b[0], b[1], 0.015), 1.1, 1.1, CHAR, INK, 0.35)
    base += L([(x, y, 0.07), (x, y, 0.42)], INK, 1.4)
    parts = G((x, y, 0.05), base, -0.5)
    parts += G((x, y, 0.44), PR(rrect_pts(x, y, 0.48, 0.47, 0.08, ang), 0.40, 0.47, col, FINE, smooth=True))
    bx, by = x - f[0] * 0.25, y - f[1] * 0.25
    parts += G((bx, by, 0.8), PR(rrect_pts(bx, by, 0.07, 0.46, 0.03, ang), 0.55, 1.0, col, FINE, smooth=True) +
               L([(x - f[0] * 0.2, y - f[1] * 0.2, 0.44), (bx, by, 0.6)], INK, 1.0), 0.0001)
    _seat_person(parts, x + f[0] * 0.02, y + f[1] * 0.02, ang, person, 0.47, st)
    shadow(circle_pts(x, y, 0.3, 14), op=0.07, grow=0.0)
    return add((x - 0.3, y - 0.3, x + 0.3, y + 0.3, 0, 1.3 if person else 1.0), parts, tag='siege')

def shell_chair(x, y, ang, col=None, person=None, st=None, legs=WOOD2, seat_h=0.46, w=0.5):
    col = col or PLUM_L
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa)); l = (-f[1], f[0])
    lg = []
    for sf, sl in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        a = (x + f[0] * 0.19 * sf + l[0] * 0.19 * sl, y + f[1] * 0.19 * sf + l[1] * 0.19 * sl)
        b = (x + f[0] * 0.15 * sf + l[0] * 0.15 * sl, y + f[1] * 0.15 * sf + l[1] * 0.15 * sl)
        lg += G((a[0], a[1], 0.2), L([(a[0], a[1], 0), (b[0], b[1], seat_h - 0.05)], INK, 1.5) +
                L([(a[0], a[1], 0), (b[0], b[1], seat_h - 0.05)], legs, 0.8))
    parts = G((x, y, 0.2), lg, -0.4)
    parts += G((x, y, seat_h), PR(rrect_pts(x, y, w, w, 0.12, ang, 5), seat_h - 0.05, seat_h, col, FINE, smooth=True))
    bx, by = x - f[0] * 0.23, y - f[1] * 0.23
    arc = [(bx + l[0] * w * 0.5 * math.cos(t) - f[0] * 0.05 * math.sin(t), by + l[1] * w * 0.5 * math.cos(t) - f[1] * 0.05 * math.sin(t))
           for t in [math.radians(a) for a in range(0, 181, 20)]]
    arc = arc + [(px + f[0] * 0.05, py + f[1] * 0.05) for px, py in reversed(arc)]
    parts += G((bx, by, seat_h + 0.2), PR(hull2(arc), seat_h, seat_h + 0.38, col, FINE, smooth=True), 0.0001)
    _seat_person(parts, x + f[0] * 0.03, y + f[1] * 0.03, ang, person, seat_h, st)
    shadow(circle_pts(x, y, 0.27, 14), op=0.07, grow=0.0)
    return add((x - 0.28, y - 0.28, x + 0.28, y + 0.28, 0, 1.25 if person else 0.85), parts, tag='siege')

def stool(x, y, h=0.75, col=None, person=None, ang=0, st=None):
    col = col or ROSE_D
    lg = []
    for k in range(4):
        t = math.radians(45 + 90 * k)
        a = (x + 0.2 * math.cos(t), y + 0.2 * math.sin(t)); b = (x + 0.13 * math.cos(t), y + 0.13 * math.sin(t))
        lg += G((a[0], a[1], 0.3), L([(a[0], a[1], 0), (b[0], b[1], h - 0.03)], INK, 1.3) +
                L([(a[0], a[1], 0), (b[0], b[1], h - 0.03)], OAK_DARK, 0.6))
    ring = [(x + 0.17 * math.cos(math.radians(a)), y + 0.17 * math.sin(math.radians(a)), 0.28) for a in range(0, 361, 30)]
    parts = G((x, y, 0.3), lg + L(ring, INK, 0.45), -0.3)
    parts += G((x, y, h), PR(circle_pts(x, y, 0.19, 20), h - 0.05, h, col, FINE, smooth=True))
    _seat_person(parts, x, y, ang, person, h, st)
    shadow(circle_pts(x, y, 0.22, 14), op=0.07, grow=0.0)
    return add((x - 0.22, y - 0.22, x + 0.22, y + 0.22, 0, 1.6 if person else h), parts, tag='siege')

def armchair(x, y, ang, col=None, person=None, st=None, w=0.78, d=0.78, seat_h=0.42):
    col = col or ROSE
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa)); l = (-f[1], f[0])
    def Pp(df, dl): return (x + f[0] * df + l[0] * dl, y + f[1] * df + l[1] * dl)
    baseP = rrect_pts(x, y, d, w, 0.07, ang)
    parts = G((x, y, 0.2), PR(baseP, 0.08, seat_h - 0.08, col, FINE), -0.2)
    c = Pp(0.07, 0)
    parts += G((c[0], c[1], seat_h), PR(rrect_pts(c[0], c[1], d - 0.22, w - 0.2, 0.06, ang), seat_h - 0.08, seat_h, shade(col, 1.05), FINE, smooth=True))
    c = Pp(-d / 2 + 0.08, 0)
    parts += G((c[0], c[1], 0.4), PR(rrect_pts(c[0], c[1], 0.16, w, 0.05, ang), 0.08, 0.78, col, FINE))
    for s in (1, -1):
        a = Pp(0.02, s * (w / 2 - 0.07))
        parts += G((a[0], a[1], 0.35), PR(rrect_pts(a[0], a[1], d - 0.1, 0.14, 0.04, ang), 0.08, 0.6, col, FINE))
    c = Pp(0.06, 0)
    _seat_person(parts, c[0], c[1], ang, person, seat_h, st, lean=0.08)
    shadow(baseP, op=0.08)
    return add((x - 0.45, y - 0.45, x + 0.45, y + 0.45, 0, 1.2 if person else 0.78), parts, tag='siege')

# ---------------------------------------------------------------- objets de table
def laptop(x, y, ang, z):
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa)); l = (-f[1], f[0])
    def Q(df, dl, dz=0): return (x + f[0] * df + l[0] * dl, y + f[1] * df + l[1] * dl, z + dz)
    s = P([Q(-0.11, -0.16), Q(-0.11, 0.16), Q(0.11, 0.16), Q(0.11, -0.16)], '#dcdad6', INK, 0.4)
    # écran : face visible côté utilisateur (-f) sombre, dos clair
    s += P([Q(0.11, -0.16), Q(0.11, 0.16), Q(0.16, 0.16, 0.2), Q(0.16, -0.16, 0.2)], '#5a6068', INK, 0.4,
           nf=[r(-f[0]), r(-f[1]), '#d0cdc8'])
    return s

def monitor(x, y, ang, z):
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa))
    s = L([(x - f[0] * 0.05, y - f[1] * 0.05, z), (x - f[0] * 0.05, y - f[1] * 0.05, z + 0.22)], INK, 1.2)
    s += PR(rect_pts(x, y, 0.025, 0.56, ang), z + 0.17, z + 0.5, '#dedbd6', 0.45, face=[r(-f[0]), r(-f[1]), '#4d535b'])
    return s

def mug(x, y, z, col='#f7f4ee'):
    return PR(circle_pts(x, y, 0.045, 12), z, z + 0.095, col, 0.4, smooth=True)

def notebook(x, y, ang, z, col=None):
    col = col or R.choice([PLUM_M, SAGE_D, '#d6ad62', TERRA])
    return P([(px, py, z + 0.01) for px, py in rect_pts(x, y, 0.21, 0.15, ang + 8)], col, INK, 0.4)

def desk_lamp(x, y, ang, z):
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa))
    a = (x, y, z); b = (x + f[0] * 0.05, y + f[1] * 0.05, z + 0.38); c = (x + f[0] * 0.2, y + f[1] * 0.2, z + 0.42)
    s = C(a, 2.6, 1.4, CHAR, INK, 0.4)
    s += L([a, b, c], INK, 0.7)
    s += BL(c, [(-2.5, 2.5), (2.5, 2.5), (1.3, -1.3), (-1.3, -1.3)], '#d6ad62', INK, 0.4)
    return s

def leaf_fan(anchor, rng, n, lmin, lmax, size, cols, spread=(-170, -10), up=0.25, sw=0.4):
    s = []
    for k in range(n):
        t = math.radians(rng.uniform(*spread))
        Lf = rng.uniform(lmin, lmax) * S * size
        stem = (Lf * 0.5 * math.cos(t), Lf * 0.6 * math.sin(t) - 0.1 * S * size)
        tip = (Lf * math.cos(t) * 1.05, Lf * math.sin(t) * 0.9 - up * S * size)
        s.append((tip[1], BL(anchor, [(0, 0), stem], 'none', INK, 0.35, closed=False) +
                  LEAF(anchor, stem, tip, Lf * 0.25, rng.choice(cols), sw)))
    s.sort(key=lambda t: -t[0])
    out = []
    for t in s: out += t[1]
    return out

def plant_small(x, y, z, rng=None):
    rng = rng or R
    s = PR(circle_pts(x, y, 0.07, 12), z, z + 0.1, '#f2eee7', 0.4, smooth=True)
    top = (x, y, z + 0.1)
    for k in range(7):
        t = math.radians(-160 + 140 * k / 6 + rng.uniform(-8, 8))
        Lf = rng.uniform(5, 8)
        s += LEAF(top, (0, 0), (Lf * math.cos(t), Lf * math.sin(t)), 1.4, rng.choice([SAGE, SAGE_D, SAGE_L]), 0.35)
    return s

def desk(x0, y0, x1, y1, h=0.74, top=WHITE, leg=CHAR, items=(), panel=None, frame='legs'):
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    parts = []
    i = 0.05
    if frame == 'legs':
        for (px, py) in ((x0 + i, y0 + i), (x1 - i, y0 + i), (x0 + i, y1 - i), (x1 - i, y1 - i)):
            parts += G((px, py, 0.3), L([(px, py, 0), (px, py, h - 0.03)], INK, 1.6) + L([(px, py, 0), (px, py, h - 0.03)], leg, 0.7), -0.5)
    elif frame == 'trestle':
        for px in (x0 + 0.12, x1 - 0.12):
            parts += G((px, (y0 + y1) / 2, 0.3), PR([(px - 0.02, y0 + 0.08), (px + 0.02, y0 + 0.08), (px + 0.02, y1 - 0.08), (px - 0.02, y1 - 0.08)], 0, h - 0.03, leg, FINE), -0.5)
    elif frame == 'trestle_y':
        for py in (y0 + 0.12, y1 - 0.12):
            parts += G(((x0 + x1) / 2, py, 0.3), PR([(x0 + 0.08, py - 0.02), (x1 - 0.08, py - 0.02), (x1 - 0.08, py + 0.02), (x0 + 0.08, py + 0.02)], 0, h - 0.03, leg, FINE), -0.5)
    topg = BOX(x0, y0, x1, y1, h - 0.03, h, top, FINE)
    if panel:
        ax, col = panel
        if ax == 'x':
            ym = (y0 + y1) / 2
            topg += BOX(x0 + 0.05, ym - 0.012, x1 - 0.05, ym + 0.012, h, h + 0.38, col, FINE)
        else:
            xm = (x0 + x1) / 2
            topg += BOX(xm - 0.012, y0 + 0.05, xm + 0.012, y1 - 0.05, h, h + 0.38, col, FINE)
    parts += G(((x0 + x1) / 2, (y0 + y1) / 2, h), topg)
    # objets posés : triés entre eux
    for it in items:
        pr_ = it(h)
        c = _centre(pr_)
        parts += G((c[0], c[1], h + 0.1), pr_, 0.5)
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], op=0.06, grow=0.02)
    return add((x0, y0, x1, y1, 0, h + 0.5), parts, tag='table')

def _centre(prims):
    xs, ys = [], []
    def walk(ps):
        for p in ps:
            t = p[0]
            if t in ('P', 'L', 'H', 'S'):
                a = p[1]
                xs.extend(a[0::3]); ys.extend(a[1::3])
            elif t == 'B':
                xs.extend([p[1], p[3]]); ys.extend([p[2], p[4]])
            elif t == 'R':
                xs.extend(p[1][0::2]); ys.extend(p[1][1::2])
            elif t in ('C', 'F', 'K', 'Q', 'M'):
                xs.append(p[1]); ys.append(p[2])
            elif t == 'G':
                walk(p[2])
    walk(prims)
    if not xs: return (0, 0)
    return (sum(xs) / len(xs), sum(ys) / len(ys))

def table_round(x, y, rad, h=0.74, top=WHITE, items=(), base=CHAR):
    s = L([(x, y, 0.02), (x, y, h - 0.03)], INK, 2.4) + L([(x, y, 0.02), (x, y, h - 0.03)], base, 1.2)
    s += PR(circle_pts(x, y, min(0.25, rad * 0.6), 16), 0, 0.03, base, 0.4, smooth=True)
    parts = G((x, y, 0.2), s, -0.5)
    parts += G((x, y, h), PR(circle_pts(x, y, rad, 32), h - 0.03, h, top, FINE, smooth=True))
    for it in items:
        pr_ = it(h); c = _centre(pr_)
        parts += G((c[0], c[1], h + 0.1), pr_, 0.5)
    shadow(circle_pts(x, y, rad, 20), op=0.06, grow=0.0)
    return add((x - rad, y - rad, x + rad, y + rad, 0, h + 0.3), parts, tag='table')

def table_shape(P2, h=0.74, top=WHITE, legs=(), items=(), leg=CHAR, ped=None):
    parts = []
    for (px, py) in legs:
        parts += G((px, py, 0.3), L([(px, py, 0), (px, py, h - 0.03)], INK, 1.8) + L([(px, py, 0), (px, py, h - 0.03)], leg, 0.8), -0.5)
    if ped:
        for (px, py, w, d) in ped:
            parts += G((px, py, 0.3), BOX(px - w / 2, py - d / 2, px + w / 2, py + d / 2, 0, h - 0.03, leg, FINE), -0.5)
    cx = sum(p[0] for p in P2) / len(P2); cy = sum(p[1] for p in P2) / len(P2)
    parts += G((cx, cy, h), PR(P2, h - 0.035, h, top, FINE, smooth=True))
    for it in items:
        pr_ = it(h); c = _centre(pr_)
        parts += G((c[0], c[1], h + 0.1), pr_, 0.5)
    shadow(P2, op=0.06, grow=0.0)
    return add(bb2(P2, 0, h + 0.3), parts, tag='table')

# ---------------------------------------------------------------- assises longues
def sofa(x0, y0, x1, y1, back='n', col=ROSE, arms=True, seat_h=0.42, back_h=0.8, persons=(), pillows=0, pcol=None, modules=None):
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    parts = []
    bt = 0.18
    horiz = back in ('n', 's')
    Ln = (x1 - x0) if horiz else (y1 - y0)
    if back == 'n': bk = (x0, y0, x1, y0 + bt)
    elif back == 's': bk = (x0, y1 - bt, x1, y1)
    elif back == 'w': bk = (x0, y0, x0 + bt, y1)
    else: bk = (x1 - bt, y0, x1, y1)
    parts += G(((bk[0] + bk[2]) / 2, (bk[1] + bk[3]) / 2, 0.4), BOX(*bk, 0.08, back_h, col, FINE))
    parts += G(((x0 + x1) / 2, (y0 + y1) / 2, 0.2), BOX(x0, y0, x1, y1, 0.06, seat_h - 0.1, shade(col, 0.97), FINE), -0.3)
    n = modules or max(1, round(Ln / 0.7))
    for k in range(n):
        if horiz:
            a, b = x0 + 0.05 + (Ln - 0.1) * k / n, x0 + 0.05 + (Ln - 0.1) * (k + 1) / n
            cy0, cy1 = (y0 + bt, y1 - 0.03) if back == 'n' else (y0 + 0.03, y1 - bt)
            Pc = rrect_pts((a + b) / 2, (cy0 + cy1) / 2, b - a - 0.02, cy1 - cy0, 0.05)
        else:
            a, b = y0 + 0.05 + (Ln - 0.1) * k / n, y0 + 0.05 + (Ln - 0.1) * (k + 1) / n
            cx0, cx1 = (x0 + bt, x1 - 0.03) if back == 'w' else (x0 + 0.03, x1 - bt)
            Pc = rrect_pts((cx0 + cx1) / 2, (a + b) / 2, cx1 - cx0, b - a - 0.02, 0.05)
        c = (sum(p[0] for p in Pc) / len(Pc), sum(p[1] for p in Pc) / len(Pc))
        parts += G((c[0], c[1], seat_h), PR(Pc, seat_h - 0.1, seat_h, shade(col, 1.06), FINE, smooth=True), -0.2)
    if arms:
        if horiz:
            for ax in (x0, x1 - 0.14):
                parts += G((ax + 0.07, (y0 + y1) / 2, 0.3), BOX(ax, y0, ax + 0.14, y1, 0.06, seat_h + 0.2, col, FINE))
        else:
            for ay in (y0, y1 - 0.14):
                parts += G(((x0 + x1) / 2, ay + 0.07, 0.3), BOX(x0, ay, x1, ay + 0.14, 0.06, seat_h + 0.2, col, FINE))
    rr = random.Random(int(x0 * 100 + y0 * 37))
    for k in range(pillows):
        t = (k + 0.5) / pillows
        if horiz:
            px = x0 + 0.25 + (Ln - 0.5) * t; py = (y0 + bt + 0.08) if back == 'n' else (y1 - bt - 0.08)
        else:
            py = y0 + 0.25 + (Ln - 0.5) * t; px = (x0 + bt + 0.08) if back == 'w' else (x1 - bt - 0.08)
        Pp = rect_pts(px, py, 0.12, 0.4, {'n': 90, 's': -90, 'w': 0, 'e': 180}[back] + rr.uniform(-12, 12))
        parts += G((px, py, seat_h + 0.15), PR(Pp, seat_h, seat_h + 0.34, pcol or rr.choice([GREYL, BEIGE, PLUM_XL, SAGE_L]), FINE, smooth=True), 0.05)
    face = {'n': 90, 's': -90, 'w': 0, 'e': 180}[back]
    for (t, pose) in persons:
        if horiz:
            px = x0 + Ln * t; py = (y0 + bt + 0.22) if back == 'n' else (y1 - bt - 0.22)
        else:
            py = y0 + Ln * t; px = (x0 + bt + 0.22) if back == 'w' else (x1 - bt - 0.22)
        parts += G((px, py, seat_h), person_prims(px, py, face, pose, seat_h, lean=0.06), 0.1)
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], op=0.08, grow=0.02)
    return add((x0, y0, x1, y1, 0, 1.3 if persons else back_h), parts, tag='siege')

def curved_bench(cx, cy, r0, r1, a0, a1, col=ROSE, seat_h=0.42, n=10, pillows=()):
    for k in range(n):
        t0 = math.radians(a0 + (a1 - a0) * k / n); t1 = math.radians(a0 + (a1 - a0) * (k + 1) / n)
        rb = r1 - 0.17
        seatP = [(cx + r0 * math.cos(t0), cy + r0 * math.sin(t0)), (cx + rb * math.cos(t0), cy + rb * math.sin(t0)),
                 (cx + rb * math.cos(t1), cy + rb * math.sin(t1)), (cx + r0 * math.cos(t1), cy + r0 * math.sin(t1))]
        backP = [(cx + rb * math.cos(t0), cy + rb * math.sin(t0)), (cx + r1 * math.cos(t0), cy + r1 * math.sin(t0)),
                 (cx + r1 * math.cos(t1), cy + r1 * math.sin(t1)), (cx + rb * math.cos(t1), cy + rb * math.sin(t1))]
        tm = (t0 + t1) / 2
        cs = (cx + (r0 + rb) / 2 * math.cos(tm), cy + (r0 + rb) / 2 * math.sin(tm))
        cb = (cx + (rb + r1) / 2 * math.cos(tm), cy + (rb + r1) / 2 * math.sin(tm))
        parts = G((cb[0], cb[1], 0.4), PR(backP, 0.06, 0.8, col, FINE)) + G((cs[0], cs[1], 0.25), PR(seatP, 0.06, seat_h, shade(col, 1.05), FINE))
        add(bb2(seatP + backP, 0, 0.8), parts, tag='siege')
    for (ang, pc) in pillows:
        t = math.radians(ang)
        px, py = cx + (r1 - 0.27) * math.cos(t), cy + (r1 - 0.27) * math.sin(t)
        add((px - 0.2, py - 0.2, px + 0.2, py + 0.2, seat_h, seat_h + 0.35),
            PR(rect_pts(px, py, 0.13, 0.42, ang + 180), seat_h, seat_h + 0.36, pc, FINE, smooth=True))

# ---------------------------------------------------------------- rangements
FACES = {'s': (0, 1), 'n': (0, -1), 'e': (1, 0), 'w': (-1, 0)}

def _face_geom(face, x0, y0, x1, y1):
    """Renvoie une fonction (t, z) -> point 3D sur la face, t ∈ [0,1] le long de la face."""
    if face == 's': return lambda t, z: (x0 + (x1 - x0) * t, y1, z)
    if face == 'n': return lambda t, z: (x1 - (x1 - x0) * t, y0, z)
    if face == 'e': return lambda t, z: (x1, y0 + (y1 - y0) * t, z)
    return lambda t, z: (x0, y1 - (y1 - y0) * t, z)

def lockers(x0, y0, x1, y1, h, cols=4, rows=3, col=WOOD, faces='sn'):
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    s = BOX(x0, y0, x1, y1, 0.0, h, col, FINE)
    for face in faces:
        n = list(FACES[face]); F = _face_geom(face, x0, y0, x1, y1)
        pairs = []
        for c in range(1, cols):
            t = c / cols; pairs.append((F(t, 0.08), F(t, h - 0.02)))
        for k in range(rows):
            z = 0.08 + (h - 0.1) * k / rows; pairs.append((F(0, z), F(1, z)))
        s += SEGS(pairs, INK, 0.35, n=n)
        for c in range(cols):
            for k in range(rows):
                p = F((c + 0.85) / cols, 0.08 + (h - 0.1) * (k + 0.5) / rows)
                s += [['C', r(p[0]), r(p[1]), r(p[2]), 0.6, 0.6, INK, 'none', 0, {'n': n}]]
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], op=0.08, grow=0.02)
    return add((x0, y0, x1, y1, 0, h), s, tag='meuble')

BOOKC = [PLUM_M, SAGE_D, '#d6ad62', TERRA, BLUEG, BEIGE_D, '#f1ece2', PLUM_L, '#6f7d64', '#e3c48a']

def bookshelf(x0, y0, x1, y1, h, levels=4, col=WOOD, faces=None, rng=None):
    rng = rng or random.Random(int(x0 * 13 + y0 * 7))
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    if faces is None:
        faces = 'sn' if (x1 - x0) >= (y1 - y0) else 'ew'
    s = BOX(x0, y0, x1, y1, 0, h, col, FINE)
    for face in faces:
        n = list(FACES[face]); F = _face_geom(face, x0, y0, x1, y1)
        Lf = (x1 - x0) if face in 'sn' else (y1 - y0)
        pairs = []
        for lv in range(levels):
            z0 = 0.06 + (h - 0.08) * lv / levels; z1 = 0.06 + (h - 0.08) * (lv + 1) / levels
            pairs.append((F(0, z0), F(1, z0)))
            t = 0.03
            while t < Lf - 0.06:
                w = rng.uniform(0.025, 0.05)
                if rng.random() < 0.12:
                    t += rng.uniform(0.06, 0.18); continue
                bh = (z1 - z0) * rng.uniform(0.55, 0.85)
                a, b = t / Lf, (t + w) / Lf
                s += P([F(a, z0), F(b, z0), F(b, z0 + bh), F(a, z0 + bh)], rng.choice(BOOKC), INK, 0.25, n=n, det=1)
                t += w + 0.004
        s += SEGS(pairs, INK, 0.4, n=n)
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], op=0.08, grow=0.02)
    return add((x0, y0, x1, y1, 0, h), s, tag='meuble')

def cabinet(x0, y0, x1, y1, h, col=WOOD, doors=2, faces=None):
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    if faces is None:
        faces = 'sn' if (x1 - x0) >= (y1 - y0) else 'ew'
    s = BOX(x0, y0, x1, y1, 0, h, col, FINE)
    for face in faces:
        n = list(FACES[face]); F = _face_geom(face, x0, y0, x1, y1)
        pairs = [(F(d / doors, 0.04), F(d / doors, h - 0.03)) for d in range(1, doors)]
        if pairs:
            s += SEGS(pairs, INK, 0.35, n=n)
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], op=0.08, grow=0.02)
    return add((x0, y0, x1, y1, 0, h), s, tag='meuble')

# ---------------------------------------------------------------- végétation
def plant(x, y, kind='leafy', pot_r=0.22, pot_h=0.45, size=1.0, potcol=None, rng=None):
    rng = rng or random.Random(int(x * 101 + y * 53))
    potcol = potcol or rng.choice(['#efe9df', TERRA, BEIGE_D, '#efe9df'])
    s = PR(circle_pts(x, y, pot_r, 22), 0, pot_h, potcol, FINE, smooth=True)
    s += PR(circle_pts(x, y, pot_r * 0.9, 22), pot_h - 0.01, pot_h, '#8b7258', 0.35, smooth=True)
    top = (x, y, pot_h)
    if kind == 'leafy':
        s += leaf_fan(top, rng, 16, 0.35, 0.65, size, [SAGE, SAGE_D, SAGE_L, '#a3b18f'])
    elif kind == 'grass':
        lv = []
        for k in range(26):
            t = math.radians(rng.uniform(-175, -5))
            Lf = rng.uniform(0.4, 0.9) * S * size
            tip = (Lf * 0.8 * math.cos(t), Lf * math.sin(t) * 0.9 - 0.1 * S)
            mid = (Lf * 0.3 * math.cos(t), -Lf * 0.55)
            lv.append((tip[1], BQ(top, mid, tip, SAGE_D, 0.9) + BQ(top, mid, tip, INK, 0.3)))
        lv.sort(key=lambda t: -t[0])
        for t in lv: s += t[1]
    elif kind == 'olive':
        trunk_h = 1.2 * size
        tt = (x, y, pot_h + trunk_h)
        s += L([top, tt], INK, 1.6) + L([top, tt], OAK_DARK, 0.7)
        cr = 0.55 * S * size
        lv = []
        for k in range(5):
            t = rng.uniform(0, 2 * math.pi)
            s += BL(tt, [(0, 0), (cr * 0.6 * math.cos(t), -cr * 0.55 + cr * 0.5 * math.sin(t))], 'none', INK, 0.5, closed=False)
        for k in range(110):
            t = rng.uniform(0, 2 * math.pi); rr_ = cr * math.sqrt(rng.random())
            cxl = rr_ * math.cos(t) * 1.1; cyl = -cr * 0.55 + rr_ * math.sin(t) * 0.8
            a = rng.uniform(0, 2 * math.pi); Lf = rng.uniform(3.2, 5.0)
            lv.append((cyl, LEAF(tt, (cxl, cyl), (cxl + Lf * math.cos(a), cyl + Lf * math.sin(a)), 1.0,
                                 rng.choice([SAGE, SAGE_L, '#a8b494', '#c6cfb3']), 0.28)))
        lv.sort(key=lambda t: t[0])
        for t in lv: s += t[1]
    shadow(circle_pts(x, y, pot_r, 16), op=0.09, grow=0.02)
    hh = pot_h + (2.2 if kind == 'olive' else 1.1) * size
    return add((x - pot_r, y - pot_r, x + pot_r, y + pot_r, 0, hh), s, margin=int((0.8 if kind == 'olive' else 0.7) * S * size), tag='plante')

def tree(x, y, base_z=0.45, trunk=2.1, crown=1.35, rng=None, n=380):
    rng = rng or random.Random(int(x * 31 + y * 17))
    b = (x, y, base_z); t = (x, y, base_z + trunk)
    s = L([b, t], INK, 3.2) + L([b, t], OAK_DARK, 1.8)
    cr = crown * S
    cc = (0, -cr * 0.55)
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8 + rng.uniform(-10, 10))
        e = (cc[0] + cr * 0.75 * math.cos(a), cc[1] + cr * 0.6 * math.sin(a) * 0.9)
        m = (e[0] / 2 + rng.uniform(-3, 3), e[1] / 2)
        s += BQ(t, m, e, INK, 0.7)
    for k in range(14):
        a = rng.uniform(0, 2 * math.pi); r_ = cr * 0.55 * math.sqrt(rng.random())
        rr_ = cr * rng.uniform(0.35, 0.55)
        s += [['C', r(t[0]), r(t[1]), r(t[2]), rr_, rr_, rng.choice([SAGE_L, '#dfe4d3']), 'none', 0,
               {'op': 0.45, 'dx': r(cc[0] + r_ * math.cos(a)), 'dy': r(cc[1] + r_ * math.sin(a) * 0.8)}]]
    Lv = []
    for k in range(n):
        a = rng.uniform(0, 2 * math.pi)
        r_ = cr * (rng.random() ** 0.45)
        px = cc[0] + r_ * math.cos(a) * 1.08; py = cc[1] + r_ * math.sin(a) * 0.86
        la = rng.uniform(0, 2 * math.pi); ll = rng.uniform(3.6, 5.8)
        fill = rng.choice([SAGE_L, '#e4e8da', '#c7d0b5', '#f4f5ee', SAGE_L, SAGE])
        Lv.append((py + rng.uniform(-6, 6), LEAF(t, (px, py), (px + ll * math.cos(la), py + ll * math.sin(la)), 1.3, fill, 0.24)))
    Lv.sort(key=lambda q: q[0])
    for q in Lv: s += q[1]
    SHADOW.extend(P([(x + crown * 0.8 * math.cos(math.radians(a)) + 0.6, y + crown * 0.8 * math.sin(math.radians(a)) + 0.6, base_z)
                     for a in range(0, 360, 20)], '#5a6a46', None, 0, op=0.06))
    return add((x - 0.3, y - 0.3, x + 0.3, y + 0.3, 0, base_z + trunk + crown * 2), s, margin=int(cr * 1.25), tag='plante')

# ---------------------------------------------------------------- architecture
def wall(x0, y0, x1, y1, h, kind='int', z0=0.0, out=None, glazed=False, cut=None):
    """Mur ou cloison opaque. h : hauteur quand la pièce cachée est au nord / à l'ouest
    (choix de la planche, vue depuis le sud-est). La hauteur côté sud / est est calculée à l'export.
    kind 'ext' : façade, out = normale extérieure ; coupée bas quand elle fait face à la caméra."""
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    w = {'r': [r(x0), r(y0), r(x1), r(y1)], 'k': kind, 'h': r(h), 'z0': r(z0)}
    if out: w['o'] = out
    if glazed: w['g'] = 1
    if cut is not None: w['c'] = r(cut)
    WALLS.append(w)
    return w

def glass(x0, y0, x1, y1, h=2.45, post=1.2, allege=0.0, z0=0.0, op=0.2, tint=GLASS):
    if x0 > x1: x0, x1 = x1, x0
    if y0 > y1: y0, y1 = y1, y0
    horiz = (x1 - x0) >= (y1 - y0)
    if horiz:
        ym = (y0 + y1) / 2; A, B = (x0, ym), (x1, ym)
    else:
        xm = (x0 + x1) / 2; A, B = (xm, y0), (xm, y1)
    return glass_ab(A, B, h, post, z0 + allege, op, tint)

def glass_ab(A, B, h=2.45, post=1.2, zb=0.0, op=0.2, tint=GLASS):
    out = P([(A[0], A[1], zb), (B[0], B[1], zb), (B[0], B[1], h), (A[0], A[1], h)], tint, None, 0, op=op)
    Lm = math.hypot(B[0] - A[0], B[1] - A[1])
    nseg = max(1, round(Lm / post))
    pairs = []
    for k in range(nseg + 1):
        t = k / nseg
        p = (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)
        pairs.append(((p[0], p[1], zb), (p[0], p[1], h)))
    out += SEGS(pairs, INK, 0.75)
    refl = []
    for k in range(nseg):
        t = (k + 0.3) / nseg
        p = (A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t)
        q = (A[0] + (B[0] - A[0]) * (t + 0.12 / nseg), A[1] + (B[1] - A[1]) * (t + 0.12 / nseg))
        refl.append(((p[0], p[1], zb + (h - zb) * 0.55), (q[0], q[1], zb + (h - zb) * 0.85)))
    out += SEGS(refl, '#ffffff', 0.9, sop=0.9)
    out += L([(A[0], A[1], zb), (B[0], B[1], zb)], INK, 0.9)
    out += L([(A[0], A[1], h), (B[0], B[1], h)], INK, 1.3)
    xs = (A[0], B[0]); ys = (A[1], B[1])
    return add((min(xs) - 0.02, min(ys) - 0.02, max(xs) + 0.02, max(ys) + 0.02, 0, h), out, tag='vitre')

def door(hx, hy, w, ang, h=2.1, kind='wood', col=WOOD):
    fa = math.radians(ang)
    bx, by = hx + w * math.cos(fa), hy + w * math.sin(fa)
    nx, ny = -math.sin(fa) * 0.02, math.cos(fa) * 0.02
    Pd = [(hx - nx, hy - ny), (bx - nx, by - ny), (bx + nx, by + ny), (hx + nx, hy + ny)]
    hp = (hx + (bx - hx) * 0.86, hy + (by - hy) * 0.86, 1.0)
    if kind == 'glass':
        s = P([(hx, hy, 0.01), (bx, by, 0.01), (bx, by, h), (hx, hy, h)], GLASS, None, 0, op=0.28)
        s += L([(hx, hy, 0.01), (bx, by, 0.01), (bx, by, h), (hx, hy, h), (hx, hy, 0.01)], INK, 0.75)
        s += L([hp, (hp[0], hp[1], 1.15)], INK, 0.9)
    else:
        s = PR(Pd, 0.01, h, col, 0.6)
        s += L([(hp[0] - nx * 1.6, hp[1] - ny * 1.6, 1.0), (hp[0] + nx * 1.6, hp[1] + ny * 1.6, 1.0)], INK, 0.9)
    return add(bb2(Pd, 0, h), s, tag='porte')

def threshold(x0, y0, x1, y1, col='#d7c7ac'):
    floor_poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], col, INK, 0.45, layer=THRESH)

def door_arc(hx, hy, w, a0, a1):
    pts = [(hx + w * math.cos(math.radians(a0 + (a1 - a0) * k / 16)), hy + w * math.sin(math.radians(a0 + (a1 - a0) * k / 16)), 0.005) for k in range(17)]
    THRESH.extend(L(pts, INK, 0.4, dash=[2, 2], sop=0.55))

def column(x, y, s_=0.4, h=2.0):
    return add((x - s_ / 2, y - s_ / 2, x + s_ / 2, y + s_ / 2, 0, h),
               BOX(x - s_ / 2, y - s_ / 2, x + s_ / 2, y + s_ / 2, 0, h, WALL_S, 0.9, top='#2b2724'), tag='poteau')
