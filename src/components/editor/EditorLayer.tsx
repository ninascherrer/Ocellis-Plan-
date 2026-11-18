import type { PlanEditor } from '../../hooks/usePlanEditor';
import { toSvgPoints } from '../../lib/geometry';
import type { PlanInfo } from '../../types';

interface EditorLayerProps {
  editor: PlanEditor;
  plan: PlanInfo;
  /** Échelle courante : sert à garder des poignées de taille constante à l'écran. */
  scale: number;
  color: string;
}

/** Poignées de sommets, points médians et tracé en cours, dessinés dans le repère du plan. */
export function EditorLayer({ editor, plan, scale, color }: EditorLayerProps) {
  const { zone, selectedVertex, drawing, cursor } = editor;
  const px = (n: number) => n / scale;

  if (drawing) {
    const preview = cursor && drawing.length > 0 ? [...drawing, cursor] : drawing;
    return (
      <g className="editor-layer is-drawing">
        {/* Surface de capture : chaque clic ajoute un sommet (un glisser déplace toujours le plan). */}
        <rect
          className="draw-capture"
          x={-plan.largeur}
          y={-plan.hauteur}
          width={plan.largeur * 3}
          height={plan.hauteur * 3}
          onClick={(e) => editor.addDrawingPoint(e.clientX, e.clientY, e.altKey)}
        />
        {preview.length > 1 && (
          <polyline className="draw-line" points={toSvgPoints(preview)} vectorEffect="non-scaling-stroke" />
        )}
        {drawing.length > 2 && (
          <polygon className="draw-fill" points={toSvgPoints(drawing)} />
        )}
        {drawing.map(([x, y], i) => (
          <circle
            key={i}
            className={`handle${i === 0 && drawing.length > 2 ? ' handle-close' : ''}`}
            cx={x}
            cy={y}
            r={px(i === 0 && drawing.length > 2 ? 7 : 4.5)}
            vectorEffect="non-scaling-stroke"
            data-no-pan={i === 0 ? '' : undefined}
            onClick={i === 0 ? () => editor.finishDrawing() : undefined}
          >
            {i === 0 && drawing.length > 2 && <title>Fermer le contour</title>}
          </circle>
        ))}
      </g>
    );
  }

  if (!zone) return null;
  const points = zone.contour;

  return (
    <g className="editor-layer" style={{ color }}>
      <polygon className="edit-outline" points={toSvgPoints(points)} vectorEffect="non-scaling-stroke" />

      <g data-no-pan>
        {points.map((a, i) => {
          const b = points[(i + 1) % points.length];
          return (
            <circle
              key={`m-${i}`}
              className="handle handle-mid"
              cx={(a[0] + b[0]) / 2}
              cy={(a[1] + b[1]) / 2}
              r={px(3.5)}
              vectorEffect="non-scaling-stroke"
              onPointerDown={(e) => editor.onMidpointPointerDown(i, e)}
            >
              <title>Ajouter un sommet</title>
            </circle>
          );
        })}
        {points.map(([x, y], i) => (
          <circle
            key={`v-${i}`}
            className={`handle${i === selectedVertex ? ' is-selected' : ''}`}
            cx={x}
            cy={y}
            r={px(i === selectedVertex ? 6.5 : 5)}
            vectorEffect="non-scaling-stroke"
            onPointerDown={(e) => editor.onVertexPointerDown(i, e)}
            onDoubleClick={() => editor.deleteVertex(i)}
          >
            <title>{`Sommet ${i + 1} : ${x} ; ${y}`}</title>
          </circle>
        ))}
      </g>
    </g>
  );
}
