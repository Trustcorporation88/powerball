import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface MapDataPoint {
  name: string;
  lat: number;
  lng: number;
  value: number;
}

interface MapChartProps {
  title: string;
  data: MapDataPoint[];
}

function latLngToPoint(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercY = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercY * height) / (2 * Math.PI);
  return { x, y };
}

const valueColor = (v: number, min: number, max: number) => {
  const range = max - min || 1;
  const t = (v - min) / range;
  if (t < 0.33) return "#3b82f6";
  if (t < 0.66) return "#f59e0b";
  return "#ef4444";
};

export default function MapChart({ title, data }: MapChartProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    name: string;
    value: number;
  } | null>(null);

  const width = 800;
  const height = 500;

  const { minVal, maxVal, points } = useMemo(() => {
    if (!data.length) return { minVal: 0, maxVal: 0, points: [] };
    const values = data.map((d) => d.value);
    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const pts = data.map((d) => ({
      ...d,
      ...latLngToPoint(d.lat, d.lng, width, height),
    }));
    return { minVal: minV, maxVal: maxV, points: pts };
  }, [data]);

  const radiusScale = (v: number) => {
    const range = maxVal - minVal || 1;
    const t = (v - minVal) / range;
    return 5 + t * 20;
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (!data.length) {
    return (
      <Card className="border-slate-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 text-center py-16">
            Nenhum dado geográfico disponível
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative overflow-hidden" style={{ paddingBottom: "62.5%" }}>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect width={width} height={height} fill="#f1f5f9" rx={4} />

            {[-60, -30, 0, 30, 60].map((lat) => {
              const y = height / 2 - (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 180 / 2)) * height) / (2 * Math.PI);
              return (
                <line
                  key={`lat-${lat}`}
                  x1={0}
                  y1={y}
                  x2={width}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                />
              );
            })}
            {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map((lng) => {
              const x = ((lng + 180) / 360) * width;
              return (
                <line
                  key={`lng-${lng}`}
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={height}
                  stroke="#e2e8f0"
                  strokeWidth={0.5}
                  strokeDasharray="4 4"
                />
              );
            })}

            {points.map((pt, i) => (
              <motion.g
                key={pt.name}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={radiusScale(pt.value)}
                  fill={valueColor(pt.value, minVal, maxVal)}
                  fillOpacity={0.6}
                  stroke={valueColor(pt.value, minVal, maxVal)}
                  strokeWidth={1.5}
                  className="cursor-pointer transition-all hover:fill-opacity-80"
                  onMouseEnter={(e) => {
                    const rect = (
                      e.currentTarget.closest("svg") as SVGSVGElement
                    ).getBoundingClientRect();
                    setTooltip({
                      x: pt.x * (rect.width / width) + rect.left,
                      y: pt.y * (rect.height / height) + rect.top - 10,
                      name: pt.name,
                      value: pt.value,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
                <text
                  x={pt.x}
                  y={pt.y + radiusScale(pt.value) + 14}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#475569"
                  fontWeight={500}
                >
                  {pt.name}
                </text>
              </motion.g>
            ))}
          </svg>
        </div>

        {tooltip && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed z-50 bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-xs font-semibold text-slate-800">{tooltip.name}</p>
            <p className="text-xs text-slate-600">
              {formatCurrency(tooltip.value)}
            </p>
          </motion.div>
        )}

        <div className="flex items-center justify-center gap-4 py-3 px-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-[10px] text-slate-500">Baixo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-[10px] text-slate-500">Médio</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-[10px] text-slate-500">Alto</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
