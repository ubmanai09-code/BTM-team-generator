import type { TeamGenerationResult } from "@btm/shared";
import { prisma } from "../../config/prisma.js";

type Mode = "generate" | "simulation" | "manual_override" | "rebalance";

const participantName = (participant: { name?: string; displayName?: string; id: string }): string =>
  participant.name ?? participant.displayName ?? participant.id;

const participantScore = (participant: { averageScore?: number; skillScore?: number }): number =>
  participant.averageScore ?? participant.skillScore ?? 0;

const isLegacyIntegerSkillScoreError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    (message.includes("skillscore") && message.includes("integer")) ||
    message.includes("incorrect binary data format") ||
    message.includes("22p03")
  );
};

const migrateSkillScoreColumnToFloat = async (): Promise<void> => {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "Participant"
    ALTER COLUMN "skillScore" TYPE DOUBLE PRECISION
    USING "skillScore"::DOUBLE PRECISION
  `);
};

const upsertParticipantsLegacyInteger = async (
  participants: Array<TeamGenerationResult["teams"][number]["members"][number]>
): Promise<void> => {
  await prisma.$transaction(
    participants.map((participant) => {
      const score = Math.round(participantScore(participant));
      const roles = participant.previousTournamentsHistory ?? [];
      const tags = participant.division ? [participant.division] : [];
      return prisma.$executeRaw`
        INSERT INTO "Participant" (
          "id",
          "displayName",
          "skillScore",
          "experienceMonths",
          "preferredRoles",
          "gender",
          "tags",
          "isAvailable",
          "updatedAt"
        )
        VALUES (
          ${participant.id},
          ${participantName(participant)},
          ${score},
          0,
          ${roles}::text[],
          CAST(${participant.gender} AS "Gender"),
          ${tags}::text[],
          ${participant.isAvailable ?? true},
          NOW()
        )
        ON CONFLICT ("id") DO UPDATE
        SET
          "displayName" = EXCLUDED."displayName",
          "skillScore" = EXCLUDED."skillScore",
          "experienceMonths" = EXCLUDED."experienceMonths",
          "preferredRoles" = EXCLUDED."preferredRoles",
          "gender" = EXCLUDED."gender",
          "tags" = EXCLUDED."tags",
          "isAvailable" = EXCLUDED."isAvailable",
          "updatedAt" = NOW()
      `;
    })
  );
};

export class TeamRepository {
  async upsertParticipantsFromResult(result: TeamGenerationResult): Promise<void> {
    const uniqueParticipants = new Map(
      result.teams
        .flatMap((team) => team.members)
        .map((member) => [member.id, member])
    );

    const participants = [...uniqueParticipants.values()];
    const upsertWithScore = async (mapScore: (value: number) => number): Promise<void> => {
      await prisma.$transaction(
        participants.map((participant) => {
          const score = mapScore(participantScore(participant));
          return prisma.participant.upsert({
            where: { id: participant.id },
            update: {
              displayName: participantName(participant),
              skillScore: score,
              experienceMonths: 0,
              preferredRoles: participant.previousTournamentsHistory ?? [],
              gender: participant.gender,
              tags: participant.division ? [participant.division] : [],
              isAvailable: participant.isAvailable ?? true
            },
            create: {
              id: participant.id,
              displayName: participantName(participant),
              skillScore: score,
              experienceMonths: 0,
              preferredRoles: participant.previousTournamentsHistory ?? [],
              gender: participant.gender,
              tags: participant.division ? [participant.division] : [],
              isAvailable: participant.isAvailable ?? true
            }
          });
        })
      );
    };

    try {
      await upsertWithScore((value) => value);
    } catch (error) {
      // Backward compatibility for databases not yet migrated from INTEGER to FLOAT skillScore.
      if (isLegacyIntegerSkillScoreError(error)) {
        try {
          await migrateSkillScoreColumnToFloat();
          await upsertWithScore((value) => value);
          return;
        } catch (migrationError) {
          if (!isLegacyIntegerSkillScoreError(migrationError)) {
            throw migrationError;
          }

          // Last-resort compatibility path for environments where runtime migration is not permitted.
          await upsertParticipantsLegacyInteger(participants);
          return;
        }
      }
      throw error;
    }
  }

  async saveGenerationResult(
    mode: Mode,
    result: TeamGenerationResult
  ): Promise<string> {
    await this.upsertParticipantsFromResult(result);

    const run = await prisma.teamGenerationRun.create({
      data: {
        mode,
        fairnessScore: result.fairness.fairnessScore,
        averageDeviation: result.fairness.averageDeviation,
        standardDeviation: result.fairness.standardDeviation,
        highestLowestGap: result.fairness.highestLowestGap,
        genderDistributionValid: result.fairness.genderDistributionValid,
        warnings: result.warnings,
        teams: {
          create: result.teams.map((team) => ({
            name: team.name,
            members: {
              create: team.members.map((member) => ({
                participantId: member.id
              }))
            }
          }))
        }
      }
    });

    return run.id;
  }

  async getRunWithTeams(runId: string): Promise<{
    id: string;
    mode: string;
    teams: Array<{
      id: string;
      name: string;
      members: Array<{
        participant: {
          id: string;
          displayName: string;
          skillScore: number;
          gender: string;
          tags: string[];
        };
      }>;
    }>;
  } | null> {
    return prisma.teamGenerationRun.findUnique({
      where: { id: runId },
      select: {
        id: true,
        mode: true,
        teams: {
          select: {
            id: true,
            name: true,
            members: {
              select: {
                participant: {
                  select: {
                    id: true,
                    displayName: true,
                    skillScore: true,
                    gender: true,
                    tags: true
                  }
                }
              }
            }
          }
        }
      }
    });
  }

  async getRunAnalytics(limit = 20): Promise<
    Array<{
      id: string;
      mode: string;
      fairnessScore: number;
      averageDeviation: number;
      standardDeviation: number;
      highestLowestGap: number;
      genderDistributionValid: boolean;
      createdAt: Date;
    }>
  > {
    return prisma.teamGenerationRun.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        mode: true,
        fairnessScore: true,
        averageDeviation: true,
        standardDeviation: true,
        highestLowestGap: true,
        genderDistributionValid: true,
        createdAt: true
      }
    });
  }
}
