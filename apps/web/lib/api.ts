import type {
  ExportFormat,
  ManualOverrideRequest,
  RebalanceRequest,
  SimulationRequest,
  TeamGenerationRequest
} from "@btm/shared";

const API_BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000"
    : process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api/proxy";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorPayload = await response.text();
    throw new Error(errorPayload || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboard: () => apiFetch<{ summary: Record<string, number>; runs: unknown[] }>("/v1/teams/analytics/dashboard"),
  getExampleDataset: () => apiFetch<TeamGenerationRequest>("/v1/datasets/example"),
  generateTeams: (payload: TeamGenerationRequest) =>
    apiFetch("/v1/teams/generate", { method: "POST", body: JSON.stringify(payload) }),
  runSimulation: (payload: SimulationRequest) =>
    apiFetch("/v1/teams/simulate", { method: "POST", body: JSON.stringify(payload) }),
  applyOverride: (payload: ManualOverrideRequest, enforceFemalePerTeam: boolean) =>
    apiFetch(`/v1/teams/manual-override?enforceFemalePerTeam=${String(enforceFemalePerTeam)}`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  rebalanceTeams: (payload: RebalanceRequest) =>
    apiFetch("/v1/teams/rebalance", { method: "POST", body: JSON.stringify(payload) }),
  exportRunUrl: (format: ExportFormat, runId: string) => `${API_BASE}/v1/teams/export/${format}/${runId}`
};
