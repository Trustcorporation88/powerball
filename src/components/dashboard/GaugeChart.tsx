import { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GaugeChartProps {
  title: string;
  value: number;
  target: number;
  unit?: string;
  color?: string;
  goal?: "maximize" | "minimize";
}

export default function GaugeChart({
  title,
  value,
  target,
  unit = "R$",
  color = "#059669",
  goal = "maximize",
}: GaugeChartProps) {
  const percentage = useMemo(() => {
    if (target <= 0) return 0;

    if (goal === "minimize") {
      if (value <= 0) return 100;
      return Math.max(0, Math.min((target / value) * 100, 100));
    }

    return Math.max(0, Math.min((value / target) * 100, 100));
  }, [goal, value, target]);

  const angle = useMemo(() => percentage * 1.8, [percentage]);

  const isGoalMet = goal === "minimize" ? value <= target : value >= target;
  const isNearGoal = isGoalMet || percentage >= 90;

  const glowColor = color;

  const cx = 100;
  const cy = 100;
  const r = 75;
  const strokeWidth = 16;

  const startX = cx - r;
  const startY = cy;
  const endArc = useMemo(() => {
    const rad = ((180 - angle) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy - r * Math.sin(rad),
    };
  }, [angle, cx, cy, r]);

  const largeArcFlag = angle > 180 ? 1 : 0;

  const pathD = useMemo(() => {
    return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArcFlag} 0 ${endArc.x} ${endArc.y}`;
  }, [startX, startY, r, largeArcFlag, endArc]);

  const formatValue = (v: number) => {
    if (unit === "%") {
      return `${v.toFixed(1)}%`;
    }

    if (unit === "R$") {
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }

    return `${unit} ${v.toLocaleString("pt-BR")}`;
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[200px] h-[130px]">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <defs>
            <filter id={`glow-${title.replace(/\s/g, "")}`}>
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          <motion.path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            filter={isNearGoal ? `url(#glow-${title.replace(/\s/g, "")})` : undefined}
            style={{
              filter: isNearGoal
                ? `drop-shadow(0 0 6px ${glowColor})`
                : undefined,
            }}
          />

          <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={color}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1 pointer-events-none">
          <motion.span
            className="text-2xl font-bold text-slate-800 leading-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {percentage.toFixed(0)}%
          </motion.span>
          <span className="text-[10px] text-slate-500 mt-0.5">
            {formatValue(value)} / meta {formatValue(target)}
          </span>
        </div>
      </div>

      <p className="text-sm font-medium text-slate-700 mt-1">{title}</p>

      <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          Meta: {formatValue(target)}
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          Atual: {formatValue(value)}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "mt-2 px-3 py-1 rounded-full text-xs font-semibold",
          isGoalMet
            ? "bg-emerald-100 text-emerald-700"
            : goal === "minimize"
              ? "bg-rose-100 text-rose-700"
              : "bg-amber-100 text-amber-700"
        )}
      >
        {isGoalMet ? "Meta atingida!" : goal === "minimize" ? "Acima da meta" : "Abaixo da meta"}
      </motion.div>
    </div>
  );
}
