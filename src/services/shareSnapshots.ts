import { getShare, saveShare } from "./db";
import type { CategoryData, ComparisonData, CostCenterData, DailyData, KpiData, MonthlyData } from "@/hooks/useDashboardData";
import type { Transaction } from "@/contexts/AppContext";

export interface SharedDashboardSnapshot {
  projectName: string;
  createdAt: string;
  transactions: Transaction[];
  kpis: KpiData;
  monthlyData: MonthlyData[];
  categoryData: CategoryData[];
  costCenterData: CostCenterData[];
  filters: Record<string, unknown>;
  comparison: ComparisonData | null;
}

export async function createShareSnapshot(snapshot: SharedDashboardSnapshot): Promise<string> {
  const token = crypto.randomUUID().slice(0, 8);

  await saveShare({
    token,
    createdAt: snapshot.createdAt,
    projectName: snapshot.projectName,
    snapshotJson: JSON.stringify(snapshot),
  });

  return token;
}

export async function getShareSnapshot(token: string): Promise<SharedDashboardSnapshot | null> {
  const snapshot = await getShare(token);
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(snapshot.snapshotJson) as SharedDashboardSnapshot;
  } catch (error) {
    console.warn(`Failed to parse shared snapshot "${token}"`, error);
    return null;
  }
}

