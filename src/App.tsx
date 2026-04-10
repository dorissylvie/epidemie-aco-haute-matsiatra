import { useEffect, useMemo, useState } from "react";
import { NetworkGraph } from "./components/NetworkGraph";
import { ParetoChart } from "./components/ParetoChart";
import { CENTERS, DEPOT } from "./data/demoData";
import { runMoaco } from "./lib/moaco";
import type { MoacoParams, Plan, Weights } from "./types/model";
import "./App.css";

const DEFAULT_WEIGHTS: Weights = {
  incidence: 50,
  population: 30,
  stockDeficit: 20,
};

const DEFAULT_PARAMS: MoacoParams = {
  ants: 24,
  iterations: 120,
  alpha: 1,
  beta: 2,
  evaporation: 0.2,
  vehicleCapacity: 900,
  maxMissionTime: 540,
};

function normalizeWeights(raw: Weights): Weights {
  const sum = raw.incidence + raw.population + raw.stockDeficit;
  if (sum <= 0) {
    return {
      incidence: 1 / 3,
      population: 1 / 3,
      stockDeficit: 1 / 3,
    };
  }

  return {
    incidence: raw.incidence / sum,
    population: raw.population / sum,
    stockDeficit: raw.stockDeficit / sum,
  };
}

function routeToText(route: string[]) {
  return route.join(" -> ");
}

function App() {
  const [weightsRaw, setWeightsRaw] = useState<Weights>(DEFAULT_WEIGHTS);
  const [params, setParams] = useState<MoacoParams>(DEFAULT_PARAMS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

  const weights = useMemo(() => normalizeWeights(weightsRaw), [weightsRaw]);

  const result = useMemo(
    () => runMoaco(CENTERS, DEPOT, weights, params),
    [weights, params],
  );

  const selectedPlan: Plan | undefined = useMemo(() => {
    if (result.archive.length === 0) return undefined;
    return (
      result.archive.find((plan) => plan.id === selectedPlanId) ??
      result.balanced ??
      result.archive[0]
    );
  }, [result, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlan && result.archive.length > 0) {
      setSelectedPlanId(result.archive[0].id);
    }
  }, [result.archive, selectedPlan]);

  const planByLabel = [
    { label: "Plan economique", plan: result.bestCost },
    { label: "Plan couvrance max", plan: result.bestCoverage },
    { label: "Plan equilibre", plan: result.balanced },
  ].filter((item): item is { label: string; plan: Plan } => Boolean(item.plan));

  const displayedPlans = useMemo(() => {
    const unique = new Map<string, Plan>();
    for (const plan of result.archive) {
      const key = `${plan.totalTime}-${plan.coverageScore}-${plan.centersVisited.length}`;
      if (!unique.has(key)) {
        unique.set(key, plan);
      }
    }
    return [...unique.values()].slice(0, 24);
  }, [result.archive]);

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Demo MOACO - Donnees fictives</p>
        <h1>Deploiement d&apos;unites mobiles en contexte epidemique</h1>
        <p>
          Cette demonstration utilise un ACO multi-objectif avec archive Pareto.
          Le systeme propose plusieurs plans de route selon le compromis cout
          logistique vs couvrance sanitaire.
        </p>
      </header>

      <section className="grid two-cols">
        <article className="panel">
          <h2>Poids des criteres sanitaires des centres</h2>
          <p>
            Ces poids alimentent le score d&apos;urgence utilise dans
            l&apos;heuristique ACO.
          </p>

          <div className="weights-list">
            <label className="weight-row">
              <span>Incidence (7 jours)</span>
              <input
                type="range"
                min={0}
                max={100}
                value={weightsRaw.incidence}
                onChange={(event) =>
                  setWeightsRaw((prev) => ({
                    ...prev,
                    incidence: Number(event.target.value),
                  }))
                }
              />
              <strong>{weightsRaw.incidence}</strong>
            </label>

            <label className="weight-row">
              <span>Population couverte</span>
              <input
                type="range"
                min={0}
                max={100}
                value={weightsRaw.population}
                onChange={(event) =>
                  setWeightsRaw((prev) => ({
                    ...prev,
                    population: Number(event.target.value),
                  }))
                }
              />
              <strong>{weightsRaw.population}</strong>
            </label>

            <label className="weight-row">
              <span>Deficit de stock</span>
              <input
                type="range"
                min={0}
                max={100}
                value={weightsRaw.stockDeficit}
                onChange={(event) =>
                  setWeightsRaw((prev) => ({
                    ...prev,
                    stockDeficit: Number(event.target.value),
                  }))
                }
              />
              <strong>{weightsRaw.stockDeficit}</strong>
            </label>
          </div>

          <div className="normalized-weights">
            <p>Poids normalises utilises par le moteur:</p>
            <ul>
              <li>Incidence: {(weights.incidence * 100).toFixed(1)}%</li>
              <li>Population: {(weights.population * 100).toFixed(1)}%</li>
              <li>Deficit stock: {(weights.stockDeficit * 100).toFixed(1)}%</li>
            </ul>
          </div>
        </article>

        <article className="panel">
          <h2>Parametres ACO</h2>
          <div className="constraints-grid">
            <label>
              Fourmis
              <input
                type="number"
                min={8}
                max={80}
                value={params.ants}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    ants: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              Iterations
              <input
                type="number"
                min={20}
                max={300}
                step={10}
                value={params.iterations}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    iterations: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              Capacite camion (unites)
              <input
                type="number"
                min={120}
                max={1200}
                step={10}
                value={params.vehicleCapacity}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    vehicleCapacity: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              Evaporation (rho)
              <input
                type="number"
                min={0.05}
                max={0.9}
                step={0.05}
                value={params.evaporation}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    evaporation: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label>
              Temps mission max (min)
              <input
                type="number"
                min={120}
                max={720}
                step={30}
                value={params.maxMissionTime}
                onChange={(event) =>
                  setParams((prev) => ({
                    ...prev,
                    maxMissionTime: Number(event.target.value),
                  }))
                }
              />
            </label>
          </div>
        </article>
      </section>

      <section className="grid two-cols">
        <article className="panel">
          <h2>Graphe reseau: routes et centres</h2>
          <NetworkGraph
            depot={DEPOT}
            centers={CENTERS}
            selectedPlan={selectedPlan}
          />
          <p className="hint">
            Ligne epaisse: route du plan selectionne. Couleur des centres: vert
            = stock correct, orange = moyen, rouge = stock critique.
          </p>
        </article>

        <article className="panel">
          <h2>Donnees fictives des centres</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Centre</th>
                  <th>Incidence</th>
                  <th>Population</th>
                  <th>Stock</th>
                  <th>Demande</th>
                </tr>
              </thead>
              <tbody>
                {CENTERS.map((center) => (
                  <tr key={center.id}>
                    <td>{center.id}</td>
                    <td>{center.incidence7d}</td>
                    <td>{center.population.toLocaleString("fr-FR")}</td>
                    <td>{Math.round(center.stockLevel * 100)}%</td>
                    <td>{center.demandUnits}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="grid two-cols">
        <article className="panel">
          <h2>Visualisation des resultats: front de Pareto</h2>
          <ParetoChart
            plans={result.archive}
            selectedPlanId={selectedPlan?.id}
            onSelect={setSelectedPlanId}
          />
          <p className="hint">
            Plus a gauche = moins de temps. Plus en haut = meilleure couvrance.
            Cliquer un point pour afficher sa route.
          </p>
        </article>

        <article className="panel">
          <h2>Plans recommandes</h2>
          <div className="scenario-grid">
            {planByLabel.map((entry) => (
              <button
                key={`${entry.label}-${entry.plan.id}`}
                className={
                  entry.plan.id === selectedPlan?.id
                    ? "scenario-card selected"
                    : "scenario-card"
                }
                onClick={() => setSelectedPlanId(entry.plan.id)}
              >
                <h3>{entry.label}</h3>
                <p>Temps total: {entry.plan.totalTime} min</p>
                <p>Couvrance: {entry.plan.coverageScore}%</p>
                <p>
                  Population servie:{" "}
                  {entry.plan.servedPopulation.toLocaleString("fr-FR")}
                </p>
                <p>Stock utilise: {entry.plan.stockUsed} unites</p>
              </button>
            ))}
          </div>

          <div className="plans-catalog-header">
            <h3>Catalogue des plans obtenus ({result.archive.length})</h3>
            <p>
              Plusieurs plans sont proposes par MOACO. Le decideur choisit
              ensuite le compromis le plus adapte.
            </p>
          </div>

          <div className="plans-catalog">
            {displayedPlans.map((plan, index) => (
              <button
                key={plan.id}
                className={
                  plan.id === selectedPlan?.id
                    ? "plan-row selected"
                    : "plan-row"
                }
                onClick={() => setSelectedPlanId(plan.id)}
              >
                <span className="rank">#{index + 1}</span>
                <span className="metric">
                  Temps: <strong>{plan.totalTime}</strong> min
                </span>
                <span className="metric">
                  Couvrance: <strong>{plan.coverageScore}</strong>%
                </span>
                <span className="metric">
                  Centres: <strong>{plan.centersVisited.length}</strong>
                </span>
              </button>
            ))}
          </div>

          {selectedPlan ? (
            <div className="selected-plan-box">
              <h3>Route du plan selectionne</h3>
              <p>{routeToText(selectedPlan.route)}</p>
              <p>
                Centres visites:{" "}
                {selectedPlan.centersVisited.join(", ") || "Aucun"}
              </p>
            </div>
          ) : null}
        </article>
      </section>
    </div>
  );
}

export default App;
