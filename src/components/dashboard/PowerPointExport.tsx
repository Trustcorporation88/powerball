import { Presentation } from "lucide-react";
import { ProFeatureButton } from "@/components/ProFeature";
import { KpiData } from "@/hooks/useDashboardData";

interface CategoryRow {
  name: string;
  value: number;
  percentage: number;
}

interface PowerPointExportProps {
  projectName: string;
  kpis: KpiData;
  categoryData: CategoryRow[];
  chartRefs?: React.RefObject<HTMLDivElement>[];
}

export default function PowerPointExport({
  projectName,
  kpis,
  categoryData,
  chartRefs,
}: PowerPointExportProps) {
  void projectName;
  void kpis;
  void categoryData;
  void chartRefs;

  return <ProFeatureButton label="PowerPoint" icon={Presentation} />;
}
