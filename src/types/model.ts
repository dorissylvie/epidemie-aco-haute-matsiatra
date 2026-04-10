export type NodeId = "DEPOT" | string;

export type Center = {
    id: string;
    name: string;
    x: number;
    y: number;
    incidence7d: number;
    population: number;
    stockLevel: number;
    demandUnits: number;
};

export type Depot = {
    id: "DEPOT";
    name: string;
    x: number;
    y: number;
};

export type Weights = {
    incidence: number;
    population: number;
    stockDeficit: number;
};

export type MoacoParams = {
    ants: number;
    iterations: number;
    alpha: number;
    beta: number;
    evaporation: number;
    vehicleCapacity: number;
    maxMissionTime: number;
};

export type Plan = {
    id: string;
    route: NodeId[];
    centersVisited: string[];
    totalTime: number;
    coverageScore: number;
    servedPopulation: number;
    servedIncidence: number;
    stockUsed: number;
};

export type MoacoResult = {
    archive: Plan[];
    bestCost?: Plan;
    bestCoverage?: Plan;
    balanced?: Plan;
    travelTime: Record<string, Record<string, number>>;
};
