import type { Participant, RebalanceRequest, TeamGenerationResult } from "@btm/shared";
import { generateTeams } from "./generator.js";

const withLockAssignments = (
  baseResult: RebalanceRequest["baseResult"],
  lockedPlayerIds: string[]
): Array<{ participantId: string; teamId: string }> => {
  const lockSet = new Set(lockedPlayerIds);
  return baseResult.teams.flatMap((team) =>
    team.members
      .filter((member) => lockSet.has(member.id))
      .map((member) => ({ participantId: member.id, teamId: team.id }))
  );
};

export const rebalanceTeams = (request: RebalanceRequest): TeamGenerationResult => {
  const allParticipants: Participant[] = request.baseResult.teams.flatMap((team) => team.members);
  const payload = {
    participants: allParticipants,
    constraints: request.constraints,
    weights: request.weights,
    lockedAssignments: withLockAssignments(request.baseResult, request.lockedPlayerIds)
  };

  if (request.seed !== undefined) {
    return generateTeams({ ...payload, seed: request.seed });
  }

  return generateTeams(payload);
};
