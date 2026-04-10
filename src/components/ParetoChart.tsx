import type { Plan } from "../types/model";

type Props = {
  plans: Plan[];
  selectedPlanId?: string;
  onSelect: (planId: string) => void;
};

const PADDING = 14;
const GRID_LINES = 4;

export function ParetoChart({ plans, selectedPlanId, onSelect }: Props) {
  if (plans.length === 0) {
    return <p>Aucune solution non dominee disponible.</p>;
  }

  const tMin = Math.min(...plans.map((p) => p.totalTime));
  const tMax = Math.max(...plans.map((p) => p.totalTime));
  const cMin = Math.min(...plans.map((p) => p.coverageScore));
  const cMax = Math.max(...plans.map((p) => p.coverageScore));

  const scaleX = (value: number) => {
    const normalized = (value - tMin) / (tMax - tMin || 1);
    return PADDING + normalized * (100 - PADDING * 2);
  };

  const scaleY = (value: number) => {
    const normalized = (value - cMin) / (cMax - cMin || 1);
    return 100 - PADDING - normalized * (100 - PADDING * 2);
  };

  // Génération de grille intelligente
  const gridData = Array.from({ length: GRID_LINES + 1 }, (_, i) => i / GRID_LINES);

  return (
    <svg
      viewBox="0 0 100 100"
      className="pareto-svg"
      role="img"
      aria-label="Front de Pareto"
    >
      <defs>
        <linearGradient id="paretoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--teal)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="var(--orange)" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* Fond avec dégradé */}
      <rect
        x={PADDING}
        y={PADDING}
        width={100 - PADDING * 2}
        height={100 - PADDING * 2}
        fill="url(#paretoGradient)"
        rx="2"
      />

      {/* Grille verticale (temps) */}
      {gridData.map((normalized, i) => {
        const x = PADDING + normalized * (100 - PADDING * 2);
        const timeValue = tMin + normalized * (tMax - tMin);
        return (
          <g key={`grid-x-${i}`}>
            <line
              x1={x}
              y1={PADDING}
              x2={x}
              y2={100 - PADDING}
              stroke="var(--line)"
              strokeWidth="0.4"
              opacity="0.3"
              strokeDasharray="1,1"
            />
            <text
              x={x}
              y={100 - PADDING + 3.5}
              className="pareto-tick-label"
              textAnchor="middle"
            >
              {Math.round(timeValue)}
            </text>
          </g>
        );
      })}

      {/* Grille horizontale (couvrance) */}
      {gridData.map((normalized, i) => {
        const y = 100 - PADDING - normalized * (100 - PADDING * 2);
        const coverageValue = cMin + normalized * (cMax - cMin);
        return (
          <g key={`grid-y-${i}`}>
            <line
              x1={PADDING}
              y1={y}
              x2={100 - PADDING}
              y2={y}
              stroke="var(--line)"
              strokeWidth="0.4"
              opacity="0.3"
              strokeDasharray="1,1"
            />
            <text
              x={PADDING - 2}
              y={y + 1.2}
              className="pareto-tick-label"
              textAnchor="end"
            >
              {Math.round(coverageValue)}%
            </text>
          </g>
        );
      })}

      {/* Axes principaux */}
      <line
        x1={PADDING}
        y1={100 - PADDING}
        x2={100 - PADDING}
        y2={100 - PADDING}
        className="axis"
        strokeWidth="1.2"
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={100 - PADDING}
        className="axis"
        strokeWidth="1.2"
      />

      {/* Flèches des axes */}
      <polygon
        points={`${100 - PADDING + 1},${100 - PADDING} ${100 - PADDING + 2.5},${100 - PADDING - 0.6} ${100 - PADDING + 2.5},${100 - PADDING + 0.6}`}
        fill="var(--ink-900)"
      />
      <polygon
        points={`${PADDING},${PADDING - 1} ${PADDING - 0.6},${PADDING - 2.5} ${PADDING + 0.6},${PADDING - 2.5}`}
        fill="var(--ink-900)"
      />

      {/* Labels des axes */}
      <text x={47} y={98.5} className="pareto-axis-label">
        Temps total (min)
      </text>
      <text x={5} y={5} className="pareto-axis-label" transform="rotate(-90 5 5)">
        Couvrance (%)
      </text>

      {/* Points */}
      {plans.map((plan, idx) => {
        const x = scaleX(plan.totalTime);
        const y = scaleY(plan.coverageScore);
        const selected = plan.id === selectedPlanId;

        return (
          <g
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className="pareto-point-group"
          >
            {/* Halo d'interaction */}
            <circle
              cx={x}
              cy={y}
              r={selected ? 3.5 : 2.8}
              className="pareto-halo"
              opacity={selected ? 0.2 : 0}
            />
            {/* Point principal */}
            <circle
              cx={x}
              cy={y}
              r={selected ? 2.2 : 1.8}
              className={selected ? "pareto-point selected" : "pareto-point"}
            />
            {/* Label du numéro de plan */}
            {selected && (
              <text
                x={x}
                y={y - 3.2}
                className="pareto-point-label"
                textAnchor="middle"
              >
                #{idx + 1}
              </text>
            )}
          </g>
        );
      })}

      {/* Légende */}
      <g className="pareto-legend">
        <rect x="2" y="2" width="18" height="10" rx="1" fill="white" opacity="0.9" />
        <circle cx="5" cy="6.5" r="1" className="pareto-point" />
        <text x="7" y="7" className="pareto-legend-text">
          Plans
        </text>
      </g>
    </svg>
  );
}
