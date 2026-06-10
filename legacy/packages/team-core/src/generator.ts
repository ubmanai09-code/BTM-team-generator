import type {
  GenerationConstraints,
  GenerationWeights,
  Participant,
  Team,
  TeamAnalytics,
  TeamGenerationRequest,
  TeamGenerationResult
} from "@btm/shared";
import { calculateFairnessMetrics } from "./fairness.js";
import { DomainError } from "./errors.js";

type InternalParticipant = Participant & {
  name: string;
  averageScore: number;
  isAvailable: boolean;
  isLocked: boolean;
};

const emptyGenderMap = (): Record<"female" | "male" | "non_binary" | "prefer_not_to_say", number> => ({
  female: 0,
  male: 0,
  non_binary: 0,
  prefer_not_to_say: 0
});

const seededRandom = (seed: number): (() => number) => {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
};

const normalizeParticipant = (participant: Participant): InternalParticipant => ({
  ...participant,
  name: participant.name ?? participant.displayName ?? participant.id,
  averageScore: participant.averageScore ?? participant.skillScore ?? 0,
  isAvailable: participant.isAvailable ?? true,
  isLocked: participant.isLocked ?? false
});

const participantScore = (participant: InternalParticipant, weights: GenerationWeights): number => {
  const handicapNormalization = Math.max(-1, Math.min(1, (participant.handicap ?? 0) / 50));
  const historyNormalization = Math.min(1, (participant.previousTournamentsHistory?.length ?? 0) / 20);
  const divisionNormalization = participant.division ? 1 : 0;
  return (
    participant.averageScore * weights.skillWeight +
    (100 - (participant.handicap ?? 0) * 2) * weights.experienceWeight +
    (historyNormalization * 70 + divisionNormalization * 30) * weights.roleDiversityWeight +
    (participant.gender === "female" ? 100 : 0) * weights.genderBalanceWeight +
    handicapNormalization
  );
};

const teamTotal = (team: Team): number =>
  team.members.reduce((sum, member) => sum + (member.averageScore ?? member.skillScore ?? 0), 0);

const femaleCountInTeam = (team: Team): number =>
  team.members.filter((member) => member.gender === "female").length;

const isSlotAvailable = (team: Team, teamSize: number): boolean => team.members.length < teamSize;

const makeSnakeOrder = (teamCount: number): number[] => {
  if (teamCount <= 0) return [];
  const order: number[] = [];
  let index = 0;
  let direction: 1 | -1 = 1;
  for (let pick = 0; pick < teamCount; pick += 1) {
    order.push(index);
    if (index === teamCount - 1) direction = -1;
    if (index === 0) direction = 1;
    index += direction;
    if (index < 0) index = 0;
    if (index > teamCount - 1) index = teamCount - 1;
  }
  return order;
};

const buildAnalytics = (teams: Team[]): TeamAnalytics[] => {
  return teams.map((team) => {
    const divisions: Record<string, number> = {};
    const genderCounts = team.members.reduce((acc, member) => {
      acc[member.gender] += 1;
      const divisionKey = member.division ?? "unassigned";
      divisions[divisionKey] = (divisions[divisionKey] ?? 0) + 1;
      return acc;
    }, emptyGenderMap());

    const totalScore = teamTotal(team);
    const averageScore = totalScore / Math.max(1, team.members.length);

    return {
      teamId: team.id,
      averageScore: Number(averageScore.toFixed(2)),
      totalScore: Number(totalScore.toFixed(2)),
      genderCounts,
      divisions
    };
  });
};

const femaleRuleSatisfied = (teams: Team[], femalePerTeam: number): boolean =>
  teams.every((team) => femaleCountInTeam(team) >= femalePerTeam);

const standardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const teamTotals = (teams: Team[]): number[] => teams.map((team) => teamTotal(team));

const optimizationSwap = (
  teams: Team[],
  constraints: GenerationConstraints,
  lockedParticipantIds: Set<string>
): void => {
  const femalePerTeam = Math.max(1, constraints.femalePerTeam ?? 1);
  for (let i = 0; i < constraints.optimizationIterations; i += 1) {
    const currentTotals = teamTotals(teams);
    if (currentTotals.length < 2) return;
    const currentSpread = Math.max(...currentTotals) - Math.min(...currentTotals);
    const currentDeviation = standardDeviation(currentTotals);

    let best:
      | {
          teamAIdx: number;
          memberAIdx: number;
          teamBIdx: number;
          memberBIdx: number;
          nextSpread: number;
          nextDeviation: number;
        }
      | null = null;

    for (let teamAIdx = 0; teamAIdx < teams.length; teamAIdx += 1) {
      for (let teamBIdx = teamAIdx + 1; teamBIdx < teams.length; teamBIdx += 1) {
        const teamA = teams[teamAIdx];
        const teamB = teams[teamBIdx];
        if (!teamA || !teamB) continue;

        for (let memberAIdx = 0; memberAIdx < teamA.members.length; memberAIdx += 1) {
          for (let memberBIdx = 0; memberBIdx < teamB.members.length; memberBIdx += 1) {
            const memberA = teamA.members[memberAIdx];
            const memberB = teamB.members[memberBIdx];
            if (!memberA || !memberB) continue;
            if (lockedParticipantIds.has(memberA.id) || lockedParticipantIds.has(memberB.id)) continue;

            teamA.members[memberAIdx] = memberB;
            teamB.members[memberBIdx] = memberA;

            const femaleValid = !constraints.enforceFemalePerTeam || femaleRuleSatisfied(teams, femalePerTeam);

            const nextTotals = teamTotals(teams);
            const nextSpread = Math.max(...nextTotals) - Math.min(...nextTotals);
            const nextDeviation = standardDeviation(nextTotals);

            teamA.members[memberAIdx] = memberA;
            teamB.members[memberBIdx] = memberB;

            if (!femaleValid) continue;

            if (
              !best ||
              nextDeviation < best.nextDeviation ||
              (Math.abs(nextDeviation - best.nextDeviation) < 0.0001 && nextSpread < best.nextSpread)
            ) {
              best = {
                teamAIdx,
                memberAIdx,
                teamBIdx,
                memberBIdx,
                nextSpread,
                nextDeviation
              };
            }
          }
        }
      }
    }

    if (
      !best ||
      (best.nextDeviation >= currentDeviation - 0.0001 && best.nextSpread >= currentSpread)
    ) {
      break;
    }

    const teamA = teams[best.teamAIdx];
    const teamB = teams[best.teamBIdx];
    if (!teamA || !teamB) break;

    const memberA = teamA.members[best.memberAIdx];
    const memberB = teamB.members[best.memberBIdx];
    if (!memberA || !memberB) break;

    teamA.members[best.memberAIdx] = memberB;
    teamB.members[best.memberBIdx] = memberA;

    if (best.nextDeviation <= 2 && best.nextSpread <= constraints.maxAllowedScoreSpread) {
      break;
    }
  }
};

export const generateTeams = (request: TeamGenerationRequest): TeamGenerationResult => {
  const { constraints, weights } = request;
  const femalePerTeam = Math.max(1, constraints.femalePerTeam ?? 1);
  const warnings: string[] = [];
  const participants = request.participants.map(normalizeParticipant);
  const available = participants.filter((participant) => participant.isAvailable);

  if (constraints.teamSize <= 0) {
    throw new DomainError("teamSize must be greater than 0");
  }
  if (constraints.enforceFemalePerTeam && femalePerTeam > constraints.teamSize) {
    throw new DomainError("femalePerTeam cannot exceed teamSize");
  }
  if (available.length < constraints.teamSize) {
    throw new DomainError("Not enough available participants to form a full team");
  }

  const females = available.filter((participant) => participant.gender === "female");
  if (constraints.enforceFemalePerTeam && females.length < femalePerTeam) {
    throw new DomainError(
      `Not enough female players available while female-per-team rule is enabled (requires ${femalePerTeam})`
    );
  }

  const maxTeamsBySize = Math.floor(available.length / constraints.teamSize);
  const maxTeamsByFemale = constraints.enforceFemalePerTeam
    ? Math.floor(females.length / femalePerTeam)
    : maxTeamsBySize;
  const generatedTeamCount = Math.max(0, Math.min(maxTeamsBySize, maxTeamsByFemale));

  if (generatedTeamCount <= 0) {
    throw new DomainError("Unable to generate any full teams with current constraints");
  }

  const requestedTeamCount = constraints.teamCount;
  if (requestedTeamCount !== generatedTeamCount) {
    warnings.push(
      `Generated ${generatedTeamCount} full teams (requested ${requestedTeamCount}) based on available participants and constraints`
    );
  }

  const teamSlots = generatedTeamCount * constraints.teamSize;
  const random = seededRandom(request.seed ?? 20260608);
  const teams: Team[] = new Array(generatedTeamCount).fill(0).map((_, idx) => ({
    id: `team-${idx + 1}`,
    name: `Team ${idx + 1}`,
    members: []
  }));

  const lockedAssignments = new Map<string, string>(
    (request.lockedAssignments ?? []).map((entry) => [entry.participantId, entry.teamId])
  );

  const assignedIds = new Set<string>();
  for (const participant of available) {
    const explicitTeamId = lockedAssignments.get(participant.id) ?? participant.lockedTeamId;
    if (!explicitTeamId) continue;

    const team = teams.find((candidate) => candidate.id === explicitTeamId);
    if (!team) {
      warnings.push(`Ignored locked assignment to unknown team ${explicitTeamId} for ${participant.id}`);
      continue;
    }
    if (!isSlotAvailable(team, constraints.teamSize)) {
      warnings.push(`Ignored locked assignment for ${participant.id}; ${team.id} is full`);
      continue;
    }

    team.members.push({ ...participant, isLocked: true, lockedTeamId: team.id });
    assignedIds.add(participant.id);
  }

  const pool = available
    .filter((participant) => !assignedIds.has(participant.id))
    .sort((a, b) => participantScore(b, weights) - participantScore(a, weights));

  const femalePool = pool.filter((participant) => participant.gender === "female");

  if (constraints.enforceFemalePerTeam) {
    let femalePoolIndex = 0;
    for (let round = 0; round < femalePerTeam; round += 1) {
      const teamsNeedingFemale = teams.filter(
        (team) => femaleCountInTeam(team) < femalePerTeam && isSlotAvailable(team, constraints.teamSize)
      );
      const snakeOrder = makeSnakeOrder(teamsNeedingFemale.length);

      for (let i = 0; i < teamsNeedingFemale.length; i += 1) {
        const female = femalePool[femalePoolIndex];
        if (!female) break;
        femalePoolIndex += 1;

        const preferredTeam = teamsNeedingFemale[snakeOrder[i] ?? i];
        if (!preferredTeam || !isSlotAvailable(preferredTeam, constraints.teamSize)) continue;
        preferredTeam.members.push(female);
        assignedIds.add(female.id);
      }
    }
  }

  const remaining = available
    .filter((participant) => !assignedIds.has(participant.id))
    .map((participant) => {
      const weighted = participantScore(participant, weights);
      const jitter = (random() - 0.5) * constraints.randomizationFactor * 100;
      return { participant, weighted: weighted + jitter };
    })
    .sort((a, b) => b.weighted - a.weighted);

  for (const item of remaining) {
    const target = teams
      .filter((team) => isSlotAvailable(team, constraints.teamSize))
      .sort((a, b) => teamTotal(a) - teamTotal(b))[0];

    if (!target) break;

    if (constraints.enforceFemalePerTeam) {
      const femaleCountAfterPick = femaleCountInTeam(target) + (item.participant.gender === "female" ? 1 : 0);
      const remainingSlotsAfterPick = constraints.teamSize - (target.members.length + 1);
      const femaleStillNeededAfterPick = Math.max(0, femalePerTeam - femaleCountAfterPick);
      if (femaleStillNeededAfterPick > remainingSlotsAfterPick) continue;
    }

    target.members.push(item.participant);
    assignedIds.add(item.participant.id);

    if (assignedIds.size >= teamSlots) break;
  }

  for (const team of teams) {
    while (isSlotAvailable(team, constraints.teamSize)) {
      const candidate = available.find((participant) => !assignedIds.has(participant.id));
      if (!candidate) break;
      team.members.push(candidate);
      assignedIds.add(candidate.id);
    }
  }

  if (constraints.enforceFemalePerTeam && !femaleRuleSatisfied(teams, femalePerTeam)) {
    warnings.push("Female-per-team target could not be fully satisfied for generated teams");
  }

  const lockedParticipantIds = new Set(
    teams
      .flatMap((team) => team.members)
      .filter((member) => member.isLocked || lockedAssignments.has(member.id))
      .map((member) => member.id)
  );

  optimizationSwap(teams, constraints, lockedParticipantIds);

  const totals = teams.map((team) => teamTotal(team));
  const spread = Math.max(...totals) - Math.min(...totals);
  if (spread > constraints.maxAllowedScoreSpread) {
    warnings.push(`Score spread ${spread.toFixed(2)} is above threshold ${constraints.maxAllowedScoreSpread}`);
  }

  const strongestTeam = totals.indexOf(Math.max(...totals)) + 1;
  const weakestTeam = totals.indexOf(Math.min(...totals)) + 1;
  if (strongestTeam !== weakestTeam) {
    warnings.push(`Super-team guard: Team ${strongestTeam} vs Team ${weakestTeam} spread ${spread.toFixed(2)}`);
  }

  const assignedParticipants = teams.reduce((sum, team) => sum + team.members.length, 0);
  const unassignedParticipants = Math.max(0, available.length - assignedParticipants);
  const unassignedPool = available.filter((participant) => !assignedIds.has(participant.id));
  const unassignedFemale = unassignedPool.filter((participant) => participant.gender === "female").length;
  const unassignedMale = unassignedPool.filter((participant) => participant.gender === "male").length;

  const neededForOneMoreFullTeam = Math.max(0, constraints.teamSize - unassignedParticipants);
  const neededFemaleForOneMoreFullTeam = constraints.enforceFemalePerTeam
    ? Math.max(0, femalePerTeam - unassignedFemale)
    : 0;
  const neededMaleForOneMoreFullTeam = Math.max(
    0,
    neededForOneMoreFullTeam - neededFemaleForOneMoreFullTeam
  );

  const analytics = buildAnalytics(teams);
  const fairness = calculateFairnessMetrics(teams, constraints.enforceFemalePerTeam);

  return {
    teams,
    analytics,
    fairness,
    warnings,
    planning: {
      availableParticipants: available.length,
      generatedTeams: teams.length,
      teamSize: constraints.teamSize,
      assignedParticipants,
      unassignedParticipants,
      unassignedFemale,
      unassignedMale,
      neededForOneMoreFullTeam,
      neededFemaleForOneMoreFullTeam,
      neededMaleForOneMoreFullTeam
    }
  };
};
