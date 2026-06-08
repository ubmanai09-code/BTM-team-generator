type RunAnalytics = {
  id: string;
  mode: string;
  fairnessScore: number;
  averageDeviation: number;
  standardDeviation: number;
  highestLowestGap: number;
  genderDistributionValid: boolean;
  createdAt: string;
};

type DashboardData = {
  summary: {
    averageFairnessScore: number;
    bestFairnessScore: number;
    worstFairnessScore: number;
    validGenderDistributionRate: number;
  };
  runs: RunAnalytics[];
};

export function DashboardPanel({ data }: { data: DashboardData }): JSX.Element {
  return (
    <section className="grid" style={{ gap: 16 }}>
      <div className="grid two">
        <article className="card">
          <h3>Average Fairness</h3>
          <p className="metric">{data.summary.averageFairnessScore}</p>
        </article>
        <article className="card">
          <h3>Best vs Worst</h3>
          <p className="metric">
            {data.summary.bestFairnessScore} / {data.summary.worstFairnessScore}
          </p>
        </article>
        <article className="card">
          <h3>Gender Distribution Validity</h3>
          <p className="metric">{Math.round(data.summary.validGenderDistributionRate * 100)}%</p>
        </article>
      </div>

      <article className="card">
        <h3 style={{ marginTop: 0 }}>Recent Runs</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Mode</th>
              <th>Fairness</th>
              <th>Avg Dev</th>
              <th>Std Dev</th>
              <th>Gap</th>
              <th>Gender Valid</th>
            </tr>
          </thead>
          <tbody>
            {data.runs.map((run) => (
              <tr key={run.id}>
                <td>{run.id.slice(0, 6)}</td>
                <td>{run.mode}</td>
                <td>{run.fairnessScore}</td>
                <td>{run.averageDeviation}</td>
                <td>{run.standardDeviation}</td>
                <td>{run.highestLowestGap}</td>
                <td>{run.genderDistributionValid ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </section>
  );
}
