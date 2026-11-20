# -*- coding: utf-8 -*-
"""Plateau R6 Ocellis : transcription du plan d'implantation (indice 8, 16-10-2026).

Coordonnées relevées sur le PDF rastérisé à 110 dpi (1/125 : 34,7 px = 1 m),
notées « gx, gy ». Origine : angle intérieur nord-ouest (gx 612, gy 68).
X vers l'est, Y vers le sud, en mètres.
"""
import math, random
from eng import *
from meubles import *
import meubles

K = 34.7
def X(g): return (g - 612) / K
def Y(g): return (g - 68) / K
def m(v): return v / K
def Pt(gx, gy): return (X(gx), Y(gy))

H_BACK = 2.9      # façades : pleine hauteur quand elles sont au fond
H_PART = 2.35     # cloisons conservées pour le relief
H_CUT = 1.0       # cloisons coupées là où elles masquent les pièces
H_FRONT = 0.42    # façades coupées bas au premier plan

def W(a, b, c, d, h=H_PART, kind='int', **kw):
    return wall(X(a), Y(b), X(c), Y(d), h, kind, **kw)

def Gl(a, b, c, d, h=2.45, post=1.2):
    return glass(X(a), Y(b), X(c), Y(d), h, post)

def D(hgx, hgy, wgx, ang, kind='wood', h=2.1):
    return door(X(hgx), Y(hgy), m(wgx), ang, h, kind)

def T(a, b, c, d):
    threshold(X(a), Y(b), X(c), Y(d))

def Box(a, b, c, d, z0, z1, col, sw=FINE, top=None):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    return add((min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1), z0, z1), BOX(x0, y0, x1, y1, z0, z1, col, sw, top))

rng = random.Random(11)
def ST(**kw):
    s = meubles.style(rng)
    s.update(kw)
    return s

# ====================================================================== SOL
FLOORC = '#f4eee8'; OFFICE = '#efe8e1'; WOODF = '#ecdccf'; TILE = '#e5eaea'; CORE = '#e2ddd7'; DECK = '#e2d1c1'

INTERIEUR = [Pt(604, 60), Pt(1304, 60), Pt(1304, 943), Pt(634, 943), Pt(634, 722), Pt(604, 722)]
TERRASSE = [Pt(1304, 505), Pt(1442, 505), Pt(1462, 525), Pt(1462, 943), Pt(1304, 943)]

def slab(poly2, top):
    FLOOR.extend(PR(poly2, -0.34, 0.0, '#d6cbc0', 1.3, top=top))
slab(INTERIEUR, FLOORC)
slab(TERRASSE, DECK)

def zone(a, b, c, d, col, lines=None, step=0.18, lop=0.35):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    floor_poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], col)
    Ls = []
    if lines in ('x', 'grid'):
        y = y0 + step
        while y < y1:
            Ls.append(((x0, y), (x1, y))); y += step
    if lines in ('y', 'grid'):
        x = x0 + step
        while x < x1:
            Ls.append(((x, y0), (x, y1))); x += step
    if lines == 'hatch':
        c_ = x0 - y1
        while c_ < x1 - y0:
            ya, yb = max(y0, x0 - c_), min(y1, x1 - c_)
            if yb > ya:
                Ls.append(((ya + c_, ya), (yb + c_, yb)))
            c_ += step
    if Ls:
        col_l = GREYM if lines == 'grid' else ('#2b2724' if lines == 'hatch' else '#b39a87')
        floor_lines(Ls, col_l, 0.25 if lines == 'grid' else 0.3, sop=lop, det=1)

zone(612, 162, 805, 716, OFFICE)
zone(1167, 68, 1298, 203, OFFICE)
zone(612, 68, 798, 160, WOODF, 'x', 0.16)
zone(803, 68, 908, 160, WOODF, 'x', 0.16)
zone(1078, 68, 1162, 162, WOODF, 'x', 0.16)
zone(1162, 207, 1298, 392, WOODF, 'y', 0.16)
zone(640, 819, 823, 937, WOODF, 'x', 0.16)
zone(647, 719, 772, 815, WOODF, 'x', 0.16)
zone(617, 455, 744, 524, WOODF, 'x', 0.16)
zone(1097, 395, 1298, 937, '#f2ebe4', 'grid', 0.6, 0.22)
# lavis terracotta très léger, en dégradé (piste d'ambiance)
for k, (rx, ry, op) in enumerate(((3.0, 7.4, 0.05), (2.5, 6.2, 0.05), (2.0, 5.0, 0.05), (1.5, 3.8, 0.05), (1.0, 2.6, 0.05))):
    floor_poly(circle_pts(X(1190), Y(666), rx, 48, ry=ry), TERRA, op=op)
zone(1078, 555, 1126, 665, WOODF, 'x', 0.16)
zone(847, 774, 1092, 937, TILE, 'grid', 0.3, 0.35)
zone(863, 208, 1072, 686, CORE)
zone(916, 68, 1072, 157, CORE)
# terrasse : lames de bois
x0_, x1_ = X(1304), X(1462)
Ls = []
yy = Y(505) + 0.14
while yy < Y(943):
    xe = x1_ if yy > Y(525) else X(1442) + (yy - Y(505))
    Ls.append(((x0_, yy), (min(x1_, xe), yy))); yy += 0.14
floor_lines(Ls, '#a88b7b', 0.32, sop=0.55, det=1)
floor_lines([((X(1335), Y(505)), (X(1335), Y(943))), ((X(1405), Y(505)), (X(1405), Y(943)))], '#a88b7b', 0.5, sop=0.5)

def rug_rect(a, b, c, d, col, border=PETROLE_L):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    floor_poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], col, INK, 0.45)
    i = 0.12
    floor_poly([(x0 + i, y0 + i), (x1 - i, y0 + i), (x1 - i, y1 - i), (x0 + i, y1 - i)], 'none', border, 0.6)
    Ls = []
    t = x0 + 0.25
    while t < x1 - 0.2:
        Ls.append(((t, y0 + 0.2), (t, y1 - 0.2))); t += 0.09
    floor_lines(Ls, INK, 0.22, sop=0.35, det=1)

def rug_round(cx, cy, rad, col):
    floor_poly(circle_pts(cx, cy, rad, 40), col, INK, 0.45)
    for rr in (rad - 0.12, rad - 0.3, rad - 0.5):
        if rr > 0.1:
            floor_poly(circle_pts(cx, cy, rr, 40), 'none', ROSE_D, 0.35)

rug_rect(652, 96, 772, 156, SAGE_L)
rug_round(X(1237), Y(447), 0.85, '#e6d2c3')

def stair(a, b, c, d, axis='y', step=0.28, arrow=None):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    floor_poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], '#e3ded5', INK, 0.5)
    Ls = []
    if axis == 'y':
        t = y0 + step
        while t < y1 - 0.02:
            Ls.append(((x0, t), (x1, t))); t += step
    else:
        t = x0 + step
        while t < x1 - 0.02:
            Ls.append(((t, y0), (t, y1))); t += step
    floor_lines(Ls, INK, 0.45)
    if arrow:
        a_, b_ = arrow
        floor_lines([(Pt(*a_), Pt(*b_))], INK, 0.6)

stair(922, 70, 1015, 112, 'x')
stair(985, 112, 1015, 152, 'y')
stair(865, 565, 893, 684, 'y', arrow=((879, 680), (879, 575)))
stair(893, 640, 1015, 684, 'x')
stair(1015, 565, 1070, 684, 'y', arrow=((1042, 575), (1042, 680)))
zone(863, 213, 960, 330, '#dcd7d1', 'hatch', 0.18, 0.4)
zone(1035, 210, 1072, 340, '#dcd7d1', 'hatch', 0.18, 0.4)

# ====================================================================== ENVELOPPE
W(604, 58, 1304, 68, H_BACK, 'ext', out=[0, -1])                         # nord (mitoyen)
W(604, 68, 612, 716, H_BACK, 'ext', out=[-1, 0], glazed=True)            # ouest (rue), vitré
W(604, 716, 640, 722, H_BACK, 'ext', out=[0, -1])
W(634, 722, 640, 937, H_BACK, 'ext', out=[-1, 0], glazed=True)
W(634, 937, 1304, 943, H_BACK, 'ext', out=[0, 1], glazed=True)           # sud
W(1298, 68, 1304, 545, H_BACK, 'ext', out=[1, 0], glazed=True)           # est
W(1298, 577, 1304, 732, H_BACK, 'ext', out=[1, 0], glazed=True)
W(1298, 763, 1304, 937, H_BACK, 'ext', out=[1, 0], glazed=True)
# accès terrasse : deux portes-fenêtres (ouvrant vers l'intérieur, d'après le plan)
T(1296, 545, 1306, 577); T(1296, 732, 1306, 763)
D(1300, 545, 32, 180, 'glass')
D(1300, 732, 31, 180, 'glass')
door_arc(X(1300), Y(545), m(32), 90, 180)
door_arc(X(1300), Y(732), m(31), 90, 180)
column(*Pt(633, 300), 0.42, 2.0)
column(*Pt(1276, 485), 0.42, 2.0)
column(*Pt(1278, 718), 0.42, 2.0)

# ====================================================================== BANDEAU NORD
# --- NOVA (Salle Lounge)
Gl(612, 159, 668, 162)
W(668, 159, 740, 162, H_CUT)
Gl(740, 159, 767, 162)
T(767, 158, 798, 163); D(798, 161, 31, -90)
W(798, 68, 803, 161, H_CUT)
sofa(*Pt(617, 68), *Pt(798, 92), back='n', col=ROSE, arms=False, pillows=5, persons=[(0.55, 'sit_talk')])
sofa(*Pt(617, 92), *Pt(641, 120), back='w', col=ROSE, arms=False, modules=1)
sofa(*Pt(774, 92), *Pt(798, 120), back='e', col=ROSE, arms=False, modules=1)
table_shape(rrect_pts(*Pt(682, 98), m(19), m(15), 0.05), h=0.38, top=WOOD, ped=[(X(682), Y(98), m(15), m(11))], leg=WOOD2)
table_shape(rrect_pts(*Pt(738, 97), m(19), m(15), 0.05), h=0.38, top=WOOD, ped=[(X(738), Y(97), m(15), m(11))], leg=WOOD2)
desk(*Pt(703, 127), *Pt(745, 148), h=0.38, top=WOOD, leg=WOOD2,
     items=[lambda z: mug(X(712), Y(134), z), lambda z: notebook(X(730), Y(138), 10, z, PETROLE_M), lambda z: plant_small(X(740), Y(132), z)])
armchair(*Pt(638, 141), -28, col=ROSE_D, person='sit_relax', w=0.8, d=0.8)
table_round(*Pt(653, 153), 0.17, h=0.5, top=WOOD, items=[lambda z: mug(X(653), Y(153), z)])
desk(*Pt(668, 152), *Pt(740, 159), h=0.75, top=WOOD, leg=WOOD2, frame='trestle')
plant(*Pt(784, 140), 'leafy', 0.17, 0.4, 0.9)
def floor_lamp(x, y, h=1.6):
    s = C((x, y, 0), 5, 2.4, CHAR, INK, 0.4) + L([(x, y, 0), (x, y, h)], INK, 0.8)
    s += PR(circle_pts(x, y, 0.2, 18), h - 0.05, h + 0.22, '#f1e3c3', 0.5, smooth=True)
    return add((x - 0.2, y - 0.2, x + 0.2, y + 0.2, 0, h + 0.22), s)
floor_lamp(*Pt(627, 130))
def frame(gx0, gx1, z0, z1, col):
    x0, x1, y = X(gx0), X(gx1), Y(68) + 0.01
    i = 0.05
    s = P([(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], '#f7f3ec', INK, 0.6, n=[0, 1])
    s += P([(x0 + i, y, z0 + i), (x1 - i, y, z0 + i), (x1 - i, y, z1 - i), (x0 + i, y, z1 - i)], col, INK, 0.35, n=[0, 1])
    return add((x0, Y(68), x1, Y(68) + 0.02, z0, z1), s)
frame(650, 672, 1.35, 1.95, SAGE)
frame(680, 700, 1.45, 1.85, PETROLE_L)

# --- ÉCHO (Quatro fermée)
Gl(803, 159, 877, 162)
T(877, 158, 908, 163); D(877, 161, 31, -90, 'glass')
W(908, 58, 916, 162, H_CUT)
desk(*Pt(803, 96), *Pt(872, 132), h=0.74, top=WHITE, leg=CHAR,
     items=[lambda z: laptop(X(830), Y(104), 90, z), lambda z: laptop(X(858), Y(124), -90, z),
            lambda z: mug(X(845), Y(110), z), lambda z: notebook(X(838), Y(122), 0, z)])
shell_chair(*Pt(835, 88), 90, PETROLE_M, 'sit_type', ST())
shell_chair(*Pt(860, 88), 90, PETROLE_M, 'sit_talk', ST())
shell_chair(*Pt(835, 141), -90, PETROLE_M)
shell_chair(*Pt(860, 141), -90, PETROLE_M)
armchair(*Pt(901, 86), 135, col=ROSE_D, w=0.55, d=0.55)
def wall_screen(x, y, ang, z0=1.0, w=1.1, hgt=0.65):
    f = (math.cos(math.radians(ang)), math.sin(math.radians(ang)))
    Pp = rect_pts(x, y, 0.04, w, ang)
    return add(bb2(Pp, z0, z0 + hgt), PR(Pp, z0, z0 + hgt, '#c9c5bf', 0.5, face=[r(f[0]), r(f[1]), '#4d535b']))
wall_screen(X(805), Y(114), 0)

# --- Escalier nord + sas
W(916, 157, 965, 162)
T(965, 156, 1015, 163); D(965, 160, 25, -90); D(1015, 160, 25, -90)
W(1015, 157, 1035, 162)
T(1035, 156, 1068, 163); D(1068, 160, 33, -90)
W(1068, 157, 1072, 162)
W(1015, 68, 1019, 157)
W(1072, 58, 1078, 164)

# --- HALO (Visio) — mur végétal « Salle Canopée » (piste d'ambiance)
W(1078, 160, 1087, 164)
T(1087, 159, 1117, 165); D(1087, 162, 30, -90, 'glass')
Gl(1117, 160, 1162, 164)
W(1162, 58, 1167, 164, H_CUT)
sofa(*Pt(1132, 76), *Pt(1160, 156), back='e', col=PETROLE_L, arms=True, pillows=2, persons=[(0.28, 'sit_talk'), (0.62, 'sit_relax')])
table_round(*Pt(1121, 96), m(8), h=0.45, top=WOOD, items=[lambda z: mug(X(1121), Y(96), z)])
table_round(*Pt(1121, 130), m(9), h=0.45, top=WOOD, items=[lambda z: notebook(X(1121), Y(130), 30, z)])
def tv_stand(x, y, ang):
    fa = math.radians(ang)
    s = []
    for dl in (-0.35, 0.35):
        bx, by = x - math.sin(fa) * dl, y + math.cos(fa) * dl
        s += L([(bx, by, 0), (bx, by, 1.0)], INK, 1.4)
        s += L([(bx - math.cos(fa) * 0.2, by - math.sin(fa) * 0.2, 0), (bx + math.cos(fa) * 0.2, by + math.sin(fa) * 0.2, 0)], INK, 1.2)
    Pp = rect_pts(x, y, 0.06, 1.25, ang)
    s += PR(Pp, 0.95, 1.68, '#c9c5bf', 0.5, face=[r(math.cos(fa)), r(math.sin(fa)), '#4d535b'])
    s += C((x, y, 1.72), 1.2, 1.2, INK, 'none', 0)
    return add((x - 0.22, y - 0.66, x + 0.22, y + 0.66, 0, 1.75), s)
tv_stand(*Pt(1087, 116), 0)
def green_wall(x, y0, y1, z0, z1, seed=4):
    rr = random.Random(seed)
    n = [1, 0]
    s = P([(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)], SAGE_D, INK, 0.6, n=n)
    for k in range(520):
        yy = y0 + 0.05 + rr.random() * (y1 - y0 - 0.1); zz = z0 + 0.08 + rr.random() * (z1 - z0 - 0.16)
        a = rr.uniform(0, 6.28); ll = rr.uniform(3.0, 5.5)
        s += LEAF((x + 0.01, yy, zz), (0, 0), (ll * math.cos(a), ll * math.sin(a)), 1.3,
                  rr.choice([SAGE, SAGE_D, '#9da38a', VERT_GRIS, SAGE_L, SAGE_D]), 0.25, n=n, det=1)
    s += L([(x + 0.012, y0 + 0.02, z0), (x + 0.012, y0 + 0.02, z1 - 0.02), (x + 0.012, y1 - 0.02, z1 - 0.02), (x + 0.012, y1 - 0.02, z0)], WOOD2, 1.6, n=n)
    return add((x, y0, x + 0.02, y1, z0, z1), s)
green_wall(X(1078) + 0.005, Y(70), Y(158), 0.0, 2.3)

# --- OREE (Touchdown)
desk(*Pt(1167, 68), *Pt(1189, 163), h=1.05, top=WOOD, leg=CHAR, frame='trestle_y',
     items=[lambda z: laptop(X(1180), Y(130), 180, z), lambda z: mug(X(1182), Y(150), z)])
stool(*Pt(1197, 90), 0.75, SAGE_D)
stool(*Pt(1197, 133), 0.75, SAGE_D, 'sit_type', 180, ST())
desk(*Pt(1268, 70), *Pt(1292, 205), h=0.74, top=WHITE, leg=CHAR, frame='trestle_y',
     items=[lambda z: monitor(X(1285), Y(86), 180, z), lambda z: monitor(X(1285), Y(131), 180, z), lambda z: monitor(X(1285), Y(176), 180, z),
            lambda z: desk_lamp(X(1288), Y(108), 180, z), lambda z: laptop(X(1278), Y(131), 0, z)])
task_chair(*Pt(1260, 86), 0)
task_chair(*Pt(1260, 131), 0, None, 'sit_type', ST())
task_chair(*Pt(1260, 176), 0)
frame(1205, 1240, 1.3, 1.9, BEIGE_D)

# --- Matériauthèque + OCELLE (salle de réunion)
bookshelf(*Pt(1147, 192), *Pt(1220, 203), 1.25, 4)
bookshelf(*Pt(1147, 203), *Pt(1160, 326), 1.25, 4)
def curved_shelf(cx, cy, r0, r1, a0, a1, h, n=6):
    for k in range(n):
        t0 = math.radians(a0 + (a1 - a0) * k / n); t1 = math.radians(a0 + (a1 - a0) * (k + 1) / n)
        Pp = [(cx + r0 * math.cos(t0), cy + r0 * math.sin(t0)), (cx + r1 * math.cos(t0), cy + r1 * math.sin(t0)),
              (cx + r1 * math.cos(t1), cy + r1 * math.sin(t1)), (cx + r0 * math.cos(t1), cy + r0 * math.sin(t1))]
        add(bb2(Pp, 0, h), PR(Pp, 0, h, WOOD, FINE))
curved_shelf(X(1193), Y(362), m(33), m(46), 90, 180, 1.25)
W(1160, 203, 1298, 207, H_CUT)
Gl(1160, 207, 1164, 328)
T(1158, 328, 1166, 360); D(1162, 330, 30, 0, 'glass')
cx_, cy_, rr_ = X(1193), Y(360), m(31)
arc_ = [(cx_ + rr_ * math.cos(math.radians(a)), cy_ + rr_ * math.sin(math.radians(a))) for a in (180, 150, 120, 90)]
for i in range(3):
    glass_ab(arc_[i], arc_[i + 1])
W(1193, 390, 1298, 394, H_CUT)
desk(*Pt(1180, 207), *Pt(1252, 213), h=0.8, top=WOOD, leg=WOOD2, frame='trestle',
     items=[lambda z: plant_small(X(1190), Y(210), z), lambda z: plant_small(X(1240), Y(210), z)])
table_shape(rrect_pts(*Pt(1216, 290), m(42), m(84), 0.12), h=0.74, top=WOOD,
            ped=[(X(1216), Y(262), 0.12, 0.6), (X(1216), Y(318), 0.12, 0.6)], leg=CHAR,
            items=[lambda z: laptop(X(1206), Y(268), 180, z), lambda z: laptop(X(1226), Y(300), 0, z),
                   lambda z: mug(X(1222), Y(278), z), lambda z: notebook(X(1207), Y(312), 0, z), lambda z: mug(X(1210), Y(292), z)])
shell_chair(*Pt(1186, 264), 0, SAGE, 'sit_type', ST())
shell_chair(*Pt(1246, 264), 180, SAGE)
shell_chair(*Pt(1186, 290), 0, SAGE, 'sit_talk', ST())
shell_chair(*Pt(1246, 290), 180, SAGE, 'sit_relax', ST())
shell_chair(*Pt(1186, 316), 0, SAGE)
shell_chair(*Pt(1246, 316), 180, SAGE)
sofa(*Pt(1197, 367), *Pt(1293, 390), back='s', col=ROSE, arms=False, pillows=3)
wall_screen(X(1216), Y(212), 90, 1.05, 1.2, 0.7)

# ====================================================================== ESPACE DE TRAVAIL OUVERT (3 benchs x 6)
def bench(gx0, gy0, gx1, gy1, tops, rows=3):
    x0, y0, x1, y1 = X(gx0), Y(gy0), X(gx1), Y(gy1)
    w = (x1 - x0) / rows
    ym = (y0 + y1) / 2
    seats = []
    for k in range(rows):
        a, b = x0 + w * k, x0 + w * (k + 1)
        cx = (a + b) / 2
        items = [lambda z, cx=cx: monitor(cx, ym - 0.16, -90, z), lambda z, cx=cx: monitor(cx, ym + 0.16, 90, z)]
        rr = random.Random(int(cx * 100))
        if rr.random() < 0.7: items.append(lambda z, cx=cx: laptop(cx + 0.1, y0 + 0.28, 90, z))
        if rr.random() < 0.6: items.append(lambda z, cx=cx: mug(cx - 0.3, y1 - 0.2, z))
        if rr.random() < 0.5: items.append(lambda z, cx=cx: notebook(cx - 0.18, y1 - 0.3, 0, z))
        if rr.random() < 0.35: items.append(lambda z, a=a: plant_small(a + 0.12, ym - 0.3, z))
        desk(a, y0, b, y1, 0.74, tops[k % len(tops)], CHAR, items=items, panel=('x', SAGE), frame='trestle')
        seats.append((cx, y0 - 0.32, 90))
        seats.append((cx, y1 + 0.32, -90))
    return seats

seatsA = bench(615, 207, 754, 263, [WOOD, WHITE, WOOD])
seatsB = bench(617, 338, 755, 394, [WOOD])
seatsC = bench(618, 587, 757, 643, [WHITE])
occ = {('A', 3): 'sit_type', ('A', 4): 'sit_phone', ('B', 1): 'sit_type', ('B', 4): 'sit_type',
       ('C', 0): 'sit_type', ('C', 2): 'sit_talk'}
for tag, seats in (('A', seatsA), ('B', seatsB), ('C', seatsC)):
    for i, (sx, sy, a) in enumerate(seats):
        pose = occ.get((tag, i))
        task_chair(sx, sy, a, None, pose, ST() if pose else None)


# Box autonome (Interior ou Mute)
Gl(617, 452, 747, 455); Gl(617, 524, 747, 527); Gl(744, 455, 747, 472); Gl(744, 503, 747, 524)
T(742, 472, 750, 503); D(747, 503, 31, 0, 'glass')
Gl(690, 455, 693, 524)
desk(*Pt(624, 458), *Pt(650, 522), h=0.74, top=WOOD, leg=CHAR, frame='trestle_y',
     items=[lambda z: laptop(X(640), Y(470), 180, z), lambda z: desk_lamp(X(630), Y(495), 0, z), lambda z: mug(X(642), Y(508), z)])
task_chair(*Pt(660, 470), 180, SAGE_D, 'sit_type', ST())
task_chair(*Pt(660, 510), 180, SAGE_D)
plant(*Pt(628, 432), 'leafy', 0.2, 0.42, 1.0)

# ====================================================================== COLONNE DE SERVICES (casiers, box, SPIX)
lockers(*Pt(805, 214), *Pt(857, 232), 1.35, 4, 3, WOOD)
desk(*Pt(806, 274), *Pt(856, 289), h=1.05, top=WHITE, leg=CHAR, frame='trestle')
stool(*Pt(830, 265), 0.75, PETROLE_M)
W(805, 289, 808, 313, 2.1); T(803, 313, 810, 337); W(805, 337, 808, 372, 2.1); T(803, 372, 810, 396); W(805, 396, 808, 420, 2.1)
D(807, 313, 24, 180); D(807, 372, 24, 180)
W(808, 289, 858, 292, H_CUT); W(808, 347, 858, 350, H_CUT); W(808, 417, 858, 420, H_CUT)
sofa(*Pt(832, 294), *Pt(856, 345), back='e', col=SAGE, arms=False, pillows=2, persons=[(0.5, 'sit_phone')])
for (cx, cy, c) in ((818, 362, PETROLE_M), (845, 400, PETROLE_L)):
    Pc = circle_pts(X(cx), Y(cy), 0.23, 20)
    add(bb2(Pc, 0, 0.42), PR(Pc, 0, 0.42, c, FINE, smooth=True))
table_round(*Pt(836, 372), 0.2, h=0.4, top=CHAR, items=[lambda z: mug(X(836), Y(372), z)])
lockers(*Pt(806, 420), *Pt(856, 437), 1.35, 4, 3, WOOD)
lockers(*Pt(808, 505), *Pt(857, 522), 1.35, 4, 3, WOOD)
# SPIX (cabine duo, noire)
for (a, b, c, d, h) in ((810, 523, 856, 527, 2.15), (852, 527, 856, 596, 2.15), (810, 527, 814, 547, 2.15),
                        (810, 577, 814, 596, 2.15), (810, 596, 856, 600, 1.1)):
    Box(a, b, c, d, 0, h, CHAR, 0.8, '#2b2724')
T(808, 547, 816, 577)
D(812, 577, 28, 180, 'glass')
sofa(*Pt(814, 527), *Pt(852, 543), back='n', col=TERRA, arms=False, modules=2, persons=[(0.5, 'sit_phone')])
sofa(*Pt(814, 580), *Pt(852, 596), back='s', col=TERRA, arms=False, modules=2)
desk(*Pt(832, 551), *Pt(851, 573), h=0.74, top=GREYM, leg=CHAR, items=[lambda z: laptop(X(841), Y(556), 90, z)])
desk(*Pt(808, 601), *Pt(858, 624), h=0.74, top=WHITE, leg=CHAR,
     items=[lambda z: monitor(X(833), Y(608), 90, z), lambda z: desk_lamp(X(852), Y(606), 90, z)])
desk(*Pt(848, 624), *Pt(858, 650), h=0.74, top=WHITE, leg=CHAR)
shell_chair(*Pt(830, 637), -90, PETROLE_M)
lockers(*Pt(811, 657), *Pt(857, 674), 1.35, 3, 3, WOOD)

# ====================================================================== NOYAU (simplifié)
HC = 1.4
W(858, 203, 863, 452, HC); W(858, 492, 863, 690, HC)
T(856, 452, 865, 492); D(860, 452, 20, 0); D(860, 492, 20, 0)
W(858, 203, 1078, 208, HC)
W(1072, 208, 1078, 450, HC); T(1070, 450, 1080, 490); D(1075, 450, 20, 180); D(1075, 490, 20, 180)
W(1072, 490, 1078, 690, HC)
W(858, 686, 1078, 692, HC)
Box(863, 213, 960, 330, 0, HC, '#e3ded8', 0.8, 'hatch')
Box(1035, 210, 1072, 340, 0, HC, '#e3ded8', 0.8, 'hatch')
W(965, 262, 1032, 266, HC); W(965, 266, 969, 335, HC); W(1028, 266, 1032, 335, HC); W(965, 331, 1028, 335, H_CUT)
Box(985, 285, 1005, 305, 0, 1.35, CHAR, 0.6, '#3c3936')
W(893, 345, 1040, 350, HC); W(893, 350, 898, 445, HC); W(1035, 350, 1040, 445, HC); W(955, 350, 982, 445, HC)
W(898, 440, 906, 445, HC); W(950, 440, 955, 445, HC); W(982, 440, 986, 445, HC); W(1028, 440, 1035, 445, HC)
for (a, b) in ((906, 950), (986, 1028)):
    mid = (a + b) / 2
    add((X(a), Y(441), X(b), Y(444), 0, HC), BOX(X(a), Y(441), X(b), Y(444), 0, HC, '#cfccc6', 0.6) +
        L([(X(mid), Y(444) + 0.001, 0), (X(mid), Y(444) + 0.001, HC)], INK, 0.5, n=[0, 1]) +
        L([(X(mid), Y(441) - 0.001, 0), (X(mid), Y(441) - 0.001, HC)], INK, 0.5, n=[0, -1]))
zone(898, 350, 955, 440, '#d4d3cf')
zone(982, 350, 1035, 440, '#d4d3cf')
Box(893, 466, 952, 561, 0, HC, '#e3ded8', 0.8, 'hatch')
W(935, 550, 1000, 554, HC); W(935, 554, 939, 610, HC); W(996, 554, 1000, 610, HC); W(939, 606, 996, 610, H_CUT)
zone(939, 554, 996, 606, '#d4d3cf')

# ====================================================================== EST : CONSULTATION, CAFÉTÉRIA
bookshelf(*Pt(1078, 210), *Pt(1097, 447), 1.25, 4, faces='e')
cxb, cyb, rb = X(1150), Y(513), m(23.5)
bar_pts = [(cxb + rb * math.cos(math.radians(a)), cyb + rb * math.sin(math.radians(a))) for a in range(180, 361, 15)]
bar_pts += [(X(1173), Y(553)), (X(1126), Y(553))]
add(bb2(bar_pts, 0, 1.05), PR(bar_pts, 0, 1.05, BEIGE, FINE, smooth=True, top=WOOD))
stool(*Pt(1143, 489), 0.75, TERRA)
stool(*Pt(1167, 495), 0.75, TERRA, 'sit_cup', 135, ST())
stool(*Pt(1181, 516), 0.75, TERRA)
stool(*Pt(1181, 540), 0.75, TERRA)
def kitchen_run(a, b, c, d, h=0.92):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    s = BOX(x0, y0, x1, y1, 0.08, h - 0.04, WHITE, FINE)
    s += BOX(x0 - 0.02, y0, x1 + 0.02, y1, h - 0.04, h, BEIGE_D, FINE)
    n = 6
    s += SEGS([((x1, y0 + (y1 - y0) * k / n, 0.1), (x1, y0 + (y1 - y0) * k / n, h - 0.06)) for k in range(1, n)], INK, 0.35, n=[1, 0])
    ya, yb = y0 + (y1 - y0) * 2 / n, y0 + (y1 - y0) * 3 / n
    s += P([(x1 + 0.001, ya + 0.04, 0.14), (x1 + 0.001, yb - 0.04, 0.14), (x1 + 0.001, yb - 0.04, h - 0.1), (x1 + 0.001, ya + 0.04, h - 0.1)], CHAR, INK, 0.4, n=[1, 0])
    s += G((x0 + 0.1, y0 + 0.4, h + 0.2), BOX(x0 + 0.12, y0 + 0.25, x1 - 0.08, y0 + 0.6, h, h + 0.42, CHAR, 0.45), 0.5)
    s += G((x0 + 0.1, y0 + 1.1, h + 0.2), BOX(x0 + 0.12, y0 + 0.95, x1 - 0.12, y0 + 1.2, h, h + 0.35, '#e9e6e0', 0.45), 0.5)
    s += G((x1 - 0.15, y0 + 0.75, h), mug(x1 - 0.15, y0 + 0.72, h) + mug(x1 - 0.18, y0 + 0.82, h, PETROLE_L), 0.5)
    fr = PR(circle_pts(x1 - 0.25, y0 + 1.75, 0.13, 16), h, h + 0.08, WOOD2, 0.45, smooth=True)
    for k in range(4):
        fr += C((x1 - 0.25 + 0.06 * math.cos(k * 1.6), y0 + 1.75 + 0.06 * math.sin(k * 1.6), h + 0.11), 1.5, 1.5,
                [TERRA_D, TERRA, SAGE_D, BEIGE_D][k], INK, 0.35)
    s += G((x1 - 0.25, y0 + 1.75, h), fr, 0.5)
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 0.08)
    return add((x0, y0, x1, y1, 0, h + 0.45), s, tag='meuble')
kitchen_run(1150, 553, 1173, 692)
cabinet(*Pt(1126, 556), *Pt(1150, 665), 1.5, WOOD, 3)
W(1078, 551, 1080, 556); T(1080, 550, 1110, 557); D(1080, 553, 30, 90); W(1110, 551, 1126, 556)
W(1078, 665, 1126, 669, H_CUT)
desk(*Pt(1084, 600), *Pt(1098, 655), h=0.45, top=WOOD, leg=WOOD2, frame='trestle_y')
def suitcase(x, y, col):
    s = BOX(x - 0.22, y - 0.12, x + 0.22, y + 0.12, 0.04, 0.62, col, 0.5) + L([(x, y, 0.62), (x, y, 0.74)], INK, 0.8)
    return add((x - 0.22, y - 0.12, x + 0.22, y + 0.12, 0, 0.75), s)
suitcase(X(1112), Y(580), PETROLE_M); suitcase(X(1112), Y(605), BLUEG)
desk(*Pt(1079, 669), *Pt(1103, 690), h=0.9, top=BEIGE_D, leg=WHITE, frame='trestle',
     items=[lambda z: BOX(X(1082), Y(672), X(1100), Y(686), z, z + 0.3, '#e9e6e0', 0.45)])
cabinet(*Pt(1103, 669), *Pt(1126, 690), 1.8, '#eceae5', 1)
cabinet(*Pt(1126, 669), *Pt(1150, 690), 1.8, '#eceae5', 1)
person(X(1186), Y(600), 180, 'cup', ST())

# convivialité nord-est
cabinet(*Pt(1192, 394), *Pt(1223, 415), 1.8, WOOD, 2)
curved_bench(X(1218), Y(477), m(56), m(78), -90, 0, ROSE, n=9, pillows=[(-62, GREYL), (-40, '#f1ede6'), (-18, GREYL), (-6, BEIGE)])
plant(*Pt(1284, 410), 'grass', 0.2, 0.5, 1.1, '#efe9df')
table_round(*Pt(1203, 437), 0.21, h=0.45, top=ROSE_D)
table_round(*Pt(1237, 447), 0.45, h=0.40, top=WOOD, items=[lambda z: mug(X(1232), Y(445), z), lambda z: notebook(X(1242), Y(452), 20, z, SAGE_D), lambda z: plant_small(X(1240), Y(440), z)])
armchair(*Pt(1226, 483), -74, SAGE_D, 'sit_cup', ST(), 0.78, 0.74)

# coins repas le long de la façade
for (a, b) in ((580, 632), (632, 683)):
    sofa(*Pt(1270, a), *Pt(1293, b), back='e', col=ROSE, arms=False, pillows=1)
for gy_ in (594, 618, 645, 668):
    its = []
    if gy_ in (618, 645): its = [lambda z, g=gy_: mug(X(1262), Y(g), z)]
    if gy_ == 668: its = [lambda z: laptop(X(1265), Y(668), 0, z)]
    desk(*Pt(1255, gy_ - 9), *Pt(1275, gy_ + 9), h=0.74, top=WHITE, leg=CHAR, items=its)
shell_chair(*Pt(1246, 594), 0, ROSE_D)
shell_chair(*Pt(1246, 618), 0, ROSE_D)
shell_chair(*Pt(1246, 645), 0, ROSE_D)
shell_chair(*Pt(1246, 668), 0, ROSE_D, 'sit_type', ST())

# grande table ovale (8)
table_shape(stadium_pts(X(1197), Y(801), m(85), m(42), 0, 12), h=0.74, top=WOOD,
            ped=[(X(1178), Y(801), 0.1, 0.7), (X(1216), Y(801), 0.1, 0.7)], leg=CHAR,
            items=[lambda z: plant_small(X(1197), Y(801), z), lambda z: mug(X(1183), Y(790), z), lambda z: laptop(X(1212), Y(812), -90, z),
                   lambda z: mug(X(1220), Y(793), z, PETROLE_L)])
for (gx_, gy_, a, pose) in ((1183, 769, 90, None), (1211, 769, 90, 'sit_talk'), (1183, 834, -90, 'sit_cup'), (1211, 834, -90, None),
                            (1159, 781, 40, None), (1235, 781, 140, None), (1159, 821, -40, None), (1235, 821, -140, None)):
    shell_chair(*Pt(gx_, gy_), a, ROSE_D, pose, ST() if pose else None)

for (a, b) in ((1118, 1170), (1170, 1243), (1243, 1295)):
    sofa(*Pt(a, 912), *Pt(b, 930), back='s', col=ROSE, arms=False, pillows=2)
for gx_ in (1132, 1154, 1195, 1217, 1257, 1279):
    desk(*Pt(gx_ - 9.5, 893), *Pt(gx_ + 9.5, 911), h=0.74, top=WHITE, leg=CHAR,
         items=[lambda z, g=gx_: mug(X(g), Y(902), z)] if gx_ in (1154, 1257) else [])
    shell_chair(*Pt(gx_, 883), 90, GREY)
cabinet(*Pt(1095, 774), *Pt(1110, 860), 2.0, WOOD, 3)
cabinet(*Pt(1094, 862), *Pt(1112, 930), 0.9, WOOD, 2)
plant(*Pt(1122, 760), 'leafy', 0.24, 0.5, 1.2)

# ====================================================================== SUD-OUEST : O'1, O'2, OSMOSE
Gl(640, 716, 668, 719)
T(668, 715, 700, 721); D(700, 718, 32, 90, 'glass')
Gl(700, 719, 705, 780); W(703, 780, 707, 815, H_CUT)
Gl(705, 716, 740, 719)
T(740, 715, 772, 721); D(772, 718, 32, 90, 'glass')
Gl(772, 719, 775, 787)
W(640, 815, 775, 819, H_CUT)
desk(*Pt(647, 788), *Pt(701, 813), h=0.74, top=WOOD, leg=PETROLE_L, frame='trestle',
     items=[lambda z: monitor(X(674), Y(805), -90, z), lambda z: laptop(X(668), Y(796), -90, z), lambda z: mug(X(690), Y(795), z)])
task_chair(*Pt(676, 777), 90, None, 'sit_type', ST())
desk(*Pt(707, 788), *Pt(771, 813), h=0.74, top=WOOD, leg=PETROLE_L, frame='trestle',
     items=[lambda z: monitor(X(722), Y(805), -90, z), lambda z: monitor(X(755), Y(805), -90, z), lambda z: notebook(X(740), Y(796), 0, z)])
task_chair(*Pt(722, 777), 90, None, 'sit_type', ST())
task_chair(*Pt(755, 777), 90)
T(775, 784, 808, 790); D(775, 787, 33, 90, 'glass')
Gl(808, 785, 823, 789)
cabinet(*Pt(823, 785), *Pt(843, 930), 2.0, WOOD, 5)
table_shape(stadium_pts(X(733), Y(879), m(119), m(42), 0, 12), h=0.74, top=WHITE,
            ped=[(X(700), Y(879), 0.1, 0.7), (X(770), Y(879), 0.1, 0.7)], leg=CHAR,
            items=[lambda z: PR(stadium_pts(X(722), Y(879), m(24), m(7), 0, 6), z, z + 0.01, CHAR, 0.3, smooth=True),
                   lambda z: laptop(X(702), Y(868), 90, z), lambda z: laptop(X(768), Y(890), -90, z),
                   lambda z: mug(X(745), Y(870), z), lambda z: notebook(X(735), Y(890), -10, z), lambda z: mug(X(712), Y(892), z, PETROLE_L)])
for (gx_, gy_, a, pose) in ((702, 852, 90, 'sit_type'), (735, 852, 90, None), (768, 852, 90, None),
                            (702, 907, -90, None), (735, 907, -90, 'sit_talk'), (768, 907, -90, 'sit_type'),
                            (674, 860, 25, None), (672, 899, -25, None)):
    shell_chair(*Pt(gx_, gy_), a, PETROLE_L, pose, ST() if pose else None)
plant(*Pt(655, 832), 'olive', 0.22, 0.45, 0.85)

# ====================================================================== SANITAIRES, REPROGRAPHIE
W(843, 770, 858, 774); T(858, 769, 890, 775); D(858, 772, 31, 90); W(890, 770, 905, 774)
W(843, 774, 847, 937, 2.0)
W(902, 774, 905, 850, H_CUT); W(902, 877, 905, 890, H_CUT); W(902, 920, 905, 937, H_CUT)
T(900, 850, 907, 877); T(900, 890, 907, 920)
W(905, 770, 908, 774); T(908, 769, 938, 775); D(938, 772, 30, 90); W(938, 770, 1037, 774)
W(905, 843, 1035, 847, H_CUT)
W(1032, 774, 1037, 843, H_CUT)
W(1035, 847, 1040, 850, H_CUT); W(1035, 877, 1040, 890, H_CUT); W(1035, 920, 1040, 937, H_CUT)
T(1033, 850, 1042, 877); T(1033, 890, 1042, 920)
W(1037, 770, 1047, 774); T(1047, 769, 1078, 775); D(1078, 772, 31, 90); W(1078, 770, 1095, 774)
W(1092, 774, 1095, 937, 2.0)
W(905, 878, 957, 882, H_CUT); W(983, 878, 1035, 882, H_CUT)
W(957, 847, 983, 937, 1.2)
def wc(x, y, ang):
    fa = math.radians(ang); f = (math.cos(fa), math.sin(fa))
    cx, cy = x - f[0] * 0.27, y - f[1] * 0.27
    s = G((cx, cy, 0.4), PR(rect_pts(cx, cy, 0.16, 0.4, ang), 0, 0.82, '#fbfaf7', 0.5))
    s += G((x, y, 0.2), PR(stadium_pts(x + f[0] * 0.02, y + f[1] * 0.02, 0.52, 0.38, ang, 8), 0.0, 0.42, '#fbfaf7', 0.5, smooth=True))
    return add((x - 0.36, y - 0.36, x + 0.36, y + 0.36, 0, 0.82), s)
wc(*Pt(946, 862), 180); wc(*Pt(946, 898), 180)
wc(*Pt(994, 862), 0); wc(*Pt(994, 898), 0)
def vanity(a, b, c, d, n=2):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    s = BOX(x0, y0, x1, y1, 0.1, 0.86, WOOD, FINE) + BOX(x0, y0, x1, y1, 0.86, 0.9, '#f4f2ee', FINE)
    for k in range(n):
        yy = y0 + (y1 - y0) * (k + 0.5) / n; xx = (x0 + x1) / 2
        s += P([(xx + 0.16 * math.cos(math.radians(t)), yy + 0.2 * math.sin(math.radians(t)), 0.905) for t in range(0, 360, 30)], '#e1e6e6', INK, 0.4)
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 0.06)
    return add((x0, y0, x1, y1, 0, 0.9), s, tag='meuble')
vanity(847, 800, 862, 860)
vanity(1077, 800, 1092, 860)
vanity(936, 776, 954, 798, 1)
def bins(a, b):
    x, y = X(a), Y(b)
    s = BOX(x - 0.28, y - 0.4, x + 0.28, y + 0.42, 0.06, 0.1, CHAR, 0.4)
    s += G((x, y - 0.2, 0.4), BOX(x - 0.25, y - 0.38, x + 0.25, y, 0.1, 0.72, TERRA_D, 0.45))
    s += G((x, y + 0.2, 0.4), BOX(x - 0.25, y + 0.02, x + 0.25, y + 0.4, 0.1, 0.72, PETROLE, 0.45))
    return add((x - 0.28, y - 0.4, x + 0.28, y + 0.42, 0, 0.72), s)
bins(943, 821)
def printer(a, b, c, d, h):
    x0, y0, x1, y1 = X(a), Y(b), X(c), Y(d)
    s = BOX(x0, y0, x1, y1, 0.05, h, '#e9e7e3', FINE)
    s += BOX(x0 + 0.05, y0 + 0.08, x1 - 0.05, y1 - 0.08, h, h + 0.12, '#cfccc7', FINE)
    s += P([(x0 + 0.1, y1 - 0.1, h + 0.125), (x1 - 0.1, y1 - 0.1, h + 0.125), (x1 - 0.1, y1 - 0.25, h + 0.125), (x0 + 0.1, y1 - 0.25, h + 0.125)], '#5a6068', INK, 0.35)
    s += SEGS([((x0, y1 + 0.001, 0.15 + k * (h - 0.2) / 3), (x1, y1 + 0.001, 0.15 + k * (h - 0.2) / 3)) for k in range(3)], INK, 0.35, n=[0, 1])
    shadow([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], 0.07)
    return add((x0, y0, x1, y1, 0, h + 0.13), s, tag='meuble')
printer(1003, 778, 1028, 802, 1.0)
printer(1006, 818, 1027, 840, 0.85)
cabinet(*Pt(958, 787), *Pt(983, 842), 1.8, '#eceae5', 2)
Box(958, 774, 972, 786, 0, 0.55, BEIGE)

# ====================================================================== TERRASSE
def railing(path, h=1.05, post=1.1):
    for i in range(len(path) - 1):
        A, B = path[i], path[i + 1]
        Lr = math.hypot(B[0] - A[0], B[1] - A[1])
        n = max(1, round(Lr / post))
        s = P([(A[0], A[1], 0.06), (B[0], B[1], 0.06), (B[0], B[1], h), (A[0], A[1], h)], GLASS, None, 0, op=0.16)
        s += SEGS([((A[0] + (B[0] - A[0]) * k / n, A[1] + (B[1] - A[1]) * k / n, 0), (A[0] + (B[0] - A[0]) * k / n, A[1] + (B[1] - A[1]) * k / n, h)) for k in range(n + 1)], INK, 0.7)
        s += L([(A[0], A[1], h), (B[0], B[1], h)], INK, 1.3) + L([(A[0], A[1], 0.06), (B[0], B[1], 0.06)], INK, 0.6)
        xs = (A[0], B[0]); ys = (A[1], B[1])
        add((min(xs) - 0.03, min(ys) - 0.03, max(xs) + 0.03, max(ys) + 0.03, 0, h), s, tag='vitre')
corner = [(X(1442) + m(20) * math.cos(math.radians(a)), Y(525) + m(20) * math.sin(math.radians(a))) for a in (-90, -60, -30, 0)]
railing([Pt(1304, 507)] + corner[:1])
railing(corner, post=0.5)
railing([corner[-1], Pt(1460, 943)])
railing([Pt(1460, 941), Pt(1304, 941)], post=1.2)
FLOOR.extend(L([(X(1304), Y(505), 0.005), (X(1442), Y(505), 0.005)] + [(c[0], c[1], 0.005) for c in corner] +
               [(X(1462), Y(943), 0.005), (X(1304), Y(943), 0.005)], INK, 0.6))
desk(*Pt(1305, 584), *Pt(1318, 688), h=0.9, top=WOOD, leg=CHAR, frame='trestle_y')
for (gy0_, gy1_) in ((586, 605), (608, 628), (643, 663), (667, 687)):
    desk(*Pt(1319, gy0_), *Pt(1339, gy1_), h=0.72, top=BEIGE, leg=CHAR,
         items=[lambda z, g=(gy0_ + gy1_) / 2: mug(X(1328), Y(g), z)] if gy0_ in (608, 667) else [])
shell_chair(*Pt(1351, 596), 180, GREYM)
shell_chair(*Pt(1351, 618), 180, GREYM, 'sit_cup', ST())
shell_chair(*Pt(1351, 653), 180, GREYM, 'sit_talk', ST())
shell_chair(*Pt(1351, 677), 180, GREYM)
# jardinière documentée + arbre
gx0, gy0, gx1, gy1 = 1326, 758, 1420, 925
s = BOX(X(gx0), Y(gy0), X(gx1), Y(gy1), 0, 0.45, '#e9e4da', FINE)
s += P([(X(1337), Y(769), 0.452), (X(1409), Y(769), 0.452), (X(1409), Y(913), 0.452), (X(1337), Y(913), 0.452)], '#a28a7b', INK, 0.5)
rr2 = random.Random(5)
for k in range(520):
    x_ = X(1338) + rr2.random() * m(70); y_ = Y(770) + rr2.random() * m(142)
    a_ = rr2.uniform(3.4, 6.0); ll = rr2.uniform(3.5, 6.5)
    s += LEAF((x_, y_, 0.46), (0, 0), (ll * math.cos(a_), ll * math.sin(a_)), 1.4, rr2.choice([SAGE, SAGE_D, SAGE_L, SAGE, '#c3c6b4']), 0.28, det=1)
shadow([Pt(gx0, gy0), Pt(gx1, gy0), Pt(gx1, gy1), Pt(gx0, gy1)], 0.08)
add((X(gx0), Y(gy0), X(gx1), Y(gy1), 0, 0.46), s, tag='meuble')
tree(X(1373), Y(850), 0.45, 1.85, 1.3, n=560)
plant(*Pt(1325, 530), 'olive', 0.26, 0.5, 0.95)
plant(*Pt(1440, 560), 'grass', 0.24, 0.48, 1.0)
plant(*Pt(1440, 700), 'leafy', 0.24, 0.48, 1.0)
plant(*Pt(1325, 735), 'grass', 0.2, 0.45, 0.85)

# ====================================================================== PERSONNES EN MOUVEMENT
person(X(905), Y(184), 180, 'walk', ST(top=PETROLE_M))
person(X(782), Y(560), -90, 'walk', ST())
person(X(1000), Y(733), 0, 'tablet', ST())
person(X(1325), Y(570), 20, 'cup', ST())

# ====================================================================== ACCÈS TERRASSE (au sol)
for gyc in (561, 747.5):
    floor_lines([(Pt(1228, gyc), Pt(1338, gyc))], PETROLE, 0.9, layer=LAB, dash=[4, 3], sop=0.75)
    LAB.extend(L([(X(1326), Y(gyc - 6), 0.003), (X(1338), Y(gyc), 0.003), (X(1326), Y(gyc + 6), 0.003)], PETROLE, 1.0, sop=0.85))
THRESH.extend(P([(X(1295), Y(545), 0.004), (X(1307), Y(545), 0.004), (X(1307), Y(577), 0.004), (X(1295), Y(577), 0.004)], PETROLE_L, INK, 0.5))
THRESH.extend(P([(X(1295), Y(732), 0.004), (X(1307), Y(732), 0.004), (X(1307), Y(763), 0.004), (X(1295), Y(763), 0.004)], PETROLE_L, INK, 0.5))
