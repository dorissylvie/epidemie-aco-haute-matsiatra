import type { Center, Depot, Plan } from "../types/model";

type Props = {
  depot: Depot;
  centers: Center[];
  selectedPlan?: Plan;
};

export function NetworkGraphInitial({ depot, centers, selectedPlan }: Props) {
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
            style={{ fill: "#32a096" }}
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
