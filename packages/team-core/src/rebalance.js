import { generateTeams } from "./generator.js";
const withLockAssignments = (baseResult, lockedPlayerIds) => {
    const lockSet = new Set(lockedPlayerIds);
    return baseResult.teams.flatMap((team) => team.members
        .filter((member) => lockSet.has(member.id))
        .map((member) => ({ participantId: member.id, teamId: team.id })));
};
export const rebalanceTeams = (request) => {
    const allParticipants = request.baseResult.teams.flatMap((team) => team.members);
    return generateTeams({
        participants: allParticipants,
        constraints: request.constraints,
        weights: request.weights,
        lockedAssignments: withLockAssignments(request.baseResult, request.lockedPlayerIds),
        seed: request.seed
    });
};
//# sourceMappingURL=rebalance.js.map