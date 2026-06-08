"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ManualOverrideRequest,
  Participant,
  RebalanceRequest,
  SimulationRequest,
  TeamGenerationRequest,
  TeamGenerationResult
} from "@btm/shared";
import { api } from "../lib/api";

type GenerationApiResponse = {
  runId: string;
  result: TeamGenerationResult;
};

type SimulationApiResponse = {
  runId: string;
  result: {
    bestResult: TeamGenerationResult;
    candidateResults: Array<{
      run: number;
      fairnessScore: number;
      averageDeviation: number;
      standardDeviation: number;
    }>;
  };
};

export type SectionKey = "import" | "settings" | "setup" | "generate" | "edit" | "export";

const pretty = (value: unknown): string => JSON.stringify(value, null, 2);
const playerName = (player: Participant): string => player.name ?? player.displayName ?? player.id;
const playerScore = (player: Participant): number => player.averageScore ?? player.skillScore ?? 0;
const toTitleCase = (value: string): string =>
  value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1).toLocaleLowerCase())
    .join(" ");

const splitWithDelimiter = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(current.trim());
  return cells;
};

const parseGender = (value: string): Participant["gender"] => {
  const normalized = value.trim().toLowerCase();
  if (["female", "f", "эм", "эмэгтэй"].includes(normalized)) return "female";
  if (["male", "m", "эр", "эрэгтэй"].includes(normalized)) return "male";
  if (normalized === "non_binary" || normalized === "non-binary") return "non_binary";
  return "prefer_not_to_say";
};

const parseDelimitedPlayers = (raw: string): Participant[] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/^\uFEFF/, "").trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    throw new Error("Need at least a header row and one data row.");
  }

  const delimiters = ["\t", ",", ";"];
  const looksLikeHeader = (cells: string[]): boolean => {
    const normalized = cells.map((cell) => cell.trim().toLowerCase().replace(/\s+/g, " "));
    const hasName = normalized.some((cell) => cell.includes("participant") || cell.includes("name"));
    const hasGender = normalized.some((cell) => cell.includes("gender") || cell.includes("sex"));
    const hasScore = normalized.some((cell) =>
      cell.includes("avg score") || cell.includes("average score") || cell.includes("average_score") || cell === "avg" || cell === "score"
    );
    return hasName && hasScore && hasGender;
  };

  const headerDetection = lines
    .slice(0, 12)
    .flatMap((line, lineIndex) =>
      delimiters.map((candidate) => {
        const cells = splitWithDelimiter(line, candidate);
        return {
          lineIndex,
          delimiter: candidate,
          cells,
          looksHeader: looksLikeHeader(cells),
          columns: cells.length
        };
      })
    )
    .sort((a, b) => {
      if (a.looksHeader !== b.looksHeader) return a.looksHeader ? -1 : 1;
      if (a.columns !== b.columns) return b.columns - a.columns;
      return a.lineIndex - b.lineIndex;
    })[0];

  if (!headerDetection || !headerDetection.looksHeader) {
    throw new Error("Could not detect CSV header row. Expected columns like Participant, Gender, Avg score.");
  }

  const delimiter = headerDetection.delimiter;
  const headerLineIndex = headerDetection.lineIndex;
  const headers = headerDetection.cells
    .map((h) => h.trim().toLowerCase().replace(/\s+/g, " "));

  const findIndex = (...aliases: string[]): number =>
    headers.findIndex((header) => aliases.some((alias) => header.includes(alias)));

  const idIndex = findIndex("id", "player_id", "rank");
  const nameIndex = findIndex("participant", "name", "player", "player_name");
  const genderIndex = findIndex("gender", "sex");
  const clubIndex = findIndex("club", "team", "division", "rank_group");
  const scoreIndex = findIndex("avg score", "average score", "average_score", "avg", "score");

  if (nameIndex === -1 || scoreIndex === -1) {
    throw new Error("Missing required columns. Expected at least Participant/Name and Avg score.");
  }

  return lines.slice(headerLineIndex + 1).map((line, rowIdx) => {
    const cols = splitWithDelimiter(line, delimiter);
    const scoreRaw = cols[scoreIndex] ?? "0";
    const parsedScore = Number(scoreRaw);
    const division = clubIndex !== -1 ? cols[clubIndex] : undefined;

    const participant: Participant = {
      id: (idIndex !== -1 ? cols[idIndex] : undefined) || `p-${rowIdx + 1}`,
      name: cols[nameIndex] || `Player ${rowIdx + 1}`,
      gender: parseGender(genderIndex !== -1 ? cols[genderIndex] ?? "" : "prefer_not_to_say"),
      averageScore: Number.isFinite(parsedScore) ? parsedScore : 0,
      isAvailable: true
    };

    if (division) {
      participant.division = division;
    }

    return participant;
  });
};

export function GenerationConsole({
  initialPayload,
  initialSection = "import"
}: {
  initialPayload: TeamGenerationRequest;
  initialSection?: SectionKey;
}): JSX.Element {
  const [payload, setPayload] = useState<TeamGenerationRequest>({
    ...initialPayload,
    constraints: {
      ...initialPayload.constraints,
      enforceFemalePerTeam: initialPayload.constraints.enforceFemalePerTeam ?? false,
      femalePerTeam: initialPayload.constraints.femalePerTeam ?? 1,
      strictTeamSize: initialPayload.constraints.strictTeamSize ?? true
    }
  });
  const [iterations, setIterations] = useState(60);
  const [importInput, setImportInput] = useState(pretty(initialPayload));
  const [importError, setImportError] = useState<string>("");
  const [importSummary, setImportSummary] = useState<string>("");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [lastRunId, setLastRunId] = useState<string>("");
  const [latestResult, setLatestResult] = useState<TeamGenerationResult | null>(null);
  const [lockedPlayerIds, setLockedPlayerIds] = useState<string[]>([]);
  const [overrideFromTeamId, setOverrideFromTeamId] = useState<string>("");
  const [overrideToTeamId, setOverrideToTeamId] = useState<string>("");
  const [overrideParticipantId, setOverrideParticipantId] = useState<string>("");
  const [teamCountAuto, setTeamCountAuto] = useState(true);
  const activeSection = initialSection;

  const weightSum = useMemo(() => {
    const w = payload.weights;
    return Number((w.skillWeight + w.experienceWeight + w.roleDiversityWeight + w.genderBalanceWeight).toFixed(4));
  }, [payload.weights]);

  const availablePlayers = useMemo(
    () => payload.participants.filter((player) => player.isAvailable ?? true),
    [payload.participants]
  );
  const femalePlayers = useMemo(
    () => availablePlayers.filter((player) => player.gender === "female"),
    [availablePlayers]
  );
  const malePlayers = useMemo(
    () => availablePlayers.filter((player) => player.gender === "male"),
    [availablePlayers]
  );
  const femalePerTeamRequirement = payload.constraints.enforceFemalePerTeam
    ? Math.max(1, payload.constraints.femalePerTeam ?? 1)
    : 0;

  const capacity = payload.constraints.teamCount * payload.constraints.teamSize;
  const maxTeamsBySize = Math.floor(availablePlayers.length / Math.max(1, payload.constraints.teamSize || 1));
  const maxTeamsByFemaleRule = payload.constraints.enforceFemalePerTeam
    ? Math.floor(femalePlayers.length / Math.max(1, femalePerTeamRequirement))
    : maxTeamsBySize;
  const maxFullTeams = Math.max(0, Math.min(maxTeamsBySize, maxTeamsByFemaleRule));
  const projectedAssigned = maxFullTeams * Math.max(1, payload.constraints.teamSize || 1);
  const projectedLeft = Math.max(0, availablePlayers.length - projectedAssigned);
  const projectedLeftFemale = payload.constraints.enforceFemalePerTeam
    ? Math.max(0, femalePlayers.length - maxFullTeams * femalePerTeamRequirement)
    : Math.min(femalePlayers.length, projectedLeft);
  const projectedLeftMale = Math.max(0, projectedLeft - projectedLeftFemale);
  const neededForOneMore = Math.max(0, payload.constraints.teamSize - projectedLeft);
  const neededFemaleForOneMore = payload.constraints.enforceFemalePerTeam
    ? Math.max(0, femalePerTeamRequirement - projectedLeftFemale)
    : 0;
  const neededMaleForOneMore = Math.max(0, neededForOneMore - neededFemaleForOneMore);

  const setupIssues = useMemo(() => {
    const issues: string[] = [];
    if (payload.constraints.teamSize <= 0) {
      issues.push("Team size must be greater than 0.");
    }
    if (availablePlayers.length < payload.constraints.teamSize) {
      issues.push("Not enough available participants to form one full team.");
    }
    if (payload.constraints.enforceFemalePerTeam && femalePerTeamRequirement > payload.constraints.teamSize) {
      issues.push("Female requirement per team cannot exceed team size.");
    }
    if (payload.constraints.enforceFemalePerTeam && femalePlayers.length < femalePerTeamRequirement) {
      issues.push(
        `Gender requirement is enabled but at least ${femalePerTeamRequirement} female players are required for one team.`
      );
    }
    return issues;
  }, [
    availablePlayers.length,
    femalePerTeamRequirement,
    femalePlayers.length,
    payload.constraints.enforceFemalePerTeam,
    payload.constraints.teamSize
  ]);

  const canRunGeneration = setupIssues.length === 0;

  useEffect(() => {
    if (!teamCountAuto) return;
    setPayload((prev) => {
      if (prev.constraints.teamCount === maxFullTeams) return prev;
      return {
        ...prev,
        constraints: {
          ...prev.constraints,
          teamCount: maxFullTeams
        }
      };
    });
  }, [maxFullTeams, teamCountAuto]);

  const normalizedWeights = useMemo(() => {
    const { skillWeight, experienceWeight, roleDiversityWeight, genderBalanceWeight } = payload.weights;
    const sum = skillWeight + experienceWeight + roleDiversityWeight + genderBalanceWeight;
    if (sum <= 0) {
      return {
        skillWeight: 0.5,
        experienceWeight: 0.2,
        roleDiversityWeight: 0.2,
        genderBalanceWeight: 0.1
      };
    }

    return {
      skillWeight: Number((skillWeight / sum).toFixed(4)),
      experienceWeight: Number((experienceWeight / sum).toFixed(4)),
      roleDiversityWeight: Number((roleDiversityWeight / sum).toFixed(4)),
      genderBalanceWeight: Number((genderBalanceWeight / sum).toFixed(4))
    };
  }, [payload.weights]);

  const setupRecommendation = useMemo(() => {
    if (setupIssues.length === 0) return "Current setup is valid.";

    const suggestedTeamSize = Math.max(2, payload.constraints.teamSize);
    const suggestedTeamCount = Math.max(
      1,
      Math.min(
        Math.floor(availablePlayers.length / suggestedTeamSize),
        payload.constraints.enforceFemalePerTeam
          ? Math.floor(femalePlayers.length / Math.max(1, femalePerTeamRequirement))
          : Number.MAX_SAFE_INTEGER
      )
    );

    return `Try teamSize=${suggestedTeamSize}, expected full teams=${suggestedTeamCount}.`;
  }, [
    availablePlayers.length,
    femalePerTeamRequirement,
    femalePlayers.length,
    payload.constraints.enforceFemalePerTeam,
    payload.constraints.teamSize,
    setupIssues.length
  ]);

  const teams = latestResult?.teams ?? [];
  const groupedTeamRows = teams.map((team, teamIndex) => {
    const teamNumber = Number(team.id.replace(/[^0-9]/g, "")) || teamIndex + 1;
    const members = team.members.map((member) => ({
      playerId: member.id,
      playerName: toTitleCase(playerName(member)),
      gender: member.gender,
      avgScore: member.averageScore ?? member.skillScore ?? 0
    }));
    const teamTotalPotentialScore = members.reduce((sum, member) => sum + member.avgScore, 0);

    return {
      teamId: team.id,
      teamNumber,
      bandClass: teamIndex % 2 === 0 ? "team-group-odd" : "team-group-even",
      teamTotalPotentialScore,
      members
    };
  });
  const teamTotalMetrics = useMemo(() => {
    const totals = groupedTeamRows.map((team) => team.teamTotalPotentialScore);
    if (totals.length === 0) {
      return {
        max: 0,
        min: 0,
        spread: 0,
        stdDev: 0,
        mean: 0
      };
    }

    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const spread = max - min;
    const mean = totals.reduce((sum, value) => sum + value, 0) / totals.length;
    const variance = totals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / totals.length;
    const stdDev = Math.sqrt(variance);

    return {
      max,
      min,
      spread,
      stdDev,
      mean
    };
  }, [groupedTeamRows]);
  const participantsInFromTeam = teams.find((team) => team.id === overrideFromTeamId)?.members ?? [];

  const updateConstraint = <K extends keyof TeamGenerationRequest["constraints"]>(
    key: K,
    value: TeamGenerationRequest["constraints"][K]
  ): void => {
    setPayload((prev) => ({
      ...prev,
      constraints: {
        ...prev.constraints,
        [key]: value
      }
    }));
  };

  const updateWeight = <K extends keyof TeamGenerationRequest["weights"]>(
    key: K,
    value: TeamGenerationRequest["weights"][K]
  ): void => {
    setPayload((prev) => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: value
      }
    }));
  };

  const applyImportedParticipants = (participants: Participant[]): void => {
    const scores = participants.map(playerScore).filter((score) => Number.isFinite(score));
    const importedMin = scores.length ? Math.floor(Math.min(...scores)) : undefined;
    const importedMax = scores.length ? Math.ceil(Math.max(...scores)) : undefined;
    const importedFemaleCount = participants.filter((player) => player.gender === "female").length;

    setPayload((prev) => {
      const constraints = {
        ...prev.constraints
      };

      if (importedMin !== undefined) {
        constraints.minSkillScore = Math.min(prev.constraints.minSkillScore ?? importedMin, importedMin);
      }

      if (importedMax !== undefined) {
        constraints.maxSkillScore = Math.max(prev.constraints.maxSkillScore ?? importedMax, importedMax);
      }

      // Prevent hard-blocked generation when imported data has no female players.
      if (importedFemaleCount === 0) {
        constraints.enforceFemalePerTeam = false;
      }

      return {
        ...prev,
        participants,
        constraints
      };
    });
  };

  const applyImport = (): void => {
    setImportError("");
    setImportSummary("");
    try {
      const parsed = JSON.parse(importInput) as TeamGenerationRequest | Participant[];

      if (Array.isArray(parsed)) {
        applyImportedParticipants(parsed);
        const females = parsed.filter((player) => player.gender === "female").length;
        const males = parsed.filter((player) => player.gender === "male").length;
        setImportSummary(`Imported ${parsed.length} players from JSON (female: ${females}, male: ${males}).`);
        return;
      }

      if (!parsed.participants || !parsed.constraints || !parsed.weights) {
        setImportError("Import must be either a player array or full generation request object.");
        return;
      }

      setPayload({
        ...parsed,
        constraints: {
          ...parsed.constraints,
          femalePerTeam: parsed.constraints.femalePerTeam ?? 1,
          strictTeamSize: parsed.constraints.strictTeamSize ?? true
        }
      });
      const females = parsed.participants.filter((player) => player.gender === "female").length;
      const males = parsed.participants.filter((player) => player.gender === "male").length;
      setImportSummary(`Imported ${parsed.participants.length} players from JSON request (female: ${females}, male: ${males}).`);
    } catch {
      try {
        const participants = parseDelimitedPlayers(importInput);
        applyImportedParticipants(participants);
        const females = participants.filter((player) => player.gender === "female").length;
        const males = participants.filter((player) => player.gender === "male").length;
        const unknown = participants.length - females - males;
        setImportSummary(
          `Imported ${participants.length} players from table text (female: ${females}, male: ${males}, unknown: ${unknown}).`
        );
      } catch {
        setImportError("Invalid JSON format. If using CSV/table, click Parse CSV/TSV Table or upload file.");
      }
    }
  };

  const applyTableImport = (): void => {
    setImportError("");
    setImportSummary("");
    try {
      const participants = parseDelimitedPlayers(importInput);
      applyImportedParticipants(participants);
      const females = participants.filter((player) => player.gender === "female").length;
      const males = participants.filter((player) => player.gender === "male").length;
      const unknown = participants.length - females - males;
      setImportSummary(
        `Parsed ${participants.length} players from table text (female: ${females}, male: ${males}, unknown: ${unknown}).`
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to parse table input.");
    }
  };

  const importFromFile = async (file: File): Promise<void> => {
    const bytes = await file.arrayBuffer();
    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    setImportInput(text);
    setImportSummary("");
    try {
      const participants = parseDelimitedPlayers(text);
      applyImportedParticipants(participants);
      setImportError("");
      const females = participants.filter((player) => player.gender === "female").length;
      const males = participants.filter((player) => player.gender === "male").length;
      const unknown = participants.length - females - males;
      setImportSummary(
        `Loaded ${participants.length} players from file ${file.name} (female: ${females}, male: ${males}, unknown: ${unknown}).`
      );
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Unable to parse file.");
    }
  };

  const runGenerate = async (): Promise<void> => {
    if (setupIssues.length > 0) {
      setOutput(`Cannot generate yet:\n- ${setupIssues.join("\n- ")}`);
      return;
    }
    setLoading(true);
    try {
      const requestPayload = {
        ...payload,
        weights: normalizedWeights
      };
      const result = (await api.generateTeams(requestPayload)) as GenerationApiResponse;
      setLastRunId(result.runId);
      setLatestResult(result.result);
      setLockedPlayerIds([]);
      setOutput(
        weightSum === 1
          ? pretty(result)
          : `Weights auto-normalized to sum=1 before generation.\n\n${pretty(result)}`
      );
    } catch (error) {
      setOutput(String(error));
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async (): Promise<void> => {
    if (setupIssues.length > 0) {
      setOutput(`Cannot run simulation yet:\n- ${setupIssues.join("\n- ")}`);
      return;
    }
    setLoading(true);
    try {
      const simulationPayload: SimulationRequest = {
        ...payload,
        weights: normalizedWeights,
        iterations
      };
      const result = (await api.runSimulation(simulationPayload)) as SimulationApiResponse;
      setLastRunId(result.runId);
      setLatestResult(result.result.bestResult);
      setOutput(
        weightSum === 1
          ? pretty(result)
          : `Weights auto-normalized to sum=1 before simulation.\n\n${pretty(result)}`
      );
    } catch (error) {
      setOutput(String(error));
    } finally {
      setLoading(false);
    }
  };

  const runManualOverride = async (): Promise<void> => {
    if (!latestResult) {
      setOutput("Generate teams first.");
      return;
    }

    if (!overrideFromTeamId || !overrideToTeamId || !overrideParticipantId) {
      setOutput("Select source team, target team, and player to move.");
      return;
    }

    setLoading(true);
    try {
      const overridePayload: ManualOverrideRequest = {
        baseResult: latestResult,
        operations: [
          {
            type: "move",
            fromTeamId: overrideFromTeamId,
            participantId: overrideParticipantId,
            toTeamId: overrideToTeamId
          }
        ]
      };
      const result = (await api.applyOverride(overridePayload, payload.constraints.enforceFemalePerTeam)) as GenerationApiResponse;
      setLastRunId(result.runId);
      setLatestResult(result.result);
      setOutput(pretty(result));
    } catch (error) {
      setOutput(String(error));
    } finally {
      setLoading(false);
    }
  };

  const runRebalance = async (): Promise<void> => {
    if (!latestResult) {
      setOutput("Generate teams first before rebalancing.");
      return;
    }

    setLoading(true);
    try {
      const rebalancePayloadBase = {
        baseResult: latestResult,
        constraints: payload.constraints,
        weights: payload.weights,
        lockedPlayerIds
      };
      const rebalancePayload: RebalanceRequest =
        payload.seed !== undefined
          ? { ...rebalancePayloadBase, seed: payload.seed }
          : rebalancePayloadBase;
      const result = (await api.rebalanceTeams(rebalancePayload)) as GenerationApiResponse;
      setLastRunId(result.runId);
      setLatestResult(result.result);
      setOutput(pretty(result));
    } catch (error) {
      setOutput(String(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = (playerId: string): void => {
    setLockedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const autoConfigureSetup = (): void => {
    const teamSize = Math.max(2, payload.constraints.teamSize);
    const teamCount = Math.max(0, maxFullTeams);

    updateConstraint("teamSize", teamSize);
    updateConstraint("teamCount", teamCount);
    setTeamCountAuto(true);
  };

  return (
    <section className="grid" style={{ gap: 16 }}>
      {activeSection === "generate" ? (
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Core Workflow</h3>
        <p style={{ color: "var(--muted)", lineHeight: 1.5 }}>
          Import player data and click Generate Teams. The app auto-normalizes weights and focuses on
          minimizing deviation of team total potential scores using available players.
        </p>
      </article>
      ) : null}

      {activeSection === "import" ? (
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Data Import</h3>
        <p style={{ color: "var(--muted)" }}>
          Import participants from CSV or TSV file.
        </p>
        <label style={{ display: "block", marginBottom: 8 }}>
          <strong>Import from CSV/TSV file:</strong>
          <input
            style={{ display: "block", marginTop: 6 }}
            type="file"
            accept=".csv,.tsv,.txt"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void importFromFile(file);
              }
            }}
          />
        </label>
        {importSummary ? <p style={{ color: "var(--brand)", marginTop: 8 }}>{importSummary}</p> : null}
        {importError ? <p style={{ color: "var(--danger)", marginTop: 8 }}>{importError}</p> : null}
      </article>
      ) : null}

      {activeSection === "settings" ? (
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Team Settings</h3>
        <div className="grid two">
          <label>
            Team count
            <input
              type="number"
              min={0}
              max={50}
              value={payload.constraints.teamCount}
              onChange={(e) => {
                setTeamCountAuto(false);
                updateConstraint("teamCount", Number(e.target.value));
              }}
            />
            <span style={{ display: "block", marginTop: 6, color: "var(--muted)", fontSize: "0.85rem" }}>
              Auto max: {maxFullTeams}
            </span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <input
                type="checkbox"
                checked={teamCountAuto}
                onChange={(e) => {
                  const enabled = e.target.checked;
                  setTeamCountAuto(enabled);
                  if (enabled) updateConstraint("teamCount", maxFullTeams);
                }}
              />
              <span>Auto-calculate team count</span>
            </label>
          </label>
          <label>
            Team size
            <input type="number" min={2} max={10} value={payload.constraints.teamSize} onChange={(e) => updateConstraint("teamSize", Number(e.target.value))} />
          </label>
          <label>
            Max allowed score spread
            <input type="number" min={0} max={100} value={payload.constraints.maxAllowedScoreSpread} onChange={(e) => updateConstraint("maxAllowedScoreSpread", Number(e.target.value))} />
          </label>
          <label>
            Min skill score filter
            <input
              type="number"
              min={0}
              max={300}
              value={payload.constraints.minSkillScore ?? 0}
              onChange={(e) => updateConstraint("minSkillScore", Number(e.target.value))}
            />
          </label>
          <label>
            Max skill score filter
            <input
              type="number"
              min={0}
              max={300}
              value={payload.constraints.maxSkillScore ?? 300}
              onChange={(e) => updateConstraint("maxSkillScore", Number(e.target.value))}
            />
          </label>
          <label>
            Randomization factor
            <input type="number" step={0.01} min={0} max={0.25} value={payload.constraints.randomizationFactor} onChange={(e) => updateConstraint("randomizationFactor", Number(e.target.value))} />
          </label>
          <label>
            Optimization iterations
            <input type="number" min={0} max={300} value={payload.constraints.optimizationIterations} onChange={(e) => updateConstraint("optimizationIterations", Number(e.target.value))} />
          </label>
        </div>

        <label style={{ display: "block", marginTop: 10 }}>
          Gender requirement
          <select
            value={payload.constraints.enforceFemalePerTeam ? "yes" : "no"}
            onChange={(e) => updateConstraint("enforceFemalePerTeam", e.target.value === "yes")}
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
        {payload.constraints.enforceFemalePerTeam ? (
          <label style={{ display: "block", marginTop: 6 }}>
            Females per team
            <input
              type="number"
              min={1}
              max={payload.constraints.teamSize}
              value={Math.max(1, payload.constraints.femalePerTeam ?? 1)}
              onChange={(e) => updateConstraint("femalePerTeam", Math.max(1, Number(e.target.value) || 1))}
            />
          </label>
        ) : null}

        <h4 style={{ marginBottom: 8 }}>Weights</h4>
        <div className="grid two">
          <label>
            Skill
            <input type="number" min={0} max={1} step={0.01} value={payload.weights.skillWeight} onChange={(e) => updateWeight("skillWeight", Number(e.target.value))} />
          </label>
          <label>
            Handicap impact
            <input type="number" min={0} max={1} step={0.01} value={payload.weights.experienceWeight} onChange={(e) => updateWeight("experienceWeight", Number(e.target.value))} />
          </label>
          <label>
            Division/history
            <input type="number" min={0} max={1} step={0.01} value={payload.weights.roleDiversityWeight} onChange={(e) => updateWeight("roleDiversityWeight", Number(e.target.value))} />
          </label>
          <label>
            Female balance
            <input type="number" min={0} max={1} step={0.01} value={payload.weights.genderBalanceWeight} onChange={(e) => updateWeight("genderBalanceWeight", Number(e.target.value))} />
          </label>
        </div>
        <p style={{ color: weightSum === 1 ? "var(--muted)" : "var(--danger)", marginTop: 8 }}>
          Weight sum: {weightSum} (must be 1)
        </p>
      </article>
      ) : null}

      {activeSection === "setup" ? (
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Tournament Setup Check</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Set team rules first, then generate. The app checks your imported player pool before running.
        </p>
        <div className="grid two">
          <p style={{ margin: 0 }}>Available players: <strong>{availablePlayers.length}</strong></p>
          <p style={{ margin: 0 }}>Female: <strong>{femalePlayers.length}</strong></p>
          <p style={{ margin: 0 }}>Male: <strong>{malePlayers.length}</strong></p>
          <p style={{ margin: 0 }}>Configured capacity: <strong>{capacity}</strong></p>
          <p style={{ margin: 0 }}>Max teams by size: <strong>{maxTeamsBySize}</strong></p>
          <p style={{ margin: 0 }}>Max teams by female rule: <strong>{maxTeamsByFemaleRule}</strong></p>
          <p style={{ margin: 0 }}>Max full teams (projected): <strong>{maxFullTeams}</strong></p>
          <p style={{ margin: 0 }}>Projected left without team: <strong>{projectedLeft}</strong></p>
          <p style={{ margin: 0 }}>Projected left female: <strong>{projectedLeftFemale}</strong></p>
          <p style={{ margin: 0 }}>Projected left male: <strong>{projectedLeftMale}</strong></p>
          <p style={{ margin: 0 }}>Need players for +1 full team: <strong>{neededForOneMore}</strong></p>
          <p style={{ margin: 0 }}>Need female for +1 full team: <strong>{neededFemaleForOneMore}</strong></p>
          <p style={{ margin: 0 }}>Need male for +1 full team: <strong>{neededMaleForOneMore}</strong></p>
        </div>
        {setupIssues.length > 0 ? (
          <div style={{ marginTop: 8, color: "var(--danger)" }}>
            {setupIssues.map((issue) => (
              <p key={issue} style={{ margin: "4px 0" }}>- {issue}</p>
            ))}
            <p style={{ margin: "8px 0", color: "var(--ink)" }}>
              Recommended: {setupRecommendation}
            </p>
            <button className="btn ghost" onClick={autoConfigureSetup} disabled={loading}>
              Auto Configure Valid Setup
            </button>
          </div>
        ) : (
          <p style={{ marginTop: 8, color: "var(--brand)" }}>Setup is valid for generation.</p>
        )}
      </article>
      ) : null}

      {activeSection === "generate" ? (
      <>
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Actions</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <button className="btn" onClick={runGenerate} disabled={loading}>Generate Teams</button>
          <button className="btn ghost" onClick={runSimulation} disabled={loading}>Run Simulation</button>
        </div>
        {!canRunGeneration ? (
          <div style={{ color: "var(--danger)", marginTop: 0 }}>
            <p style={{ marginTop: 0, marginBottom: 6 }}>
              Generation is currently blocked by setup checks:
            </p>
            {setupIssues.map((issue) => (
              <p key={issue} style={{ margin: "2px 0" }}>- {issue}</p>
            ))}
          </div>
        ) : null}
        <label>
          Simulation iterations
          <input style={{ marginLeft: 10 }} type="number" min={1} max={5000} value={iterations} onChange={(event) => setIterations(Number(event.target.value))} />
        </label>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Last run ID: {lastRunId || "n/a"}
        </p>
        {output ? (
          <pre style={{ marginTop: 10, maxHeight: 200, overflow: "auto" }}>{output}</pre>
        ) : null}
      </article>
      
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Generated Teams Table</h3>
        {latestResult ? (
          <>
            <p style={{ color: "var(--muted)", marginTop: 0 }}>
              Fairness score: {latestResult.fairness.fairnessScore} | Avg deviation: {latestResult.fairness.averageDeviation} | Std deviation: {latestResult.fairness.standardDeviation}
            </p>
            <div className="grid two" style={{ marginBottom: 10 }}>
              <p style={{ margin: 0 }}>Max total potential score: <strong>{teamTotalMetrics.max.toFixed(2)}</strong></p>
              <p style={{ margin: 0 }}>Min total potential score: <strong>{teamTotalMetrics.min.toFixed(2)}</strong></p>
              <p style={{ margin: 0 }}>Total score spread: <strong>{teamTotalMetrics.spread.toFixed(2)}</strong></p>
              <p style={{ margin: 0 }}>Total score std dev: <strong>{teamTotalMetrics.stdDev.toFixed(2)}</strong></p>
            </div>
            {latestResult.planning ? (
              <div className="grid two" style={{ marginBottom: 10 }}>
                <p style={{ margin: 0 }}>Generated full teams: <strong>{latestResult.planning.generatedTeams}</strong></p>
                <p style={{ margin: 0 }}>Team size: <strong>{latestResult.planning.teamSize}</strong></p>
                <p style={{ margin: 0 }}>Assigned participants: <strong>{latestResult.planning.assignedParticipants}</strong></p>
                <p style={{ margin: 0 }}>Left without team: <strong>{latestResult.planning.unassignedParticipants}</strong></p>
                <p style={{ margin: 0 }}>Left female: <strong>{latestResult.planning.unassignedFemale}</strong></p>
                <p style={{ margin: 0 }}>Left male: <strong>{latestResult.planning.unassignedMale}</strong></p>
                <p style={{ margin: 0 }}>Need players for +1 full team: <strong>{latestResult.planning.neededForOneMoreFullTeam}</strong></p>
                <p style={{ margin: 0 }}>Need female for +1 full team: <strong>{latestResult.planning.neededFemaleForOneMoreFullTeam}</strong></p>
                <p style={{ margin: 0 }}>Need male for +1 full team: <strong>{latestResult.planning.neededMaleForOneMoreFullTeam}</strong></p>
              </div>
            ) : null}
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Team #</th>
                    <th>Player ID</th>
                    <th>Player name</th>
                    <th>Gender</th>
                    <th>Player average score</th>
                    <th>Team Total Potential Score</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTeamRows.map((team) =>
                    team.members.map((member, memberIndex) => (
                      <tr
                        key={`${team.teamId}-${member.playerId}`}
                        className={`${team.bandClass}${memberIndex === 0 ? " team-group-start" : ""}`}
                      >
                        {memberIndex === 0 ? (
                          <td className="team-span-cell" rowSpan={team.members.length}>
                            {team.teamNumber}
                          </td>
                        ) : null}
                        <td>{member.playerId}</td>
                        <td>{member.playerName}</td>
                        <td>{member.gender}</td>
                        <td>{Number(member.avgScore).toFixed(2)}</td>
                        {memberIndex === 0 ? (
                          <td className="team-span-cell" rowSpan={team.members.length}>
                            {team.teamTotalPotentialScore.toFixed(2)}
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {latestResult.warnings.length > 0 ? (
              <div style={{ marginTop: 8, color: "var(--danger)" }}>
                {latestResult.warnings.map((warning) => (
                  <p key={warning} style={{ margin: "4px 0" }}>- {warning}</p>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <p style={{ color: "var(--muted)" }}>No generated team data yet. Click Generate Teams or Simulation.</p>
        )}
      </article>
      </>
      ) : null}

      {activeSection === "edit" ? (
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Manual Move Options</h3>
          <div className="grid two">
            <label>
              Source team
              <select value={overrideFromTeamId} onChange={(event) => { setOverrideFromTeamId(event.target.value); setOverrideParticipantId(""); }}>
                <option value="">Select source team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <label>
              Target team
              <select value={overrideToTeamId} onChange={(event) => setOverrideToTeamId(event.target.value)}>
                <option value="">Select target team</option>
                {teams.filter((team) => team.id !== overrideFromTeamId).map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: "block", marginTop: 8 }}>
            Player
            <select value={overrideParticipantId} onChange={(event) => setOverrideParticipantId(event.target.value)}>
              <option value="">Select player</option>
              {participantsInFromTeam.map((participant) => (
                <option key={participant.id} value={participant.id}>{playerName(participant)} ({participant.id})</option>
              ))}
            </select>
          </label>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={runManualOverride} disabled={loading || !latestResult}>Manual Move</button>
          </div>
        </article>
      ) : null}

      {activeSection === "edit" ? (
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Lock Players Before Rebalance</h3>
          {teams.length === 0 ? <p style={{ color: "var(--muted)" }}>Generate teams to lock players.</p> : null}
          {teams.map((team) => (
            <div key={team.id} style={{ marginBottom: 12 }}>
              <strong>{team.name}</strong>
              {team.members.map((player) => (
                <label key={player.id} style={{ display: "block", marginTop: 4 }}>
                  <input
                    type="checkbox"
                    checked={lockedPlayerIds.includes(player.id)}
                    onChange={() => toggleLock(player.id)}
                  />
                  <span style={{ marginLeft: 8 }}>{playerName(player)} ({player.gender})</span>
                </label>
              ))}
            </div>
          ))}
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={runRebalance} disabled={loading || !latestResult}>Rebalance Unlocked</button>
          </div>
        </article>
      ) : null}

      {activeSection === "export" ? (
      <article className="card">
        <h3 style={{ marginTop: 0 }}>Export Data</h3>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Export current run as Excel or PDF after generating teams.
        </p>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Last run ID: {lastRunId || "n/a"}
        </p>
        {lastRunId ? (
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a className="btn ghost" href={api.exportRunUrl("excel", lastRunId)} target="_blank" rel="noreferrer">Export Excel</a>
            <a className="btn ghost" href={api.exportRunUrl("pdf", lastRunId)} target="_blank" rel="noreferrer">Export PDF</a>
          </div>
        ) : (
          <p style={{ marginTop: 8, color: "var(--danger)" }}>Generate teams first to enable export.</p>
        )}
      </article>
      ) : null}
    </section>
  );
}
