import { DashboardPanel } from "../../components/DashboardPanel";
import { api } from "../../lib/api";

export default async function AdminDashboardPage(): Promise<JSX.Element> {
  const dashboardData = await api.getDashboard().catch(() => ({
    summary: {
      averageFairnessScore: 0,
      bestFairnessScore: 0,
      worstFairnessScore: 0,
      validGenderDistributionRate: 0
    },
    runs: []
  }));

  return <DashboardPanel data={dashboardData as never} />;
}
