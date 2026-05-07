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

export function NetworkGraphInitial({ depot, centers, selectedPlan }: Props) {
  const nodes = [depot, ...centers];

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

      {/* Légende stock */}
      <g className="network-legend">
        <rect
          x="2"
          y="2"
          width="24"
          height="12"
          rx="1.5"
          fill="white"
          opacity="0.92"
        />
        <circle cx="5" cy="6" r="1.2" fill="#16a34a" />
        <text x="7.2" y="6.8" className="legend-text">
          Bon
        </text>
        <circle cx="13" cy="6" r="1.2" fill="#f97316" />
        <text x="15.2" y="6.8" className="legend-text">
          Moyen
        </text>
        <circle cx="20.5" cy="6" r="1.2" fill="#dc2626" />
        <text x="22.7" y="6.8" className="legend-text">
          Critique
        </text>
      </g>
    </svg>
  );
}
