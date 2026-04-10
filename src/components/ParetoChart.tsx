import type { Plan } from "../types/model";

type Props = {
  plans: Plan[];
  selectedPlanId?: string;
  onSelect: (planId: string) => void;
};

const PADDING = 8;

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

  return (
    <svg
      viewBox="0 0 100 100"
      className="pareto-svg"
      role="img"
      aria-label="Front de Pareto"
    >
      <line
        x1={PADDING}
        y1={100 - PADDING}
        x2={100 - PADDING}
        y2={100 - PADDING}
        className="axis"
      />
      <line
        x1={PADDING}
        y1={PADDING}
        x2={PADDING}
        y2={100 - PADDING}
        className="axis"
      />
      <text x={42} y={98} className="axis-label">
        Temps total (min)
      </text>
      <text x={2} y={6} className="axis-label">
        Couvrance (%)
      </text>

      {plans.map((plan) => {
        const x = scaleX(plan.totalTime);
        const y = scaleY(plan.coverageScore);
        const selected = plan.id === selectedPlanId;

        return (
          <g
            key={plan.id}
            onClick={() => onSelect(plan.id)}
            className="pareto-point-group"
          >
            <circle
              cx={x}
              cy={y}
              r={selected ? 2.1 : 1.6}
              className={selected ? "pareto-point selected" : "pareto-point"}
            />
          </g>
        );
      })}
    </svg>
  );
}
