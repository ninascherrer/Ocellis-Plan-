/**
 * Plan redessiné en vecteurs, dans le repère de l'image d'origine (624 × 625).
 *
 * Chaque élément reprend la position relevée sur le plan d'architecte : rien
 * n'est déplacé ni ajouté. Seuls les éléments utiles à l'orientation sont
 * conservés (murs, cloisons, portes, escaliers, ascenseurs, mobilier principal) ;
 * les cotes, trames, hachures et annotations techniques sont volontairement omises.
 *
 * Les couleurs viennent des variables CSS `--plan-*` (src/styles/theme.css).
 * Les circulations sont colorées à partir des zones de la catégorie
 * « circulations » de espaces.json : dessin et zones restent alignés.
 */
import { memo, type ReactNode } from 'react';
import type { Point } from '../types';
import { CADRE_SPIX, FACADE_TERRASSE_SVG, MURS, NOYAU, PORTES } from './structure';

// --- Primitives ----------------------------------------------------------------

/** Mur plein : rectangle (x, y, largeur, hauteur). */
const W = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <rect className="d-wall" x={x} y={y} width={w} height={h} />
);

/**
 * Porte : vantail du gond `h` jusqu'à `ouvert`, et arc de débattement depuis
 * `ferme` (le point du vantail fermé, dans l'axe du mur).
 */
function Porte({ h, ferme, ouvert }: { h: Point; ferme: Point; ouvert: Point }) {
  const r = Math.hypot(ferme[0] - h[0], ferme[1] - h[1]);
  // Sens de l'arc : produit vectoriel (gond → fermé) × (gond → ouvert).
  const cross = (ferme[0] - h[0]) * (ouvert[1] - h[1]) - (ferme[1] - h[1]) * (ouvert[0] - h[0]);
  return (
    <g className="d-door">
      <path className="d-door-arc" d={`M${ferme[0]} ${ferme[1]} A${r} ${r} 0 0 ${cross > 0 ? 1 : 0} ${ouvert[0]} ${ouvert[1]}`} />
      <line className="d-door-leaf" x1={h[0]} y1={h[1]} x2={ouvert[0]} y2={ouvert[1]} />
    </g>
  );
}

/** Mobilier : rectangle à coins adoucis. */
const M = ({ x, y, w, h, r = 1, className = 'd-furniture' }: { x: number; y: number; w: number; h: number; r?: number; className?: string }) => (
  <rect className={className} x={x} y={y} width={w} height={h} rx={r} />
);

/** Chaise vue de dessus, orientée vers `a` degrés (0 = dossier en haut). */
function Chaise({ x, y, a = 0, s = 7 }: { x: number; y: number; a?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`} className="d-chair">
      <rect x={-s / 2} y={-s / 2} width={s} height={s} rx={1.6} />
      <line x1={-s / 2 + 0.8} y1={-s / 2 + 1.3} x2={s / 2 - 0.8} y2={-s / 2 + 1.3} />
    </g>
  );
}

/** Rangée de chaises le long d'un bord de table. */
const chaises = (xs: number[], y: number, a: number, s?: number) =>
  xs.map((x) => <Chaise key={`c${x}-${y}`} x={x} y={y} a={a} s={s} />);

/** Casiers : bloc divisé en portes régulières. */
function Casiers({ x, y, w, h, n }: { x: number; y: number; w: number; h: number; n: number }) {
  const lines: ReactNode[] = [];
  for (let i = 1; i < n; i++) {
    const xi = x + (w * i) / n;
    lines.push(<line key={i} x1={xi} y1={y} x2={xi} y2={y + h} />);
  }
  return (
    <g className="d-lockers">
      <rect x={x} y={y} width={w} height={h} />
      {lines}
    </g>
  );
}

/** Volée de marches : traits parallèles entre deux bornes. */
function Marches({ x1, y1, x2, y2, n, sens }: { x1: number; y1: number; x2: number; y2: number; n: number; sens: 'h' | 'v' }) {
  const lines: ReactNode[] = [];
  for (let i = 0; i <= n; i++) {
    if (sens === 'v') {
      const x = x1 + ((x2 - x1) * i) / n;
      lines.push(<line key={i} x1={x} y1={y1} x2={x} y2={y2} />);
    } else {
      const y = y1 + ((y2 - y1) * i) / n;
      lines.push(<line key={i} x1={x1} y1={y} x2={x2} y2={y} />);
    }
  }
  return <g className="d-steps">{lines}</g>;
}

/** Cabine d'ascenseur : gaine et croix. */
function Ascenseur({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <g className="d-lift">
      <rect x={x} y={y} width={w} height={h} />
      <line x1={x} y1={y} x2={x + w} y2={y + h} />
      <line x1={x + w} y1={y} x2={x} y2={y + h} />
    </g>
  );
}

/** Pictogramme d'accessibilité, repris des symboles du plan d'origine. */
function Pmr({ x, y, s = 9 }: { x: number; y: number; s?: number }) {
  const k = s / 24;
  return (
    <g className="d-pmr" transform={`translate(${x - s / 2} ${y - s / 2}) scale(${k})`}>
      <circle cx={10} cy={3.5} r={2.2} />
      <path d="M10 7v7h6l3 6M10 10h5" />
      <path d="M7.5 11.5a6 6 0 1 0 8 8" />
    </g>
  );
}

/** WC vu de dessus. */
const Wc = ({ x, y, a = 0 }: { x: number; y: number; a?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${a})`} className="d-furniture">
    <rect x={-4} y={-5} width={8} height={3} rx={0.8} />
    <ellipse cx={0} cy={1.5} rx={3.2} ry={4} />
  </g>
);

// --- Dessin ---------------------------------------------------------------------

interface PlanDessinProps {
  largeur: number;
  hauteur: number;
  /** Contours des zones de circulation (catégorie « circulations »). */
  circulations: Point[][];
}

const pts = (points: Point[]) => points.map(([x, y]) => `${x},${y}`).join(' ');

function PlanDessinBrut({ largeur, hauteur, circulations }: PlanDessinProps) {
  return (
    <g className="plan-dessin" aria-hidden="true">
      {/* Fond de l'étage (bureaux) et terrasse */}
      <rect className="d-floor" x={30} y={0} width={470} height={602} />
      <path className="d-terrace" d="M505 309H597Q612 309 612 324V603H505Z" />

      {/* Circulations, colorées d'après les zones interactives */}
      <g className="d-circulation">
        {circulations.map((contour, i) => (
          <polygon key={i} points={pts(contour)} />
        ))}
      </g>

      {/* Lames de la terrasse (repère du revêtement extérieur) */}
      <g className="d-slats">
        {Array.from({ length: 48 }, (_, i) => 316 + i * 6).map((y) => (
          <line key={y} x1={506} y1={y} x2={611} y2={y} />
        ))}
      </g>

      {/* ---------------------------------------------- Mobilier */}
      <g className="d-furniture-layer">
        {/* Espace 01 : canapé d'angle, poufs, fauteuil, banquette */}
        <path className="d-furniture" d="M36 4H128V35H117V17H48V35H36Z" />
        <M x={58} y={16} w={11} h={7} />
        <M x={88} y={16} w={11} h={7} />
        <M x={48} y={24} w={10} h={11} />
        <g transform="rotate(-16 41 47)">
          <M x={34} y={40} w={14} h={13} r={2} />
        </g>
        <M x={55} y={58} w={63} h={6} r={3} />
        {/* NOVA : écran TV sur le mur, au-dessus de la console */}
        <rect className="d-wall" x={78} y={61.3} width={35} height={2} rx={0.6} />

        {/* Espace 02 : table, quatre chaises, siège rond */}
        <M x={163} y={18} w={74} h={28} />
        {[180, 201].map((x) => (
          <g key={x}>
            <circle className="d-furniture" cx={x} cy={12} r={5.5} />
            <circle className="d-furniture" cx={x} cy={51} r={5.5} />
          </g>
        ))}
        <circle className="d-furniture" cx={227} cy={11} r={7} />

        {/* Espace 03 : plan de travail trois places, fauteuil */}
        <M x={381} y={8} w={17} h={52} />
        {[16, 34, 51].map((y) => (
          <Chaise key={y} x={371} y={y} a={90} />
        ))}
        <g transform="rotate(30 358 17)">
          <M x={352} y={11} w={12} h={12} r={1.5} />
        </g>

        {/* Espace 04 : plans de travail le long des parois */}
        <M x={411} y={3} w={17} h={59} />
        <M x={482} y={3} w={15} h={90} />
        <Chaise x={433} y={17} a={-90} />
        <Chaise x={433} y={47} a={-90} />
        <Chaise x={471} y={13} a={90} />
        <Chaise x={471} y={40} a={90} />
        <Chaise x={471} y={70} a={90} />

        {/* Espace 05 : deux tables de six places */}
        <M x={33} y={97} w={95} h={38} />
        <line className="d-furniture-line" x1={65} y1={97} x2={65} y2={135} />
        <line className="d-furniture-line" x1={96} y1={97} x2={96} y2={135} />
        {chaises([48, 80, 111], 90, 0)}
        {chaises([48, 80, 111], 142, 180)}
        <M x={33} y={187} w={95} h={38} />
        {chaises([48, 80, 111], 180, 0)}
        {chaises([48, 80, 111], 232, 180)}

        {/* Espace 06 : deux postes cloisonnés — Espace 07 : volume grisé */}
        <M x={33} y={258} w={17} h={66} />
        <M x={51} y={258} w={35} h={33} r={0.5} />
        <M x={51} y={291} w={35} h={33} r={0.5} />
        <Chaise x={63} y={275} a={-90} />
        <Chaise x={63} y={308} a={-90} />
        <rect className="d-volume" x={86} y={258} width={42} height={66} />

        {/* Espace 08 : îlot de six postes */}
        <M x={33} y={359} w={95} h={40} />
        <line className="d-furniture-line" x1={33} y1={379} x2={128} y2={379} />
        <line className="d-furniture-line" x1={64} y1={359} x2={64} y2={399} />
        <line className="d-furniture-line" x1={96} y1={359} x2={96} y2={399} />
        {chaises([48, 80, 111], 352, 0)}
        {chaises([48, 80, 111], 406, 180)}

        {/* Colonne de services : casiers, alcôves, SPIX, poste */}
        <Casiers x={163} y={101} w={35} h={14} n={4} />
        <M x={165} y={132} w={32} h={12} />
        <circle className="d-furniture" cx={180} cy={138} r={3.5} />
        <circle className="d-furniture" cx={172} cy={155} r={5} />
        <g transform="rotate(35 187 161)">
          <M x={183} y={154} w={8} h={14} r={3} />
        </g>
        <g transform="rotate(-25 175 184)">
          <M x={171} y={177} w={8} h={14} r={3} />
        </g>
        <circle className="d-furniture" cx={185} cy={185} r={5} />
        {/* Box B : même configuration que la Box C (cabine SPIX, banquettes face à face, table) */}
        <rect className="d-wall-frame" x={167} y={196} width={31} height={46} />
        <M x={169} y={198} w={27} h={9} r={2} />
        <M x={169} y={231} w={27} h={9} r={2} />
        <M x={178} y={211} w={13} h={16} />
        <Casiers x={163} y={245} w={35} h={13} n={4} />
        <Casiers x={163} y={300} w={35} h={13} n={4} />
        <M x={171} y={318} w={24} h={12} r={1.5} />
        {/* Touchdown : alcôve SPIX version une place (même style que la Box C) */}
        <rect className="d-wall-frame" x={167} y={365} width={31} height={37} />
        <M x={171} y={367} w={23} h={9} r={1.5} />
        <M x={176} y={390} w={17} h={10} r={2} />
        <Casiers x={166} y={406} w={32} h={14} n={4} />

        {/* Matériauthèque, côté couloir : étagères et consultation (« BIBLIO + CONSULT » au plan) */}
        <rect className="d-furniture" x={350} y={101} width={17} height={164} rx={4} />
        <line className="d-furniture-line" x1={355} y1={106} x2={355} y2={260} />

        {/* Matériauthèque : étagère courbe autour de la salle vitrée */}
        <path className="d-furniture" d="M400 87H446Q449 87 449 91.5Q449 96 446 96H411.5V200Q413 220 431 225V240Q400 232 398 210V89Q398 87 400 87Z" />

        {/* Espace 13 : table et six chaises — comptoir, vestiaires, banquette */}
        <M x={434} y={125} w={35} h={58} r={5} />
        {[136, 154, 171].map((y) => (
          <g key={y}>
            <Chaise x={428} y={y} a={-90} />
            <Chaise x={475} y={y} a={90} />
          </g>
        ))}
        <M x={412} y={203} w={70} h={7} />
        {[437, 459, 478].map((x) => (
          <circle key={x} className="d-furniture" cx={x} cy={216} r={4} />
        ))}
        <M x={431} y={226} w={21} h={14} r={0.5} />
        <path className="d-furniture" d="M452 226H473Q497 226 497 250V290H484V256Q484 240 470 240H452Z" />
        <circle className="d-furniture" cx={421} cy={258} r={5} />
        <circle className="d-furniture" cx={457} cy={262} r={10} />
        <circle className="d-furniture" cx={452} cy={283} r={5.5} />

        {/* Espace 14 : îlot, tabourets et linéaire équipé */}
        <path className="d-furniture" d="M385 342V315A17.5 17.5 0 0 1 420 315V342Z" />
        {[
          [393, 288],
          [410, 287],
          [426, 304],
          [427, 323],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} className="d-furniture" cx={x} cy={y} r={4} />
        ))}
        <M x={400} y={335} w={21} h={97} />
        {[349, 363, 377, 391, 405, 418].map((y) => (
          <line key={y} className="d-furniture-line" x1={400} y1={y} x2={421} y2={y} />
        ))}
        <M x={387} y={352} w={12} h={58} />
        <line className="d-furniture-line" x1={387} y1={371} x2={399} y2={371} />
        <line className="d-furniture-line" x1={387} y1={390} x2={399} y2={390} />
        <M x={352} y={413} w={48} h={19} />
        <circle className="d-furniture" cx={378} cy={422} r={3.5} />
        <circle className="d-furniture" cx={390} cy={422} r={3.5} />

        {/* Espace 15 : mange-debout, tabourets, banquettes */}
        <M x={487} y={354} w={10} h={36} r={1.5} />
        <M x={487} y={394} w={10} h={36} r={1.5} />
        <M x={477} y={357} w={10} h={32} />
        <M x={477} y={397} w={10} h={32} />
        {[364, 382, 404, 421].map((y) => (
          <circle key={y} className="d-furniture" cx={469} cy={y} r={5} />
        ))}

        {/* Espaces 16 et 17 : postes individuels */}
        <M x={54} y={497} w={38} h={18} />
        <M x={95} y={497} w={45} h={18} />
        <Chaise x={73} y={490} a={180} />
        <Chaise x={106} y={490} a={180} />
        <Chaise x={128} y={490} a={180} />

        {/* Espace 18 : table ovale et huit chaises */}
        <M x={73} y={545} w={83} h={30} r={15} />
        {chaises([91, 114, 136], 537, 0)}
        {chaises([91, 114, 136], 583, 180)}
        <Chaise x={65} y={552} a={-60} />
        <Chaise x={65} y={569} a={-120} />

        {/* Rangements le long des cloisons */}
        {/* OSMOSE : mur plein côté sanitaires, avec un grand écran TV face à la table */}
        <rect className="d-wall-frame" x={176} y={516} width={17} height={84} />
        <rect className="d-wall" x={172.5} y={540} width={2.5} height={40} rx={0.6} />
        <M x={360} y={492} w={11} h={56} r={0.5} />
        <M x={360} y={551} w={11} h={47} r={0.5} />

        {/* Sanitaires : lavabos et WC */}
        <path className="d-furniture" d="M235 566h9v12h-9a6 6 0 0 1 0-12Z" />
        <path className="d-furniture" d="M321 566h-9v12h9a6 6 0 0 0 0-12Z" />
        <Wc x={264} y={552} a={90} />
        <Wc x={264} y={572} a={90} />
        <Wc x={296} y={552} a={-90} />
        <Wc x={296} y={572} a={-90} />
        <Wc x={268} y={592} a={90} />
        <Wc x={292} y={592} a={-90} />

        {/* Espace 19 : équipements */}
        <M x={255} y={491} w={11} h={13} r={0.5} />
        <M x={250} y={509} w={16} h={23} r={0.5} />
        <M x={269} y={499} w={12} h={18} r={0.5} />
        <M x={269} y={519} w={12} h={18} r={0.5} />
        <M x={300} y={491} w={16} h={26} r={0.5} />
        <M x={302} y={520} w={14} h={15} r={0.5} />

        {/* Espace 20 : table de huit places, banquette et assises */}
        <path className="d-furniture" d="M405 495H441A12.5 12.5 0 0 1 441 520H405A12.5 12.5 0 0 1 405 495Z" />
        <line className="d-furniture-line" x1={423} y1={495} x2={423} y2={520} />
        {chaises([414, 433], 487, 0)}
        {chaises([414, 433], 528, 180)}
        <Chaise x={396} y={491} a={-45} />
        <Chaise x={450} y={491} a={45} />
        <Chaise x={396} y={524} a={-135} />
        <Chaise x={450} y={524} a={135} />
        <M x={376} y={584} w={120} h={13} r={1.5} />
        <line className="d-furniture-line" x1={410} y1={584} x2={410} y2={597} />
        <line className="d-furniture-line" x1={462} y1={584} x2={462} y2={597} />
        {[382, 397, 425, 440, 470, 485].map((x) => (
          <M key={x} x={x} y={565} w={12} h={13} r={2} />
        ))}

        {/* Terrasse : jardinière plantée, fauteuils et tables basses */}
        <rect className="d-planter" x={528} y={477} width={60} height={123} rx={1} />
        <rect className="d-furniture" x={535} y={484} width={47} height={110} />
        <g className="d-tree">
          <circle cx={559} cy={530} r={20} />
          <circle cx={551} cy={552} r={13} />
          <circle cx={566} cy={515} r={11} />
        </g>
        {[362, 386, 410, 433].map((y) => (
          <path key={y} className="d-furniture" d={`M538 ${y - 7}h6a7 7 0 0 1 0 14h-6Z`} />
        ))}
        <M x={519} y={353} w={13} h={27} />
        <M x={519} y={400} w={13} h={27} />
      </g>

      {/* ---------------------------------------------- Circulations verticales */}
      <g className="d-on-circulation">
        {/* Escalier du haut */}
        <Marches x1={266} y1={3} x2={330} y2={37} n={11} sens="v" />
        <path className="d-steps-outline" d="M246 3H332V38H246Z" />
        <path className="d-steps-outline" d="M266 3V38M246 20H266M252 3L266 20M246 30L266 20M258 38L266 20" />
        <rect className="d-steps-outline" x={246} y={50} width={24} height={12} />
        <rect className="d-steps-outline" x={275} y={50} width={55} height={12} />

        {/* Ascenseurs et palier */}
        <Ascenseur x={225} y={214} w={44} h={44} />
        <Ascenseur x={281} y={192} w={46} h={66} />
        <rect className="d-steps-outline" x={267} y={268} width={33} height={22} strokeDasharray="2 1.5" />

        {/* Escalier central autour de l'ascenseur */}
        <Ascenseur x={252} y={322} w={58} h={66} />
        <Marches x1={210} y1={348} x2={244} y2={430} n={14} sens="h" />
        <Marches x1={318} y1={348} x2={338} y2={430} n={14} sens="h" />
        <Marches x1={252} y1={398} x2={310} y2={430} n={10} sens="v" />
        <path className="d-steps-outline" d="M208 346H340V432H208Z" />
        <path className="d-steps-outline" d="M216 346Q216 310 272 304Q330 310 332 346" strokeDasharray="2.5 2" />

      </g>

      {/* ---------------------------------------------- Murs et cloisons (src/plan/structure.ts) */}
      <g className="d-walls">
        <polygon className="d-core" points={pts(NOYAU)} />
        {MURS.map((m) => (
          <W key={`${m.x}-${m.y}-${m.w}-${m.h}`} x={m.x} y={m.y} w={m.w} h={m.h} />
        ))}
        <path className="d-wall-line" d={FACADE_TERRASSE_SVG} />
        <rect className="d-wall-frame" x={CADRE_SPIX.x} y={CADRE_SPIX.y} width={CADRE_SPIX.w} height={CADRE_SPIX.h} />
      </g>

      {/* ---------------------------------------------- Portes */}
      <g className="d-doors">
        {PORTES.map((p) => (
          <Porte key={`${p.h[0]}-${p.h[1]}`} {...p} />
        ))}
      </g>

      {/* Repères d'accessibilité (ascenseurs, palier, WC) */}
      <g className="d-pmr-layer">
        <Pmr x={247} y={236} />
        <Pmr x={304} y={225} />
        <Pmr x={283} y={279} />
        <Pmr x={281} y={355} />
      </g>
      <g className="d-pmr-layer d-pmr-floor">
        <Pmr x={255} y={591} />
        <Pmr x={305} y={591} />
      </g>

      {/* Cadre invisible : fixe l'emprise du dessin au repère du plan */}
      <rect x={0} y={0} width={largeur} height={hauteur} fill="none" />
    </g>
  );
}

/** Dessin figé : il ne dépend pas du zoom ni du déplacement, inutile de le recalculer pendant un geste. */
export const PlanDessin = memo(PlanDessinBrut);
