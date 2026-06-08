import type {
  ExportFormat,
  ManualOverrideRequest,
  RebalanceRequest,
  SimulationRequest,
  TeamGenerationRequest,
  TeamGenerationResult
} from "@btm/shared";
import { applyManualOverride, generateTeams, rebalanceTeams, runSimulation } from "@btm/team-core";
import { DomainError } from "@btm/team-core";
import { TeamRepository } from "./team.repository.js";

const toTitleCase = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase())
    .join(" ");

export class TeamService {
  constructor(private readonly repository: TeamRepository) {}

  async generate(request: TeamGenerationRequest): Promise<{ runId: string; result: TeamGenerationResult }> {
    const result = generateTeams(request);
    const runId = await this.repository.saveGenerationResult("generate", result);
    return { runId, result };
  }

  async simulate(request: SimulationRequest): Promise<{
    runId: string;
    result: ReturnType<typeof runSimulation>;
  }> {
    const simulationResult = runSimulation(request);
    const runId = await this.repository.saveGenerationResult(
      "simulation",
      simulationResult.bestResult
    );
    return { runId, result: simulationResult };
  }

  async manualOverride(
    request: ManualOverrideRequest,
    enforceFemalePerTeam: boolean
  ): Promise<{ runId: string; result: TeamGenerationResult }> {
    const result = applyManualOverride(request, enforceFemalePerTeam);
    const runId = await this.repository.saveGenerationResult("manual_override", result);
    return { runId, result };
  }

  async rebalance(request: RebalanceRequest): Promise<{ runId: string; result: TeamGenerationResult }> {
    const result = rebalanceTeams(request);
    const runId = await this.repository.saveGenerationResult("rebalance", result);
    return { runId, result };
  }

  async dashboard(limit = 20): Promise<{
    runs: Awaited<ReturnType<TeamRepository["getRunAnalytics"]>>;
    summary: {
      averageFairnessScore: number;
      bestFairnessScore: number;
      worstFairnessScore: number;
      validGenderDistributionRate: number;
    };
  }> {
    const runs = await this.repository.getRunAnalytics(limit);
    const fairnessScores = runs.map((run) => run.fairnessScore);

    const averageFairnessScore =
      fairnessScores.reduce((sum, value) => sum + value, 0) /
      Math.max(1, fairnessScores.length);
    const bestFairnessScore = fairnessScores.length ? Math.max(...fairnessScores) : 0;
    const worstFairnessScore = fairnessScores.length ? Math.min(...fairnessScores) : 0;
    const validGenderDistributionRate =
      runs.filter((run) => run.genderDistributionValid).length /
      Math.max(1, runs.length);

    return {
      runs,
      summary: {
        averageFairnessScore: Number(averageFairnessScore.toFixed(2)),
        bestFairnessScore,
        worstFairnessScore,
        validGenderDistributionRate: Number(validGenderDistributionRate.toFixed(2))
      }
    };
  }

  async exportRun(runId: string, format: ExportFormat): Promise<{ filename: string; mime: string; content: string }> {
    const run = await this.repository.getRunWithTeams(runId);
    if (!run) {
      throw new DomainError(`Run ${runId} not found`);
    }

    const rows = run.teams.flatMap((team, index) => {
      const playerScores = team.members.map((entry) => entry.participant.skillScore ?? 0);
      const teamTotalPotentialScore = playerScores.reduce((sum, score) => sum + score, 0);

      return team.members.map((entry) => ({
        teamNumber: index + 1,
        playerId: entry.participant.id,
        playerName: toTitleCase(entry.participant.displayName ?? entry.participant.id),
        gender: entry.participant.gender,
        playerAverageScore: entry.participant.skillScore ?? 0,
        teamTotalPotentialScore
      }));
    });

    if (format === "excel") {
      const escapeCsv = (value: string | number): string => {
        const raw = String(value ?? "");
        if (/[",\n]/.test(raw)) {
          return `"${raw.replace(/"/g, '""')}"`;
        }
        return raw;
      };
      const formatScore = (value: number): string => {
        if (!Number.isFinite(value)) return "0.00";
        const normalized = String(value);
        if (!normalized.includes(".")) return `${normalized}.00`;

        const [whole, fraction] = normalized.split(".");
        if (!fraction || fraction.length === 0) return `${whole}.00`;
        if (fraction.length === 1) return `${whole}.${fraction}0`;
        return normalized;
      };

      const header = "Team #,Player ID,Player Name,Gender,Player Average Score,Team Total Potential Score";
      const bodyRows = run.teams.flatMap((team, teamIndex) => {
        const playerScores = team.members.map((entry) => entry.participant.skillScore ?? 0);
        const teamTotalPotentialScore = playerScores.reduce((sum, score) => sum + score, 0);

        const memberRows = team.members.map((entry, memberIndex) => {
          const isFirstRowInTeam = memberIndex === 0;
          return [
            escapeCsv(isFirstRowInTeam ? teamIndex + 1 : ""),
            escapeCsv(entry.participant.id),
            escapeCsv(toTitleCase(entry.participant.displayName ?? entry.participant.id)),
            escapeCsv(entry.participant.gender),
            escapeCsv(formatScore(entry.participant.skillScore ?? 0)),
            escapeCsv(isFirstRowInTeam ? formatScore(teamTotalPotentialScore) : "")
          ].join(",");
        });

        // Blank separator row improves team block readability in spreadsheet viewers.
        return [...memberRows, ",,,,,"];
      });

      if (bodyRows.length > 0) {
        bodyRows.pop();
      }

      const body = bodyRows.join("\n");

      // UTF-8 BOM improves compatibility with Excel for non-ASCII names.
      const utf8Bom = "\uFEFF";
      return {
        filename: `teams-${runId}.csv`,
        mime: "text/csv; charset=utf-8",
        content: `${utf8Bom}${header}\n${body}`
      };
    }

    const lines = [
      `Run ID: ${run.id}`,
      `Mode: ${run.mode}`,
      "",
      ...rows.map(
        (row) =>
          `Team ${row.teamNumber} | ${row.playerId} | ${row.playerName} (${row.gender}) | player_avg=${Number(
            row.playerAverageScore
          ).toFixed(2)} | team_total_potential=${Number(row.teamTotalPotentialScore).toFixed(2)}`
      )
    ];

    return {
      filename: `teams-${runId}.txt`,
      mime: "text/plain",
      content: lines.join("\n")
    };
  }
}
