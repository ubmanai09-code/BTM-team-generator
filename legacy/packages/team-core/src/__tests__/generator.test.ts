import { describe, expect, it } from "vitest";
import type { TeamGenerationRequest } from "@btm/shared";
import { generateTeams } from "../generator.js";
import { runSimulation } from "../simulation.js";

const sampleRequest: TeamGenerationRequest = {
  participants: [
    { id: "p1", displayName: "A", skillScore: 90, experienceMonths: 48, preferredRoles: ["frontend"], gender: "female", tags: [], isAvailable: true },
    { id: "p2", displayName: "B", skillScore: 85, experienceMonths: 36, preferredRoles: ["backend"], gender: "male", tags: [], isAvailable: true },
    { id: "p3", displayName: "C", skillScore: 80, experienceMonths: 24, preferredRoles: ["qa"], gender: "female", tags: [], isAvailable: true },
    { id: "p4", displayName: "D", skillScore: 75, experienceMonths: 18, preferredRoles: ["backend"], gender: "male", tags: [], isAvailable: true },
    { id: "p5", displayName: "E", skillScore: 72, experienceMonths: 20, preferredRoles: ["frontend"], gender: "non_binary", tags: [], isAvailable: true },
    { id: "p6", displayName: "F", skillScore: 68, experienceMonths: 15, preferredRoles: ["qa"], gender: "female", tags: [], isAvailable: true }
  ],
  constraints: {
    teamCount: 2,
    maxTeamSizeVariance: 1,
    enforceGenderBalance: true
  },
  weights: {
    skillWeight: 0.5,
    experienceWeight: 0.2,
    roleDiversityWeight: 0.2,
    genderBalanceWeight: 0.1
  },
  seed: 12
};

describe("generateTeams", () => {
  it("creates requested number of teams", () => {
    const result = generateTeams(sampleRequest);
    expect(result.teams).toHaveLength(2);
    expect(result.teams[0].members.length + result.teams[1].members.length).toBe(6);
  });

  it("returns fairness metrics", () => {
    const result = generateTeams(sampleRequest);
    expect(result.fairness.fairnessScore).toBeGreaterThanOrEqual(0);
    expect(result.fairness.fairnessScore).toBeLessThanOrEqual(100);
  });

  it("improves best candidate via simulation", () => {
    const simulation = runSimulation({ ...sampleRequest, iterations: 10 });
    expect(simulation.bestResult.fairness.fairnessScore).toBeGreaterThanOrEqual(
      simulation.candidateResults[simulation.candidateResults.length - 1].fairnessScore
    );
  });
});
