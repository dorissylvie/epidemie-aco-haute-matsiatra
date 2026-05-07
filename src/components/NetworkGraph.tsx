import type { Center, Depot, Plan } from "../types/model";

type Props = {
  depot: Depot;
  centers: Center[];
  selectedPlan?: Plan;
};

function nodeColor(stockLevel: number) {
  if (stockLevel < 0.25) return "#dc2626";
  if (stockLevel < 0.45) return "#f97316";
  return "#16a34a";
}

// Fonction pour calculer les flèches
function getArrowPath(x1: number, y1: number, x2: number, y2: number) {
  const headlen = 1.5;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const endX = x2 - headlen * Math.cos(angle);
  const endY = y2 - headlen * Math.sin(angle);
  return {
    lineEnd: { x: endX, y: endY },
    arrowHead: {
      x: x2,
      y: y2,
      angle: (angle * 180) / Math.PI,
    },
  };
}

// Fonction pour calculer le point médian d'une arête
function getMidpoint(x1: number, y1: number, x2: number, y2: number) {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
  };
}

export function NetworkGraph({ depot, centers, selectedPlan }: Props) {
  const nodes = [depot, ...centers];

  const byId = new Map(nodes.map((n) => [n.id, n]));

  const highlightedSegments: Array<{
    from: string;
    to: string;
    order: number;
  }> = [];
  if (selectedPlan) {
    for (let i = 0; i < selectedPlan.route.length - 1; i += 1) {
      highlightedSegments.push({
        from: selectedPlan.route[i],
        to: selectedPlan.route[i + 1],
        order: i + 1,
      });
    }
  }

  return (
    <svg
      viewBox="0 0 100 100"
      className="network-svg"
      role="img"
      aria-label="Graphe des routes"
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" fill="var(--teal)" />
        </marker>
        <linearGradient
          id="networkGradient"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop offset="0%" stopColor="var(--sky)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="var(--teal)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* Fond avec dégradé */}
      <rect width="100" height="100" fill="url(#networkGradient)" />

      {/* Arêtes légères (tous les chemins possibles) */}
      {nodes.map((a, i) =>
        nodes
          .slice(i + 1)
          .map((b) => (
            <line
              key={`${a.id}-${b.id}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className="edge-light"
            />
          )),
      )}

      {/* Route sélectionnée avec flèches */}
      {highlightedSegments.map((segment, index) => {
        const from = byId.get(segment.from);
        const to = byId.get(segment.to);
        if (!from || !to) return null;

        const arrow = getArrowPath(from.x, from.y, to.x, to.y);
        const midpoint = getMidpoint(from.x, from.y, to.x, to.y);

        return (
          <g key={`segment-${segment.from}-${segment.to}-${index}`}>
            {/* Ligne de route */}
            <line
              x1={from.x}
              y1={from.y}
              x2={arrow.lineEnd.x}
              y2={arrow.lineEnd.y}
              className="edge-selected"
              strokeWidth="1.2"
            />
            {/* Flèche */}
            <polygon
              points={`${arrow.arrowHead.x},${arrow.arrowHead.y} ${arrow.arrowHead.x - 1.2 * Math.cos((arrow.arrowHead.angle - 30) * (Math.PI / 180))},${arrow.arrowHead.y - 1.2 * Math.sin((arrow.arrowHead.angle - 30) * (Math.PI / 180))} ${arrow.arrowHead.x - 1.2 * Math.cos((arrow.arrowHead.angle + 30) * (Math.PI / 180))},${arrow.arrowHead.y - 1.2 * Math.sin((arrow.arrowHead.angle + 30) * (Math.PI / 180))}`}
              fill="var(--teal)"
              className="route-arrow"
            />
            {/* Numérotation de l'étape */}
            <circle
              cx={midpoint.x}
              cy={midpoint.y}
              r="2"
              fill="var(--orange)"
              stroke="white"
              strokeWidth="0.6"
              className="step-number-bg"
            />
            <text
              x={midpoint.x}
              y={midpoint.y + 0.7}
              className="step-number"
              textAnchor="middle"
            >
              {index + 1}
            </text>
          </g>
        );
      })}

      {/* Dépôt */}
      <g className="depot-group">
        <circle cx={depot.x} cy={depot.y} r={3.8} className="depot-node" />
        <circle
          cx={depot.x}
          cy={depot.y}
          r={3.8}
          className="depot-node-glow"
          opacity="0"
        />
        <text x={depot.x + 2.5} y={depot.y - 2} className="node-label">
          Dépôt
        </text>
      </g>

      {/* Centres */}
      {centers.map((center, idx) => (
        <g key={center.id} className="center-group">
          {/* Halo de sélection */}
          <circle
            cx={center.x}
            cy={center.y}
            r="4.2"
            className="center-node-halo"
            opacity="0"
          />
          {/* Nœud principal */}
          <circle
            cx={center.x}
            cy={center.y}
            r={3.2}
            style={{ fill: nodeColor(center.stockLevel) }}
            className="center-node"
          />
          {/* Label */}
          <text x={center.x + 2.2} y={center.y - 2.1} className="node-label">
            {center.id}
          </text>
          {/* Info compacte au survol */}
          <title>
            {center.name} - Incidence: {Math.round(center.incidence7d)}/100k -
            Stock: {Math.round(center.stockLevel * 100)}%
          </title>
        </g>
      ))}
    </svg>
  );
}
