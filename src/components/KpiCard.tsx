import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ReactNode;
  color: "emerald" | "blue" | "amber" | "rose" | "violet";
}

const colorMap = {
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

const iconBgMap = {
  emerald: "bg-emerald-100",
  blue: "bg-blue-100",
  amber: "bg-amber-100",
  rose: "bg-rose-100",
  violet: "bg-violet-100",
};

export const KpiCard = ({ title, value, subtitle, trend, trendValue, icon, color }: KpiCardProps) => {
  return (
    <div className={cn("rounded-xl border p-5 transition-shadow hover:shadow-md", colorMap[color])}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs opacity-70">{subtitle}</p>}
          {trend && trendValue && (
            <div className="flex items-center gap-1 text-xs font-medium">
              {trend === "up" && <TrendingUp className="w-3.5 h-3.5" />}
              {trend === "down" && <TrendingDown className="w-3.5 h-3.5" />}
              {trend === "neutral" && <Minus className="w-3.5 h-3.5" />}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={cn("p-2.5 rounded-lg", iconBgMap[color])}>{icon}</div>
      </div>
    </div>
  );
};