import type {
    Center,
    Depot,
    MoacoParams,
    MoacoResult,
    NodeId,
    Plan,
} from "../types/model";

type NormCenter = Center & {
    nIncidence: number;
    nPopulation: number;
    nStockDeficit: number;
    sanitaryPriority: number;
};

type AntProfile = "rapid" | "sanitary" | "explorer";

const EPS = 1e-6;
function normalize(value: number, min: number, max: number) {
    return (value - min) / (max - min + EPS);
}

function randomPickByWeight<T>(items: T[], getWeight: (item: T) => number): T {
    const total = items.reduce((acc, item) => acc + getWeight(item), 0);
    if (total <= 0) return items[Math.floor(Math.random() * items.length)];

    let r = Math.random() * total;
    for (const item of items) {
        r -= getWeight(item);
        if (r <= 0) return item;
    }
    return items[items.length - 1];
}

function nodeList(depot: Depot, centers: Center[]) {
    return [{ id: depot.id, x: depot.x, y: depot.y }, ...centers];
}

function buildTravelTime(depot: Depot, centers: Center[]) {
    const nodes = nodeList(depot, centers);
    const table: Record<string, Record<string, number>> = {};

    for (const a of nodes) {
        table[a.id] = {};
        for (const b of nodes) {
            if (a.id === b.id) {
                table[a.id][b.id] = 0;
                continue;
            }
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const euclid = Math.sqrt(dx * dx + dy * dy);
            const terrainFactor = 1 + ((Math.abs(a.x - b.y) % 8) / 40);
            table[a.id][b.id] = Math.round((euclid * terrainFactor + 8) * 10) / 10;
        }
    }

    return table;
}

function createNormCenters(centers: Center[]): NormCenter[] {
    const incMin = Math.min(...centers.map((c) => c.incidence7d));
    const incMax = Math.max(...centers.map((c) => c.incidence7d));
    const popMin = Math.min(...centers.map((c) => c.population));
    const popMax = Math.max(...centers.map((c) => c.population));

    return centers.map((center) => {
        const nIncidence = normalize(center.incidence7d, incMin, incMax);
        const nPopulation = normalize(center.population, popMin, popMax);
        const nStockDeficit = 1 - center.stockLevel;

        const sanitaryPriority = (nIncidence + nPopulation + nStockDeficit) / 3;

        return {
            ...center,
            nIncidence,
            nPopulation,
            nStockDeficit,
            sanitaryPriority,
        };
    });
}

function getAntProfile(index: number): AntProfile {
    const mod = index % 3;
    if (mod === 0) return "rapid";
    if (mod === 1) return "sanitary";
    return "explorer";
}

function dominates(a: Plan, b: Plan) {
    const betterOrEqual =
        a.totalTime <= b.totalTime && a.coverageScore >= b.coverageScore;
    const strictlyBetter =
        a.totalTime < b.totalTime || a.coverageScore > b.coverageScore;
    return betterOrEqual && strictlyBetter;
}

function updateArchive(existing: Plan[], candidates: Plan[]) {
    const merged = [...existing, ...candidates];
    const nondominated = merged.filter((candidate, idx) => {
        return !merged.some((other, j) => j !== idx && dominates(other, candidate));
    });

    const uniqueByRoute = new Map<string, Plan>();
    for (const plan of nondominated) {
        const key = plan.route.join("->");
        const current = uniqueByRoute.get(key);
        if (!current || plan.coverageScore > current.coverageScore) {
            uniqueByRoute.set(key, plan);
        }
    }

    return [...uniqueByRoute.values()];
}

function selectBalancedPlan(archive: Plan[]) {
    if (archive.length === 0) return undefined;

    const tMin = Math.min(...archive.map((p) => p.totalTime));
    const tMax = Math.max(...archive.map((p) => p.totalTime));
    const cMin = Math.min(...archive.map((p) => p.coverageScore));
    const cMax = Math.max(...archive.map((p) => p.coverageScore));

    let best = archive[0];
    let bestDist = Number.POSITIVE_INFINITY;

    for (const p of archive) {
        const nt = normalize(p.totalTime, tMin, tMax);
        const nc = normalize(p.coverageScore, cMin, cMax);
        const d = Math.sqrt((nt - 0.5) ** 2 + (nc - 0.5) ** 2);
        if (d < bestDist) {
            bestDist = d;
            best = p;
        }
    }

    return best;
}

export function runMoaco(
    centers: Center[],
    depot: Depot,
    params: MoacoParams,
): MoacoResult {
    const travelTime = buildTravelTime(depot, centers);
    const normCenters = createNormCenters(centers);
    const centerById = new Map(normCenters.map((c) => [c.id, c]));

    const nodeIds: NodeId[] = [depot.id, ...normCenters.map((c) => c.id)];
    const pheromoneTime: Record<string, Record<string, number>> = {};
    const pheromoneHealth: Record<string, Record<string, number>> = {};

    for (const from of nodeIds) {
        pheromoneTime[from] = {};
        pheromoneHealth[from] = {};
        for (const to of nodeIds) {
            const init = from === to ? 0 : 0.4;
            pheromoneTime[from][to] = init;
            pheromoneHealth[from][to] = init;
        }
    }

    const totalPop = normCenters.reduce((acc, c) => acc + c.population, 0);
    const totalInc = normCenters.reduce((acc, c) => acc + c.incidence7d, 0);

    let archive: Plan[] = [];

    for (let iteration = 0; iteration < params.iterations; iteration += 1) {
        const iterationPlans: Plan[] = [];

        for (let ant = 0; ant < params.ants; ant += 1) {
            const profile = getAntProfile(ant);
            const explorerBlend = 0.35 + Math.random() * 0.3;
            const remaining = new Set(normCenters.map((c) => c.id));
            const route: NodeId[] = [depot.id];
            const centersVisited: string[] = [];
            let current: NodeId = depot.id;
            let stockLeft = params.vehicleCapacity;
            let totalTime = 0;
            let servedPopulation = 0;
            let servedIncidence = 0;
            let stockUsed = 0;

            while (remaining.size > 0) {
                const feasible = [...remaining]
                    .map((id) => centerById.get(id))
                    .filter(
                        (center): center is NormCenter =>
                            center !== undefined &&
                            center.demandUnits <= stockLeft &&
                            totalTime +
                            travelTime[current][center.id] +
                            travelTime[center.id][depot.id] <=
                            params.maxMissionTime,
                    );

                if (feasible.length === 0) {
                    break;
                }

                const chosen = randomPickByWeight(feasible, (candidate) => {
                    const moveCost = travelTime[current][candidate.id] + EPS;
                    const etaTime = (1 / moveCost) ** params.beta;
                    const etaHealth = (candidate.sanitaryPriority / moveCost) ** params.beta;
                    const tauTime = pheromoneTime[current][candidate.id] ** params.alpha;
                    const tauHealth =
                        pheromoneHealth[current][candidate.id] ** params.alpha;

                    if (profile === "rapid") {
                        return tauTime * etaTime;
                    }

                    if (profile === "sanitary") {
                        return tauHealth * etaHealth;
                    }

                    const logisticPart = tauTime * etaTime;
                    const healthPart = tauHealth * etaHealth;
                    return explorerBlend * logisticPart + (1 - explorerBlend) * healthPart;
                });

                totalTime += travelTime[current][chosen.id];
                route.push(chosen.id);
                current = chosen.id;
                remaining.delete(chosen.id);
                centersVisited.push(chosen.id);
                stockLeft -= chosen.demandUnits;
                stockUsed += chosen.demandUnits;
                servedPopulation += chosen.population;
                servedIncidence += chosen.incidence7d;
            }

            if (current !== depot.id) {
                totalTime += travelTime[current][depot.id];
                route.push(depot.id);
            }

            const visitedRatio = centersVisited.length / normCenters.length;
            const popRatio = servedPopulation / (totalPop + EPS);
            const incRatio = servedIncidence / (totalInc + EPS);
            const coverageScore = Math.round(
                (0.45 * incRatio + 0.35 * popRatio + 0.2 * visitedRatio) * 1000,
            ) / 10;

            iterationPlans.push({
                id: `it${iteration + 1}-ant${ant + 1}`,
                route,
                centersVisited,
                totalTime: Math.round(totalTime * 10) / 10,
                coverageScore,
                servedPopulation,
                servedIncidence,
                stockUsed,
            });
        }

        archive = updateArchive(archive, iterationPlans);

        for (const from of nodeIds) {
            for (const to of nodeIds) {
                pheromoneTime[from][to] *= 1 - params.evaporation;
                pheromoneHealth[from][to] *= 1 - params.evaporation;
            }
        }

        const topForDeposit = [...archive].slice(0, 18);

        if (topForDeposit.length === 0) {
            continue;
        }

        const minTime = Math.min(...topForDeposit.map((p) => p.totalTime));
        const maxTime = Math.max(...topForDeposit.map((p) => p.totalTime));
        const minCov = Math.min(...topForDeposit.map((p) => p.coverageScore));
        const maxCov = Math.max(...topForDeposit.map((p) => p.coverageScore));

        for (const plan of topForDeposit) {
            const normTime = normalize(plan.totalTime, minTime, maxTime);
            const normCov = normalize(plan.coverageScore, minCov, maxCov);
            const qualityTime = 1 - normTime;
            const qualityHealth = normCov;
            const depositTime = 0.04 + 0.18 * qualityTime;
            const depositHealth = 0.04 + 0.18 * qualityHealth;

            for (let i = 0; i < plan.route.length - 1; i += 1) {
                const from = plan.route[i];
                const to = plan.route[i + 1];
                pheromoneTime[from][to] += depositTime;
                pheromoneHealth[from][to] += depositHealth;
            }
        }
    }

    const sortedArchive = [...archive].sort((a, b) => {
        if (a.totalTime !== b.totalTime) return a.totalTime - b.totalTime;
        return b.coverageScore - a.coverageScore;
    });

    return {
        archive: sortedArchive,
        bestCost: [...sortedArchive].sort((a, b) => a.totalTime - b.totalTime)[0],
        bestCoverage: [...sortedArchive].sort(
            (a, b) => b.coverageScore - a.coverageScore,
        )[0],
        balanced: selectBalancedPlan(sortedArchive),
        travelTime,
    };
}
