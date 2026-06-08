CREATE TYPE "Gender" AS ENUM ('female', 'male', 'non_binary', 'prefer_not_to_say');

CREATE TABLE "Participant" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "skillScore" INTEGER NOT NULL,
  "experienceMonths" INTEGER NOT NULL,
  "preferredRoles" TEXT[] NOT NULL,
  "gender" "Gender" NOT NULL,
  "tags" TEXT[] NOT NULL,
  "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamGenerationRun" (
  "id" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "fairnessScore" DOUBLE PRECISION NOT NULL,
  "averageDeviation" DOUBLE PRECISION NOT NULL,
  "standardDeviation" DOUBLE PRECISION NOT NULL,
  "highestLowestGap" DOUBLE PRECISION NOT NULL,
  "genderDistributionValid" BOOLEAN NOT NULL,
  "warnings" TEXT[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamGenerationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Team" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TeamMember" (
  "teamId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("teamId", "participantId")
);

ALTER TABLE "Team"
  ADD CONSTRAINT "Team_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "TeamGenerationRun"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_teamId_fkey"
  FOREIGN KEY ("teamId") REFERENCES "Team"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "Participant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
