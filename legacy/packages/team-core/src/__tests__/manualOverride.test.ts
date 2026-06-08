import { describe, expect, it } from "vitest";
import { generateTeams } from "../generator.js";
import { applyManualOverride } from "../manualOverride.js";

describe("applyManualOverride", () => {
  it("moves a participant and recalculates fairness", () => {
    const base = generateTeams({
      participants: [
        { id: "a", displayName: "A", skillScore: 95, experienceMonths: 42, preferredRoles: ["frontend"], gender: "female", tags: [], isAvailable: true },
        { id: "b", displayName: "B", skillScore: 88, experienceMonths: 35, preferredRoles: ["backend"], gender: "male", tags: [], isAvailable: true },
        { id: "c", displayName: "C", skillScore: 70, experienceMonths: 18, preferredRoles: ["qa"], gender: "female", tags: [], isAvailable: true },
        { id: "d", displayName: "D", skillScore: 60, experienceMonths: 16, preferredRoles: ["backend"], gender: "male", tags: [], isAvailable: true }
      ],
      constraints: { teamCount: 2, maxTeamSizeVariance: 1, enforceGenderBalance: false },
      weights: { skillWeight: 0.6, experienceWeight: 0.2, roleDiversityWeight: 0.1, genderBalanceWeight: 0.1 },
      seed: 1
    });

    const updated = applyManualOverride(
      {
        baseResult: base,
        operations: [
          {
            type: "move",
            fromTeamId: base.teams[0].id,
            participantId: base.teams[0].members[0].id,
            toTeamId: base.teams[1].id
          }
        ]
      },
      false
    );

    expect(updated.teams[0].members.length + updated.teams[1].members.length).toBe(4);
    expect(updated.warnings).toContain("Manual override applied");
  });
});
