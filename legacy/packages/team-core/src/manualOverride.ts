import type {
  ManualOverrideRequest,
  Team,
  TeamGenerationResult
} from "@btm/shared";
import { calculateFairnessMetrics } from "./fairness.js";
import { DomainError } from "./errors.js";

const participantScore = (participant: { averageScore?: number; skillScore?: number }): number =>
  participant.averageScore ?? participant.skillScore ?? 0;

const cloneTeams = (teams: Team[]): Team[] =>
  teams.map((team) => ({ ...team, members: [...team.members] }));

const findTeamOrThrow = (teams: Team[], teamId: string): Team => {
  const team = teams.find((candidate) => candidate.id === teamId);
  if (!team) throw new DomainError(`Team ${teamId} not found`);
  return team;
};

export const applyManualOverride = (
  request: ManualOverrideRequest,
  enforceGenderBalance: boolean
): TeamGenerationResult => {
  const teams = cloneTeams(request.baseResult.teams);

  for (const operation of request.operations) {
    const fromTeam = findTeamOrThrow(teams, operation.fromTeamId);
    const toTeam = findTeamOrThrow(teams, operation.toTeamId);

    const sourceIndex = fromTeam.members.findIndex(
      (member) => member.id === operation.participantId
    );
    if (sourceIndex === -1) {
      throw new DomainError(
        `Participant ${operation.participantId} not found in ${fromTeam.id}`
      );
    }

    if (operation.type === "move") {
      const [moved] = fromTeam.members.splice(sourceIndex, 1);
      if (!moved) {
        throw new DomainError("Invalid move operation payload");
      }
      toTeam.members.push(moved);
      continue;
    }

    if (!operation.swapWithParticipantId) {
      throw new DomainError("swapWithParticipantId must be provided for swaps");
    }

    const targetIndex = toTeam.members.findIndex(
      (member) => member.id === operation.swapWithParticipantId
    );
    if (targetIndex === -1) {
      throw new DomainError(
        `Participant ${operation.swapWithParticipantId} not found in ${toTeam.id}`
      );
    }

    const sourceMember = fromTeam.members[sourceIndex];
    const targetMember = toTeam.members[targetIndex];
    if (!sourceMember || !targetMember) {
      throw new DomainError("Invalid swap operation payload");
    }
    fromTeam.members[sourceIndex] = targetMember;
    toTeam.members[targetIndex] = sourceMember;
  }

  const analytics = request.baseResult.analytics.map((teamAnalytics) => {
    const team = teams.find((candidate) => candidate.id === teamAnalytics.teamId);
    if (!team) return teamAnalytics;

    const totalScore = team.members.reduce((acc, member) => acc + participantScore(member), 0);
    const averageScore = totalScore / Math.max(1, team.members.length);

    const divisions = team.members.reduce<Record<string, number>>((acc, member) => {
      const key = member.division ?? "unassigned";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const genderCounts = team.members.reduce<Record<"female" | "male" | "non_binary" | "prefer_not_to_say", number>>((acc, member) => {
      acc[member.gender] += 1;
      return acc;
    }, { female: 0, male: 0, non_binary: 0, prefer_not_to_say: 0 });

    return {
      ...teamAnalytics,
      averageScore: Number(averageScore.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2)),
      genderCounts,
      divisions
    };
  });

  const fairness = calculateFairnessMetrics(teams, enforceGenderBalance);

  return {
    teams,
    analytics,
    fairness,
    warnings: [...request.baseResult.warnings, "Manual override applied"]
  };
};
