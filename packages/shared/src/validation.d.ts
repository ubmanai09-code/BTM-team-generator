import { z } from "zod";
export declare const genderSchema: z.ZodEnum<["female", "male", "non_binary", "prefer_not_to_say"]>;
export declare const participantSchema: z.ZodEffects<z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    displayName: z.ZodOptional<z.ZodString>;
    averageScore: z.ZodOptional<z.ZodNumber>;
    skillScore: z.ZodOptional<z.ZodNumber>;
    gender: z.ZodEnum<["female", "male", "non_binary", "prefer_not_to_say"]>;
    handicap: z.ZodOptional<z.ZodNumber>;
    division: z.ZodOptional<z.ZodString>;
    previousTournamentsHistory: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    isAvailable: z.ZodOptional<z.ZodBoolean>;
    isLocked: z.ZodOptional<z.ZodBoolean>;
    lockedTeamId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id: string;
    gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
    name?: string | undefined;
    displayName?: string | undefined;
    averageScore?: number | undefined;
    skillScore?: number | undefined;
    handicap?: number | undefined;
    division?: string | undefined;
    previousTournamentsHistory?: string[] | undefined;
    isAvailable?: boolean | undefined;
    isLocked?: boolean | undefined;
    lockedTeamId?: string | undefined;
}, {
    id: string;
    gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
    name?: string | undefined;
    displayName?: string | undefined;
    averageScore?: number | undefined;
    skillScore?: number | undefined;
    handicap?: number | undefined;
    division?: string | undefined;
    previousTournamentsHistory?: string[] | undefined;
    isAvailable?: boolean | undefined;
    isLocked?: boolean | undefined;
    lockedTeamId?: string | undefined;
}>, {
    id: string;
    gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
    name?: string | undefined;
    displayName?: string | undefined;
    averageScore?: number | undefined;
    skillScore?: number | undefined;
    handicap?: number | undefined;
    division?: string | undefined;
    previousTournamentsHistory?: string[] | undefined;
    isAvailable?: boolean | undefined;
    isLocked?: boolean | undefined;
    lockedTeamId?: string | undefined;
}, {
    id: string;
    gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
    name?: string | undefined;
    displayName?: string | undefined;
    averageScore?: number | undefined;
    skillScore?: number | undefined;
    handicap?: number | undefined;
    division?: string | undefined;
    previousTournamentsHistory?: string[] | undefined;
    isAvailable?: boolean | undefined;
    isLocked?: boolean | undefined;
    lockedTeamId?: string | undefined;
}>;
export declare const generationConstraintsSchema: z.ZodEffects<z.ZodObject<{
    teamCount: z.ZodNumber;
    teamSize: z.ZodDefault<z.ZodNumber>;
    enforceFemalePerTeam: z.ZodDefault<z.ZodBoolean>;
    maxAllowedScoreSpread: z.ZodDefault<z.ZodNumber>;
    randomizationFactor: z.ZodDefault<z.ZodNumber>;
    optimizationIterations: z.ZodDefault<z.ZodNumber>;
    strictTeamSize: z.ZodDefault<z.ZodBoolean>;
    minSkillScore: z.ZodOptional<z.ZodNumber>;
    maxSkillScore: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    teamCount: number;
    teamSize: number;
    enforceFemalePerTeam: boolean;
    maxAllowedScoreSpread: number;
    randomizationFactor: number;
    optimizationIterations: number;
    strictTeamSize: boolean;
    minSkillScore?: number | undefined;
    maxSkillScore?: number | undefined;
}, {
    teamCount: number;
    teamSize?: number | undefined;
    enforceFemalePerTeam?: boolean | undefined;
    maxAllowedScoreSpread?: number | undefined;
    randomizationFactor?: number | undefined;
    optimizationIterations?: number | undefined;
    strictTeamSize?: boolean | undefined;
    minSkillScore?: number | undefined;
    maxSkillScore?: number | undefined;
}>, {
    teamCount: number;
    teamSize: number;
    enforceFemalePerTeam: boolean;
    maxAllowedScoreSpread: number;
    randomizationFactor: number;
    optimizationIterations: number;
    strictTeamSize: boolean;
    minSkillScore?: number | undefined;
    maxSkillScore?: number | undefined;
}, {
    teamCount: number;
    teamSize?: number | undefined;
    enforceFemalePerTeam?: boolean | undefined;
    maxAllowedScoreSpread?: number | undefined;
    randomizationFactor?: number | undefined;
    optimizationIterations?: number | undefined;
    strictTeamSize?: boolean | undefined;
    minSkillScore?: number | undefined;
    maxSkillScore?: number | undefined;
}>;
export declare const generationWeightsSchema: z.ZodEffects<z.ZodObject<{
    skillWeight: z.ZodNumber;
    experienceWeight: z.ZodNumber;
    roleDiversityWeight: z.ZodNumber;
    genderBalanceWeight: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    skillWeight: number;
    experienceWeight: number;
    roleDiversityWeight: number;
    genderBalanceWeight: number;
}, {
    skillWeight: number;
    experienceWeight: number;
    roleDiversityWeight: number;
    genderBalanceWeight: number;
}>, {
    skillWeight: number;
    experienceWeight: number;
    roleDiversityWeight: number;
    genderBalanceWeight: number;
}, {
    skillWeight: number;
    experienceWeight: number;
    roleDiversityWeight: number;
    genderBalanceWeight: number;
}>;
export declare const teamGenerationRequestSchema: z.ZodEffects<z.ZodObject<{
    participants: z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        displayName: z.ZodOptional<z.ZodString>;
        averageScore: z.ZodOptional<z.ZodNumber>;
        skillScore: z.ZodOptional<z.ZodNumber>;
        gender: z.ZodEnum<["female", "male", "non_binary", "prefer_not_to_say"]>;
        handicap: z.ZodOptional<z.ZodNumber>;
        division: z.ZodOptional<z.ZodString>;
        previousTournamentsHistory: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isAvailable: z.ZodOptional<z.ZodBoolean>;
        isLocked: z.ZodOptional<z.ZodBoolean>;
        lockedTeamId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }>, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }>, "many">;
    constraints: z.ZodEffects<z.ZodObject<{
        teamCount: z.ZodNumber;
        teamSize: z.ZodDefault<z.ZodNumber>;
        enforceFemalePerTeam: z.ZodDefault<z.ZodBoolean>;
        maxAllowedScoreSpread: z.ZodDefault<z.ZodNumber>;
        randomizationFactor: z.ZodDefault<z.ZodNumber>;
        optimizationIterations: z.ZodDefault<z.ZodNumber>;
        strictTeamSize: z.ZodDefault<z.ZodBoolean>;
        minSkillScore: z.ZodOptional<z.ZodNumber>;
        maxSkillScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }, {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }>, {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }, {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }>;
    weights: z.ZodEffects<z.ZodObject<{
        skillWeight: z.ZodNumber;
        experienceWeight: z.ZodNumber;
        roleDiversityWeight: z.ZodNumber;
        genderBalanceWeight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }>, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }>;
    lockedAssignments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        participantId: z.ZodString;
        teamId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        participantId: string;
        teamId: string;
    }, {
        participantId: string;
        teamId: string;
    }>, "many">>;
    seed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    participants: {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }[];
    constraints: {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    lockedAssignments?: {
        participantId: string;
        teamId: string;
    }[] | undefined;
    seed?: number | undefined;
}, {
    participants: {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }[];
    constraints: {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    lockedAssignments?: {
        participantId: string;
        teamId: string;
    }[] | undefined;
    seed?: number | undefined;
}>, {
    participants: {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }[];
    constraints: {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    lockedAssignments?: {
        participantId: string;
        teamId: string;
    }[] | undefined;
    seed?: number | undefined;
}, {
    participants: {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }[];
    constraints: {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    lockedAssignments?: {
        participantId: string;
        teamId: string;
    }[] | undefined;
    seed?: number | undefined;
}>;
export declare const simulationRequestSchema: z.ZodObject<{
    participants: z.ZodArray<z.ZodEffects<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodOptional<z.ZodString>;
        displayName: z.ZodOptional<z.ZodString>;
        averageScore: z.ZodOptional<z.ZodNumber>;
        skillScore: z.ZodOptional<z.ZodNumber>;
        gender: z.ZodEnum<["female", "male", "non_binary", "prefer_not_to_say"]>;
        handicap: z.ZodOptional<z.ZodNumber>;
        division: z.ZodOptional<z.ZodString>;
        previousTournamentsHistory: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        isAvailable: z.ZodOptional<z.ZodBoolean>;
        isLocked: z.ZodOptional<z.ZodBoolean>;
        lockedTeamId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }>, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }, {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }>, "many">;
    constraints: z.ZodEffects<z.ZodObject<{
        teamCount: z.ZodNumber;
        teamSize: z.ZodDefault<z.ZodNumber>;
        enforceFemalePerTeam: z.ZodDefault<z.ZodBoolean>;
        maxAllowedScoreSpread: z.ZodDefault<z.ZodNumber>;
        randomizationFactor: z.ZodDefault<z.ZodNumber>;
        optimizationIterations: z.ZodDefault<z.ZodNumber>;
        strictTeamSize: z.ZodDefault<z.ZodBoolean>;
        minSkillScore: z.ZodOptional<z.ZodNumber>;
        maxSkillScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }, {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }>, {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }, {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }>;
    weights: z.ZodEffects<z.ZodObject<{
        skillWeight: z.ZodNumber;
        experienceWeight: z.ZodNumber;
        roleDiversityWeight: z.ZodNumber;
        genderBalanceWeight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }>, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }>;
    lockedAssignments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        participantId: z.ZodString;
        teamId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        participantId: string;
        teamId: string;
    }, {
        participantId: string;
        teamId: string;
    }>, "many">>;
    seed: z.ZodOptional<z.ZodNumber>;
} & {
    iterations: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    participants: {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }[];
    constraints: {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    iterations: number;
    lockedAssignments?: {
        participantId: string;
        teamId: string;
    }[] | undefined;
    seed?: number | undefined;
}, {
    participants: {
        id: string;
        gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
        name?: string | undefined;
        displayName?: string | undefined;
        averageScore?: number | undefined;
        skillScore?: number | undefined;
        handicap?: number | undefined;
        division?: string | undefined;
        previousTournamentsHistory?: string[] | undefined;
        isAvailable?: boolean | undefined;
        isLocked?: boolean | undefined;
        lockedTeamId?: string | undefined;
    }[];
    constraints: {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    iterations: number;
    lockedAssignments?: {
        participantId: string;
        teamId: string;
    }[] | undefined;
    seed?: number | undefined;
}>;
export declare const manualOverrideOperationSchema: z.ZodEffects<z.ZodObject<{
    type: z.ZodEnum<["swap", "move"]>;
    fromTeamId: z.ZodString;
    participantId: z.ZodString;
    toTeamId: z.ZodString;
    swapWithParticipantId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "swap" | "move";
    participantId: string;
    fromTeamId: string;
    toTeamId: string;
    swapWithParticipantId?: string | undefined;
}, {
    type: "swap" | "move";
    participantId: string;
    fromTeamId: string;
    toTeamId: string;
    swapWithParticipantId?: string | undefined;
}>, {
    type: "swap" | "move";
    participantId: string;
    fromTeamId: string;
    toTeamId: string;
    swapWithParticipantId?: string | undefined;
}, {
    type: "swap" | "move";
    participantId: string;
    fromTeamId: string;
    toTeamId: string;
    swapWithParticipantId?: string | undefined;
}>;
export declare const manualOverrideRequestSchema: z.ZodObject<{
    baseResult: z.ZodObject<{
        teams: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            members: z.ZodArray<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodOptional<z.ZodString>;
                displayName: z.ZodOptional<z.ZodString>;
                averageScore: z.ZodOptional<z.ZodNumber>;
                skillScore: z.ZodOptional<z.ZodNumber>;
                gender: z.ZodEnum<["female", "male", "non_binary", "prefer_not_to_say"]>;
                handicap: z.ZodOptional<z.ZodNumber>;
                division: z.ZodOptional<z.ZodString>;
                previousTournamentsHistory: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                isAvailable: z.ZodOptional<z.ZodBoolean>;
                isLocked: z.ZodOptional<z.ZodBoolean>;
                lockedTeamId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }>, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }, {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }>, "many">;
        analytics: z.ZodArray<z.ZodAny, "many">;
        fairness: z.ZodAny;
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    }, {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    }>;
    operations: z.ZodArray<z.ZodEffects<z.ZodObject<{
        type: z.ZodEnum<["swap", "move"]>;
        fromTeamId: z.ZodString;
        participantId: z.ZodString;
        toTeamId: z.ZodString;
        swapWithParticipantId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "swap" | "move";
        participantId: string;
        fromTeamId: string;
        toTeamId: string;
        swapWithParticipantId?: string | undefined;
    }, {
        type: "swap" | "move";
        participantId: string;
        fromTeamId: string;
        toTeamId: string;
        swapWithParticipantId?: string | undefined;
    }>, {
        type: "swap" | "move";
        participantId: string;
        fromTeamId: string;
        toTeamId: string;
        swapWithParticipantId?: string | undefined;
    }, {
        type: "swap" | "move";
        participantId: string;
        fromTeamId: string;
        toTeamId: string;
        swapWithParticipantId?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    baseResult: {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    };
    operations: {
        type: "swap" | "move";
        participantId: string;
        fromTeamId: string;
        toTeamId: string;
        swapWithParticipantId?: string | undefined;
    }[];
}, {
    baseResult: {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    };
    operations: {
        type: "swap" | "move";
        participantId: string;
        fromTeamId: string;
        toTeamId: string;
        swapWithParticipantId?: string | undefined;
    }[];
}>;
export declare const rebalanceRequestSchema: z.ZodObject<{
    baseResult: z.ZodObject<{
        teams: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            members: z.ZodArray<z.ZodEffects<z.ZodObject<{
                id: z.ZodString;
                name: z.ZodOptional<z.ZodString>;
                displayName: z.ZodOptional<z.ZodString>;
                averageScore: z.ZodOptional<z.ZodNumber>;
                skillScore: z.ZodOptional<z.ZodNumber>;
                gender: z.ZodEnum<["female", "male", "non_binary", "prefer_not_to_say"]>;
                handicap: z.ZodOptional<z.ZodNumber>;
                division: z.ZodOptional<z.ZodString>;
                previousTournamentsHistory: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
                isAvailable: z.ZodOptional<z.ZodBoolean>;
                isLocked: z.ZodOptional<z.ZodBoolean>;
                lockedTeamId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }>, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }, {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }, {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }>, "many">;
        analytics: z.ZodArray<z.ZodAny, "many">;
        fairness: z.ZodAny;
        warnings: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    }, {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    }>;
    constraints: z.ZodEffects<z.ZodObject<{
        teamCount: z.ZodNumber;
        teamSize: z.ZodDefault<z.ZodNumber>;
        enforceFemalePerTeam: z.ZodDefault<z.ZodBoolean>;
        maxAllowedScoreSpread: z.ZodDefault<z.ZodNumber>;
        randomizationFactor: z.ZodDefault<z.ZodNumber>;
        optimizationIterations: z.ZodDefault<z.ZodNumber>;
        strictTeamSize: z.ZodDefault<z.ZodBoolean>;
        minSkillScore: z.ZodOptional<z.ZodNumber>;
        maxSkillScore: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }, {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }>, {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }, {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    }>;
    weights: z.ZodEffects<z.ZodObject<{
        skillWeight: z.ZodNumber;
        experienceWeight: z.ZodNumber;
        roleDiversityWeight: z.ZodNumber;
        genderBalanceWeight: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }>, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }, {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    }>;
    lockedPlayerIds: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    seed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    constraints: {
        teamCount: number;
        teamSize: number;
        enforceFemalePerTeam: boolean;
        maxAllowedScoreSpread: number;
        randomizationFactor: number;
        optimizationIterations: number;
        strictTeamSize: boolean;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    baseResult: {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    };
    lockedPlayerIds: string[];
    seed?: number | undefined;
}, {
    constraints: {
        teamCount: number;
        teamSize?: number | undefined;
        enforceFemalePerTeam?: boolean | undefined;
        maxAllowedScoreSpread?: number | undefined;
        randomizationFactor?: number | undefined;
        optimizationIterations?: number | undefined;
        strictTeamSize?: boolean | undefined;
        minSkillScore?: number | undefined;
        maxSkillScore?: number | undefined;
    };
    weights: {
        skillWeight: number;
        experienceWeight: number;
        roleDiversityWeight: number;
        genderBalanceWeight: number;
    };
    baseResult: {
        teams: {
            id: string;
            name: string;
            members: {
                id: string;
                gender: "female" | "male" | "non_binary" | "prefer_not_to_say";
                name?: string | undefined;
                displayName?: string | undefined;
                averageScore?: number | undefined;
                skillScore?: number | undefined;
                handicap?: number | undefined;
                division?: string | undefined;
                previousTournamentsHistory?: string[] | undefined;
                isAvailable?: boolean | undefined;
                isLocked?: boolean | undefined;
                lockedTeamId?: string | undefined;
            }[];
        }[];
        analytics: any[];
        warnings: string[];
        fairness?: any;
    };
    seed?: number | undefined;
    lockedPlayerIds?: string[] | undefined;
}>;
