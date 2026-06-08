import type { FairnessMetrics, Gender, Team } from "@btm/shared";
import { average, normalizeToHundred, stdDeviation } from "./math.js";

const playerScore = (skillLike: { averageScore?: number; skillScore?: number }): number =>
  skillLike.averageScore ?? skillLike.skillScore ?? 0;

const baseGenderCounts = (): Record<Gender, number> => ({
  female: 0,
  male: 0,
  non_binary: 0,
  prefer_not_to_say: 0
});

const computeTeamAverageSkill = (team: Team): number => {
  if (team.members.length === 0) return 0;
  return average(team.members.map((member) => playerScore(member)));
};

export const calculateFairnessMetrics = (
  teams: Team[],
  enforceGenderBalance: boolean
): FairnessMetrics => {
  if (teams.length === 0) {
    return {
      averageDeviation: 0,
      standardDeviation: 0,
      highestLowestGap: 0,
      genderDistributionValid: true,
      fairnessScore: 0
    };
  }

  const teamAverages = teams.map(computeTeamAverageSkill);
  const globalAverage = average(teamAverages);
  const deviations = teamAverages.map((value) => Math.abs(value - globalAverage));

  const averageDeviation = average(deviations);
  const standardDeviation = stdDeviation(teamAverages);
  const highestLowestGap = Math.max(...teamAverages) - Math.min(...teamAverages);

  let genderDistributionValid = true;
  if (enforceGenderBalance) {
    const expectedByGender = teams.reduce((acc, team) => {
      for (const member of team.members) {
        acc[member.gender] += 1;
      }
      return acc;
    }, baseGenderCounts());

    const perTeamExpected: Record<Gender, number> = {
      female: expectedByGender.female / teams.length,
      male: expectedByGender.male / teams.length,
      non_binary: expectedByGender.non_binary / teams.length,
      prefer_not_to_say: expectedByGender.prefer_not_to_say / teams.length
    };

    genderDistributionValid = teams.every((team) => {
      const teamCounts = team.members.reduce((acc, member) => {
        acc[member.gender] += 1;
        return acc;
      }, baseGenderCounts());

      return (Object.keys(teamCounts) as Gender[]).every((gender) => {
        const delta = Math.abs(teamCounts[gender] - (perTeamExpected[gender] ?? 0));
        return delta <= 1;
      });
    });
  }

  // Score is a weighted inverse of balance penalties.
  const combinedPenalty =
    averageDeviation * 0.4 + standardDeviation * 0.3 + highestLowestGap * 0.3;
  const fairnessScore = normalizeToHundred(combinedPenalty, 50);

  return {
    averageDeviation: Number(averageDeviation.toFixed(3)),
    standardDeviation: Number(standardDeviation.toFixed(3)),
    highestLowestGap: Number(highestLowestGap.toFixed(3)),
    genderDistributionValid,
    fairnessScore
  };
};
