import { useEffect, useState } from "react";
import { X, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DashboardFiltersProps {
  categories: string[];
  costCenters: string[];
  filters: {
    period: string;
    category: string;
    costCenter: string;
    search: string;
  };
  onChange: (filters: { period: string; category: string; costCenter: string; search: string }) => void;
}

const periods = [
  { id: "all", label: "Todo Período" },
  { id: "today", label: "Hoje" },
  { id: "7days", label: "Últimos 7 dias" },
  { id: "30days", label: "Últimos 30 dias" },
  { id: "thisMonth", label: "Este Mês" },
  { id: "thisQuarter", label: "Este Trimestre" },
  { id: "thisYear", label: "Este Ano" },
];

export const DashboardFilters = ({ categories, costCenters, filters, onChange }: DashboardFiltersProps) => {
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const activeCount = [
    filters.period !== "all",
    filters.category !== "all",
    filters.costCenter !== "all",
    filters.search !== "",
  ].filter(Boolean).length;

  const handleSearch = () => {
    onChange({ ...filters, search: localSearch });
  };

  const clearAll = () => {
    setLocalSearch("");
    onChange({ period: "all", category: "all", costCenter: "all", search: "" });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Filtros</span>
            {activeCount > 0 && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                {activeCount} ativo{activeCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} className="h-7 text-xs text-slate-500">
              <X className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-2">Período</p>
            <div className="flex flex-wrap gap-1.5">
              {periods.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onChange({ ...filters, period: p.id })}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    filters.period === p.id
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Categoria</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                <button
                  onClick={() => onChange({ ...filters, category: "all" })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                    filters.category === "all"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Todas
                </button>
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ ...filters, category: c })}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                      filters.category === c
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">Centro de Custo</p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                <button
                  onClick={() => onChange({ ...filters, costCenter: "all" })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                    filters.costCenter === "all"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                  )}
                >
                  Todos
                </button>
                {costCenters.map((c) => (
                  <button
                    key={c}
                    onClick={() => onChange({ ...filters, costCenter: c })}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                      filters.costCenter === c
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input
                placeholder="Buscar em descrição, categoria, centro de custo..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={handleSearch}>
              Buscar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
