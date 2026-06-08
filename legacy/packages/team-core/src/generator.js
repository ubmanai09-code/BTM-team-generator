import { calculateFairnessMetrics } from "./fairness.js";
import { DomainError } from "./errors.js";
const emptyGenderMap = () => ({
    female: 0,
    male: 0,
    non_binary: 0,
    prefer_not_to_say: 0
});
const seededRandom = (seed) => {
    let value = seed;
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296;
        return value / 4294967296;
    };
};
const normalizeParticipant = (participant) => ({
    ...participant,
    name: participant.name ?? participant.displayName ?? participant.id,
    averageScore: participant.averageScore ?? participant.skillScore ?? 0,
    isAvailable: participant.isAvailable ?? true,
    isLocked: participant.isLocked ?? false
});
const participantScore = (participant, weights) => {
    const handicapNormalization = Math.max(-1, Math.min(1, (participant.handicap ?? 0) / 50));
    const historyNormalization = Math.min(1, (participant.previousTournamentsHistory?.length ?? 0) / 20);
    const divisionNormalization = participant.division ? 1 : 0;
    return (participant.averageScore * weights.skillWeight +
        (100 - (participant.handicap ?? 0) * 2) * weights.experienceWeight +
        (historyNormalization * 70 + divisionNormalization * 30) * weights.roleDiversityWeight +
        (participant.gender === "female" ? 100 : 0) * weights.genderBalanceWeight +
        handicapNormalization);
};
const teamTotal = (team) => team.members.reduce((sum, member) => sum + (member.averageScore ?? member.skillScore ?? 0), 0);
const teamHasFemale = (team) => team.members.some((member) => member.gender === "female");
const isSlotAvailable = (team, teamSize) => team.members.length < teamSize;
const makeSnakeOrder = (teamCount) => {
    if (teamCount <= 0)
        return [];
    const order = [];
    let index = 0;
    let direction = 1;
    for (let pick = 0; pick < teamCount; pick += 1) {
        order.push(index);
        if (index === teamCount - 1)
            direction = -1;
        if (index === 0)
            direction = 1;
        index += direction;
        if (index < 0)
            index = 0;
        if (index > teamCount - 1)
            index = teamCount - 1;
    }
    return order;
};
const buildAnalytics = (teams) => {
    return teams.map((team) => {
        const divisions = {};
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
const femaleRuleSatisfied = (teams) => teams.every((team) => teamHasFemale(team));
const optimizationSwap = (teams, constraints, lockedParticipantIds) => {
    for (let i = 0; i < constraints.optimizationIterations; i += 1) {
        const totals = teams.map((team, teamIndex) => ({ teamIndex, total: teamTotal(team) }));
        totals.sort((a, b) => a.total - b.total);
        const weakest = teams[totals[0]?.teamIndex ?? 0];
        const strongest = teams[totals[totals.length - 1]?.teamIndex ?? 0];
        if (!weakest || !strongest)
            return;
        const spread = Math.abs(teamTotal(strongest) - teamTotal(weakest));
        if (spread <= constraints.maxAllowedScoreSpread)
            break;
        let best = null;
        for (let s = 0; s < strongest.members.length; s += 1) {
            for (let w = 0; w < weakest.members.length; w += 1) {
                const highMember = strongest.members[s];
                const lowMember = weakest.members[w];
                if (!highMember || !lowMember)
                    continue;
                if (lockedParticipantIds.has(highMember.id) || lockedParticipantIds.has(lowMember.id))
                    continue;
                strongest.members[s] = lowMember;
                weakest.members[w] = highMember;
                const nextSpread = Math.abs(teamTotal(strongest) - teamTotal(weakest));
                const femaleValid = !constraints.enforceFemalePerTeam || femaleRuleSatisfied(teams);
                strongest.members[s] = highMember;
                weakest.members[w] = lowMember;
                if (!femaleValid)
                    continue;
                if (best === null || nextSpread < best.score) {
                    best = { strongestIdx: s, weakestIdx: w, score: nextSpread };
                }
            }
        }
        if (!best || best.score >= spread)
            break;
        const high = strongest.members[best.strongestIdx];
        const low = weakest.members[best.weakestIdx];
        if (!high || !low)
            break;
        strongest.members[best.strongestIdx] = low;
        weakest.members[best.weakestIdx] = high;
    }
};
export const generateTeams = (request) => {
    const { constraints, weights } = request;
    const warnings = [];
    const participants = request.participants.map(normalizeParticipant);
    const available = participants.filter((participant) => participant.isAvailable);
    if (constraints.teamSize <= 0) {
        throw new DomainError("teamSize must be greater than 0");
    }
    if (available.length < constraints.teamSize) {
        throw new DomainError("Not enough available participants to form a full team");
    }
    const females = available.filter((participant) => participant.gender === "female");
    if (constraints.enforceFemalePerTeam && females.length === 0) {
        throw new DomainError("No female players available while female-per-team rule is enabled");
    }
    const maxTeamsBySize = Math.floor(available.length / constraints.teamSize);
    const maxTeamsByFemale = constraints.enforceFemalePerTeam ? females.length : maxTeamsBySize;
    const generatedTeamCount = Math.max(0, Math.min(maxTeamsBySize, maxTeamsByFemale));
    if (generatedTeamCount <= 0) {
        throw new DomainError("Unable to generate any full teams with current constraints");
    }
    const requestedTeamCount = constraints.teamCount;
    if (requestedTeamCount !== generatedTeamCount) {
        warnings.push(`Generated ${generatedTeamCount} full teams (requested ${requestedTeamCount}) based on available participants and constraints`);
    }
    const teamSlots = generatedTeamCount * constraints.teamSize;
    const random = seededRandom(request.seed ?? 20260608);
    const teams = new Array(generatedTeamCount).fill(0).map((_, idx) => ({
        id: `team-${idx + 1}`,
        name: `Team ${idx + 1}`,
        members: []
    }));
    const lockedAssignments = new Map((request.lockedAssignments ?? []).map((entry) => [entry.participantId, entry.teamId]));
    const assignedIds = new Set();
    for (const participant of available) {
        const explicitTeamId = lockedAssignments.get(participant.id) ?? participant.lockedTeamId;
        if (!explicitTeamId)
            continue;
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
        const teamsMissingFemale = teams.filter((team) => !teamHasFemale(team));
        const snakeOrder = makeSnakeOrder(teamsMissingFemale.length);
        for (let i = 0; i < teamsMissingFemale.length; i += 1) {
            const female = femalePool[i];
            if (!female)
                break;
            const preferredTeam = teamsMissingFemale[snakeOrder[i] ?? i];
            if (!preferredTeam || !isSlotAvailable(preferredTeam, constraints.teamSize))
                continue;
            preferredTeam.members.push(female);
            assignedIds.add(female.id);
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
        if (!target)
            break;
        const nearTeamCompletion = target.members.length + 1 >= constraints.teamSize;
        if (constraints.enforceFemalePerTeam &&
            nearTeamCompletion &&
            !teamHasFemale(target) &&
            item.participant.gender !== "female") {
            continue;
        }
        target.members.push(item.participant);
        assignedIds.add(item.participant.id);
        if (assignedIds.size >= teamSlots)
            break;
    }
    for (const team of teams) {
        while (isSlotAvailable(team, constraints.teamSize)) {
            const candidate = available.find((participant) => !assignedIds.has(participant.id));
            if (!candidate)
                break;
            team.members.push(candidate);
            assignedIds.add(candidate.id);
        }
    }
    if (constraints.enforceFemalePerTeam && !femaleRuleSatisfied(teams)) {
        warnings.push("Female-per-team target could not be fully satisfied for generated teams");
    }
    const lockedParticipantIds = new Set(teams
        .flatMap((team) => team.members)
        .filter((member) => member.isLocked || lockedAssignments.has(member.id))
        .map((member) => member.id));
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
        ? Math.max(0, 1 - unassignedFemale)
        : 0;
    const neededMaleForOneMoreFullTeam = Math.max(0, neededForOneMoreFullTeam - neededFemaleForOneMoreFullTeam);
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
//# sourceMappingURL=generator.js.map