import { z } from "zod";
export const genderSchema = z.enum([
    "female",
    "male",
    "non_binary",
    "prefer_not_to_say"
]);
export const participantSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
    averageScore: z.number().min(0).max(300).optional(),
    skillScore: z.number().min(0).max(300).optional(),
    gender: genderSchema,
    handicap: z.number().min(-50).max(50).optional(),
    division: z.string().min(1).optional(),
    previousTournamentsHistory: z.array(z.string().min(1)).optional(),
    isAvailable: z.boolean().optional(),
    isLocked: z.boolean().optional(),
    lockedTeamId: z.string().min(1).optional()
}).superRefine((value, ctx) => {
    if (!value.name && !value.displayName) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["name"],
            message: "name (or displayName) is required"
        });
    }
    if (value.averageScore === undefined && value.skillScore === undefined) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["averageScore"],
            message: "averageScore (or skillScore) is required"
        });
    }
});
export const generationConstraintsSchema = z.object({
    teamCount: z.number().int().min(2).max(50),
    teamSize: z.number().int().min(2).max(10).default(3),
    enforceFemalePerTeam: z.boolean().default(true),
    maxAllowedScoreSpread: z.number().min(0).max(100).default(10),
    randomizationFactor: z.number().min(0).max(0.25).default(0.04),
    optimizationIterations: z.number().int().min(0).max(300).default(80),
    strictTeamSize: z.boolean().default(true),
    minSkillScore: z.number().min(0).max(300).optional(),
    maxSkillScore: z.number().min(0).max(300).optional()
}).superRefine((value, ctx) => {
    if (value.minSkillScore !== undefined &&
        value.maxSkillScore !== undefined &&
        value.minSkillScore > value.maxSkillScore) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["minSkillScore"],
            message: "minSkillScore cannot exceed maxSkillScore"
        });
    }
});
export const generationWeightsSchema = z.object({
    skillWeight: z.number().min(0).max(1),
    experienceWeight: z.number().min(0).max(1),
    roleDiversityWeight: z.number().min(0).max(1),
    genderBalanceWeight: z.number().min(0).max(1)
}).refine((weights) => {
    const sum = weights.skillWeight +
        weights.experienceWeight +
        weights.roleDiversityWeight +
        weights.genderBalanceWeight;
    return Math.abs(sum - 1) < 0.0001;
}, "weights must sum to 1");
const teamGenerationRequestBaseSchema = z.object({
    participants: z.array(participantSchema).min(2),
    constraints: generationConstraintsSchema,
    weights: generationWeightsSchema,
    lockedAssignments: z.array(z.object({
        participantId: z.string().min(1),
        teamId: z.string().min(1)
    })).optional(),
    seed: z.number().int().nonnegative().optional()
});
export const teamGenerationRequestSchema = teamGenerationRequestBaseSchema.superRefine((value, ctx) => {
    const availableParticipants = value.participants.filter((p) => p.isAvailable ?? true);
    if (availableParticipants.length < 2) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["participants"],
            message: "Not enough available participants"
        });
    }
    if (value.constraints.enforceFemalePerTeam && value.constraints.teamSize > 0) {
        const femaleCount = availableParticipants.filter((participant) => participant.gender === "female").length;
        if (femaleCount < 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["participants"],
                message: "Impossible scenario: no female players available"
            });
        }
    }
});
export const simulationRequestSchema = teamGenerationRequestBaseSchema.extend({
    iterations: z.number().int().min(1).max(5000)
});
export const manualOverrideOperationSchema = z.object({
    type: z.enum(["swap", "move"]),
    fromTeamId: z.string().min(1),
    participantId: z.string().min(1),
    toTeamId: z.string().min(1),
    swapWithParticipantId: z.string().min(1).optional()
}).superRefine((op, ctx) => {
    if (op.type === "swap" && !op.swapWithParticipantId) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["swapWithParticipantId"],
            message: "swapWithParticipantId is required for swap operations"
        });
    }
});
export const manualOverrideRequestSchema = z.object({
    baseResult: z.object({
        teams: z.array(z.object({
            id: z.string(),
            name: z.string(),
            members: z.array(participantSchema)
        })),
        analytics: z.array(z.any()),
        fairness: z.any(),
        warnings: z.array(z.string())
    }),
    operations: z.array(manualOverrideOperationSchema).min(1)
});
export const rebalanceRequestSchema = z.object({
    baseResult: z.object({
        teams: z.array(z.object({
            id: z.string(),
            name: z.string(),
            members: z.array(participantSchema)
        })),
        analytics: z.array(z.any()),
        fairness: z.any(),
        warnings: z.array(z.string())
    }),
    constraints: generationConstraintsSchema,
    weights: generationWeightsSchema,
    lockedPlayerIds: z.array(z.string().min(1)).default([]),
    seed: z.number().int().nonnegative().optional()
});
//# sourceMappingURL=validation.js.map