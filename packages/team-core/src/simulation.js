import { generateTeams } from "./generator.js";
export const runSimulation = (request) => {
    const candidates = [];
    for (let run = 1; run <= request.iterations; run += 1) {
        const result = generateTeams({
            participants: request.participants,
            constraints: request.constraints,
            weights: request.weights,
            seed: (request.seed ?? 20260608) + run
        });
        candidates.push({ run, result });
    }
    candidates.sort((a, b) => b.result.fairness.fairnessScore - a.result.fairness.fairnessScore);
    return {
        bestResult: candidates[0].result,
        candidateResults: candidates.map((entry) => ({
            run: entry.run,
            fairnessScore: entry.result.fairness.fairnessScore,
            averageDeviation: entry.result.fairness.averageDeviation,
            standardDeviation: entry.result.fairness.standardDeviation
        }))
    };
};
//# sourceMappingURL=simulation.js.map