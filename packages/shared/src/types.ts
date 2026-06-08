export type Gender = "female" | "male" | "non_binary" | "prefer_not_to_say";

export interface Participant {
  id: string;
  name: string;
  gender: Gender;
  averageScore: number;
  handicap?: number;
  division?: string;
  previousTournamentsHistory?: string[];
  isAvailable?: boolean;
  isLocked?: boolean;
  lockedTeamId?: string;
  // Backward-compatible aliases used by older payloads.
  displayName?: string;
  skillScore?: number;
}

export interface Team {
  id: string;
  name: string;
  members: Participant[];
}

export interface GenerationConstraints {
  teamCount: number;
  teamSize: number;
  enforceFemalePerTeam: boolean;
  femalePerTeam: number;
  maxAllowedScoreSpread: number;
  randomizationFactor: number;
  optimizationIterations: number;
  strictTeamSize: boolean;
  minSkillScore?: number;
  maxSkillScore?: number;
}

export interface GenerationWeights {
  skillWeight: number;
  experienceWeight: number;
  roleDiversityWeight: number;
  genderBalanceWeight: number;
}

export interface TeamGenerationRequest {
  participants: Participant[];
  constraints: GenerationConstraints;
  weights: GenerationWeights;
  lockedAssignments?: Array<{
    participantId: string;
    teamId: string;
  }>;
  seed?: number;
}

export interface TeamAnalytics {
  teamId: string;
  averageScore: number;
  totalScore: number;
  genderCounts: Record<Gender, number>;
  divisions: Record<string, number>;
}

export interface FairnessMetrics {
  averageDeviation: number;
  standardDeviation: number;
  highestLowestGap: number;
  genderDistributionValid: boolean;
  fairnessScore: number;
}

export interface TeamGenerationResult {
  teams: Team[];
  analytics: TeamAnalytics[];
  fairness: FairnessMetrics;
  warnings: string[];
  planning?: {
    availableParticipants: number;
    generatedTeams: number;
    teamSize: number;
    assignedParticipants: number;
    unassignedParticipants: number;
    unassignedFemale: number;
    unassignedMale: number;
    neededForOneMoreFullTeam: number;
    neededFemaleForOneMoreFullTeam: number;
    neededMaleForOneMoreFullTeam: number;
  };
}

export interface RebalanceRequest {
  baseResult: TeamGenerationResult;
  constraints: GenerationConstraints;
  weights: GenerationWeights;
  lockedPlayerIds: string[];
  seed?: number;
}

export interface SimulationRequest extends TeamGenerationRequest {
  iterations: number;
}

export interface SimulationResult {
  bestResult: TeamGenerationResult;
  candidateResults: Array<{
    run: number;
    fairnessScore: number;
    averageDeviation: number;
    standardDeviation: number;
  }>;
}

export interface ManualOverrideOperation {
  type: "swap" | "move";
  fromTeamId: string;
  participantId: string;
  toTeamId: string;
  swapWithParticipantId?: string;
}

export interface ManualOverrideRequest {
  baseResult: TeamGenerationResult;
  operations: ManualOverrideOperation[];
}

export type ExportFormat = "pdf" | "excel";
