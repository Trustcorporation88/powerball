import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Transaction } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface TransactionsTableProps {
  transactions: Transaction[];
  onRowClick?: (transaction: Transaction) => void;
}

type SortKey = "date" | "description" | "category" | "costCenter" | "value";
type SortDir = "asc" | "desc";

export const TransactionsTable = ({ transactions, onRowClick }: TransactionsTableProps) => {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(0);
  };

  const sorted = [...transactions].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date": cmp = a.date.localeCompare(b.date); break;
      case "description": cmp = a.description.localeCompare(b.description); break;
      case "category": cmp = a.category.localeCompare(b.category); break;
      case "costCenter": cmp = a.costCenter.localeCompare(b.costCenter); break;
      case "value": cmp = a.value - b.value; break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const maxValue = Math.max(...transactions.map(t => Math.abs(t.value)), 1);

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-slate-300" />;
    return sortDir === "asc" ? <ArrowUp className="w-3 h-3 text-emerald-600" /> : <ArrowDown className="w-3 h-3 text-emerald-600" />;
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg">Lançamentos</CardTitle>
        <span className="text-xs text-slate-400">{transactions.length} registros</span>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {[
                  { key: "date" as SortKey, label: "Data" },
                  { key: "description" as SortKey, label: "Descrição" },
                  { key: "category" as SortKey, label: "Categoria" },
                  { key: "costCenter" as SortKey, label: "Centro de Custo" },
                  { key: "value" as SortKey, label: "Valor" },
                ].map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-3 py-2.5 text-left font-medium text-slate-700 text-xs cursor-pointer hover:bg-slate-100 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => {
                const barWidth = `${(Math.abs(t.value) / maxValue) * 100}%`;
                return (
                  <tr
                    key={t.id}
                    className="border-b last:border-0 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => onRowClick?.(t)}
                  >
                    <td className="px-3 py-2.5 text-slate-600 text-xs whitespace-nowrap">{t.date}</td>
                    <td className="px-3 py-2.5 text-slate-900 font-medium text-xs max-w-[200px] truncate">{t.description}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-medium">{t.category}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600 text-xs">{t.costCenter}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className={cn("font-medium text-xs whitespace-nowrap", t.value >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {t.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={cn("h-full rounded-full", t.value >= 0 ? "bg-emerald-400" : "bg-rose-400")}
                            style={{ width: barWidth }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <p className="text-xs text-slate-400">
              Página {page + 1} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                Próxima
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};