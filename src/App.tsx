import { useEffect, useMemo, useState } from "react";
import { NetworkGraph } from "./components/NetworkGraph";
import { ParetoChart } from "./components/ParetoChart";
import { CENTERS, DEPOT } from "./data/demoData";
import { runMoaco } from "./lib/moaco";
import type { MoacoParams, Plan } from "./types/model";
import "./App.css";

const DEFAULT_PARAMS: MoacoParams = {
  ants: 24,
  iterations: 120,
  alpha: 1,
  beta: 2,
  evaporation: 0.2,
  vehicleCapacity: 900,
  maxMissionTime: 540,
};

function routeToText(route: string[]) {
  return route.join(" -> ");
}

function App() {
  const [params, setParams] = useState<MoacoParams>(DEFAULT_PARAMS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();

  const result = useMemo(() => runMoaco(CENTERS, DEPOT, params), [params]);

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
          Cette demonstration applique un MOACO a front de Pareto: aucune
          priorite fixe cout/sante n&apos;est imposee. Les fourmis explorent des
          profils differents et le decideur choisit ensuite le compromis.
        </p>
      </header>

      <section className="grid">
        <article className="panel">
          <h2>1) Affichage des donnees</h2>
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

      <section className="grid">
        <article className="panel">
          <h2>Contexte MOACO</h2>
          <p>
            Le moteur utilise trois profils de fourmis sans fusionner les
            objectifs en un score unique: rapides (temps), sanitaires
            (couvrance) et exploratrices (mixte).
          </p>
          <div className="normalized-weights">
            <p>Principe MOACO utilise:</p>
            <ul>
              <li>Deux objectifs conserves separement: temps et couvrance</li>
              <li>Deux traces de pheromones: logistique et sanitaire</li>
              <li>Selection finale par non-dominance (archive Pareto)</li>
            </ul>
          </div>
        </article>
      </section>

      <section className="grid">
        <article className="panel">
          <h2>2) Parametres ACO</h2>
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

      <section className="grid">
        <article className="panel">
          <h2>Lecture rapide des parametres</h2>
          <p>
            Augmenter capacite/temps augmente en general la couvrance. Augmenter
            fourmis/iterations renforce la qualite de l&apos;exploration.
          </p>
          <p className="hint">
            Objectifs optimises par MOACO: minimiser le temps total et maximiser
            la couvrance sanitaire.
          </p>
        </article>
      </section>

      <section className="grid">
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
      <section className="grid">
        <article className="panel">
          <h2>3) Resultats et graphes</h2>
          <NetworkGraph
            depot={DEPOT}
            centers={CENTERS}
            selectedPlan={selectedPlan}
          />
          <p className="hint">
            Ligne epaisse: route du plan selectionne. Couleur des centres: vert
            = stock correct, orange = moyen, rouge = stock critique.
          </p>

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
      </section>
    </div>
  );
}

export default App;
