import { useEffect, useMemo, useRef, useState } from "react";
import { NetworkGraph } from "./components/NetworkGraph";
import { ParetoChart } from "./components/ParetoChart";
import { DEPOT } from "./data/demoData";
import { runMoaco } from "./lib/moaco";
import type { Center, MoacoParams, MoacoResult, Plan } from "./types/model";
import "./App.css";
import Hero from "./components/Hero";
import Header from "./components/Header";
import { MoveRight } from "lucide-react";
import Papa from "papaparse";
import { NetworkGraphInitial } from "./components/NetworkGraphInitial";

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

function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;

  if (semicolonCount > commaCount) return ";";
  if (commaCount > 0) return ",";
  return ",";
}

function App() {
  const [params, setParams] = useState<MoacoParams>(DEFAULT_PARAMS);
  const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>();
  const [centersWithAllCol, setWithAllCol] = useState<Center[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const hasData = centers.length > 0;

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setImportProgress(0);
      setImportSuccess(false);
      setImportError(null);

      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        const delimiter = detectDelimiter(text);

        const toNumber = (value: unknown): number => {
          if (typeof value === "number" && !isNaN(value)) return value;
          const normalized = String(value ?? "")
            .trim()
            .replace(/\s/g, "") // espaces insécables
            .replace(",", "."); // virgule décimale → point
          return Number(normalized);
        };

        Papa.parse(text, {
          header: true,
          dynamicTyping: false,
          skipEmptyLines: true,
          delimiter,
          transformHeader: (header) => header.replace(/^\uFEFF/, "").trim(),
          // ← step supprimé complètement
          complete: (result) => {
            setImportProgress(100); // progress directement à 100 à la fin

            const raw = result.data as Record<string, unknown>[];
            console.log("Lignes brutes reçues :", raw.slice(0, 3)); // debug

            const parsedData = raw
              .map((row) => {
                const id = String(row.id ?? "").trim();
                const name = String(row.name ?? "").trim();

                return {
                  id,
                  name: name.length > 0 ? name : id,
                  x: toNumber(row.x),
                  y: toNumber(row.y),
                  incidence7d: toNumber(row.incidence7d),
                  population: toNumber(row.population),
                  stockLevel: toNumber(row.stockLevel),
                  demandUnits: toNumber(row.demandUnits),
                };
              })
              .filter(
                (row) =>
                  row.id.length > 0 &&
                  Number.isFinite(row.x) &&
                  Number.isFinite(row.y) &&
                  Number.isFinite(row.incidence7d) &&
                  Number.isFinite(row.population) &&
                  Number.isFinite(row.stockLevel) &&
                  Number.isFinite(row.demandUnits),
              ) as Center[];

            setCenters(parsedData);
            setSelectedPlanId(undefined);
            setIsLoading(false);

            if (parsedData.length === 0) {
              setImportSuccess(false);
              setImportError(
                "Aucune ligne valide. Vérifiez les entêtes et le séparateur CSV.",
              );
              return;
            }

            setImportSuccess(true);
            setTimeout(() => setImportSuccess(false), 3000);
          },
          error: (error: unknown) => {
            console.error("Error parsing CSV:", error);
            setIsLoading(false);
            setImportError("Erreur lors de l'importation du fichier CSV.");
          },
        });
      };

      reader.onerror = () => {
        setIsLoading(false);
        setImportError("Impossible de lire le fichier CSV.");
      };

      reader.readAsText(file, "utf-8");
    }
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const result: MoacoResult = useMemo(() => {
    if (!hasData) {
      return { archive: [], travelTime: {} };
    }

    return runMoaco(centers, DEPOT, params);
  }, [centers, params, hasData]);

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
    <div className="w-full">
      <Header></Header>
      <div className="app-shell px-20">
        <Hero></Hero>
        <div className=" w-full flex items-center justify-center pb-12 gap-4">
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileImport}
            accept=".csv"
          />
          <button
            className="py-3 px-5 h-12 bg-teal-800 rounded-2xl text-white font-semibold shadow-md hover:bg-teal-700 transition-colors flex justify-between items-center gap-2 cursor-pointer "
            onClick={triggerFileSelect}
          >
            Importer les données
            <MoveRight />
          </button>
          <button
            className="py-2 px-4 h-12 bg-gray-200 rounded-2xl text-gray-700 font-semibold shadow-xs hover:bg-gray-200/50 transition-colors cursor-pointer "
            onClick={() => {
              setCenters([]);
              setImportSuccess(false);
              setImportError(null);
              setSelectedPlanId(undefined);
            }}
          >
            Effacer
          </button>
        </div>

        {importSuccess && (
          <div className="text-green-500 text-center py-2">
            Importation effectuée avec succès !
          </div>
        )}

        {importError && (
          <div className="text-red-500 text-center py-2">{importError}</div>
        )}

        {!hasData && !isLoading && (
          <section className="grid">
            <article className="panel">
              <div className="text-gray-500 text-center py-2">
                Aucune donnée importée.
              </div>
            </article>
          </section>
        )}

        {hasData && (
          <>
            <section className="grid">
              <article className="panel">
                <h2 className="w-full text-center text-2xl font-bold text-gray-800 pb-4 uppercase border-b-2 border-teal-600/50 ">
                  {" "}
                  Affichage des donnees
                </h2>
                <div className="table-wrap mb-10">
                  <table>
                    <thead>
                      <tr>
                        <th>Centre</th>
                        <th>Nom</th>
                        <th>Incidence</th>
                        <th>Population</th>
                        <th>Stock</th>
                        <th>Demande</th>
                      </tr>
                    </thead>
                    <tbody>
                      {centers.map((center) => (
                        <tr key={center.id}>
                          <td>{center.id}</td>
                          <td>{center.name}</td>
                          <td>{center.incidence7d}</td>
                          <td>{center.population.toLocaleString("fr-FR")}</td>
                          <td>{Math.round(center.stockLevel * 100)}%</td>
                          <td>{center.demandUnits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <NetworkGraphInitial
                  depot={DEPOT}
                  centers={centers}
                  selectedPlan={selectedPlan}
                />
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
                    <li>
                      Deux objectifs conserves separement: temps et couvrance
                    </li>
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
                  Augmenter capacite/temps augmente en general la couvrance.
                  Augmenter fourmis/iterations renforce la qualite de
                  l&apos;exploration.
                </p>
                <p className="hint">
                  Objectifs optimises par MOACO: minimiser le temps total et
                  maximiser la couvrance sanitaire.
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
                  centers={centers}
                  selectedPlan={selectedPlan}
                />
                <p className="hint">
                  Ligne epaisse: route du plan selectionne. Couleur des centres:
                  vert = stock correct, orange = moyen, rouge = stock critique.
                </p>

                <ParetoChart
                  plans={result.archive}
                  selectedPlanId={selectedPlan?.id}
                  onSelect={setSelectedPlanId}
                />
                <p className="hint">
                  Plus a gauche = moins de temps. Plus en haut = meilleure
                  couvrance. Cliquer un point pour afficher sa route.
                </p>
              </article>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
