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

export function NetworkGraph({ depot, centers, selectedPlan }: Props) {
  const nodes = [depot, ...centers];

  const byId = new Map(nodes.map((n) => [n.id, n]));

  const highlightedSegments: Array<{ from: string; to: string }> = [];
  if (selectedPlan) {
    for (let i = 0; i < selectedPlan.route.length - 1; i += 1) {
      highlightedSegments.push({
        from: selectedPlan.route[i],
        to: selectedPlan.route[i + 1],
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

      {highlightedSegments.map((segment, index) => {
        const from = byId.get(segment.from);
        const to = byId.get(segment.to);
        if (!from || !to) return null;

        return (
          <line
            key={`${segment.from}-${segment.to}-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className="edge-selected"
          />
        );
      })}

      <circle cx={depot.x} cy={depot.y} r={3.8} className="depot-node" />
      <text x={depot.x + 2.5} y={depot.y - 2} className="node-label">
        Depot
      </text>

      {centers.map((center) => (
        <g key={center.id}>
          <circle
            cx={center.x}
            cy={center.y}
            r={3.2}
            style={{ fill: nodeColor(center.stockLevel) }}
            className="center-node"
          />
          <text x={center.x + 2.2} y={center.y - 2.1} className="node-label">
            {center.id}
          </text>
        </g>
      ))}
    </svg>
  );
}
