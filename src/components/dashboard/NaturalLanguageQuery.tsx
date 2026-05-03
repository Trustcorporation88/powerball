import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Transaction } from "@/contexts/AppContext";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart as RePieChart, Pie, Cell } from "recharts";
import { CustomTooltip } from "./CustomTooltip";
import { cn } from "@/lib/utils";

interface NaturalLanguageQueryProps {
  transactions: Transaction[];
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];

export const NaturalLanguageQuery = ({ transactions }: NaturalLanguageQueryProps) => {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<any>(null);

  const processQuery = () => {
    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    if (q.includes("receita") && q.includes("categoria")) {
      const data: Record<string, number> = {};
      transactions.filter(t => t.flowType === "income").forEach(t => {
        data[t.category] = (data[t.category] || 0) + t.value;
      });
      setResult({
        type: "bar",
        title: "Receita por Categoria",
        data: Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      });
      return;
    }
    
    if (q.includes("despesa") && q.includes("categoria")) {
      const data: Record<string, number> = {};
      transactions.filter(t => t.flowType === "expense").forEach(t => {
        data[t.category] = (data[t.category] || 0) + Math.abs(t.value);
      });
      setResult({
        type: "bar",
        title: "Despesa por Categoria",
        data: Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      });
      return;
    }
    
    if (q.includes("receita") && (q.includes("total") || q.includes("geral"))) {
      const total = transactions.filter(t => t.flowType === "income").reduce((s, t) => s + t.value, 0);
      setResult({ type: "kpi", title: "Receita Total", value: total, color: "emerald" });
      return;
    }
    
    if (q.includes("despesa") && (q.includes("total") || q.includes("geral"))) {
      const total = transactions.filter(t => t.flowType === "expense").reduce((s, t) => s + Math.abs(t.value), 0);
      setResult({ type: "kpi", title: "Despesa Total", value: total, color: "rose" });
      return;
    }
    
    if (q.includes("saldo") || q.includes("lucro") || q.includes("resultado")) {
      const income = transactions.filter(t => t.flowType === "income").reduce((s, t) => s + t.value, 0);
      const expense = transactions.filter(t => t.flowType === "expense").reduce((s, t) => s + Math.abs(t.value), 0);
      setResult({ type: "kpi", title: "Saldo Líquido", value: income - expense, color: "blue" });
      return;
    }
    
    if (q.includes("centro") || q.includes("custo") || q.includes("filial")) {
      const data: Record<string, number> = {};
      transactions.forEach(t => {
        data[t.costCenter] = (data[t.costCenter] || 0) + Math.abs(t.value);
      });
      setResult({
        type: "pie",
        title: "Distribuição por Centro de Custo",
        data: Object.entries(data).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8),
      });
      return;
    }
    
    if (q.includes("maior") || q.includes("top")) {
      const data: Record<string, number> = {};
      transactions.filter(t => t.flowType === "expense").forEach(t => {
        data[t.category] = (data[t.category] || 0) + Math.abs(t.value);
      });
      const sorted = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 5);
      setResult({
        type: "bar",
        title: "Top Categorias de Despesa",
        data: sorted.map(([name, value]) => ({ name, value })),
      });
      return;
    }
    
    setResult({ type: "text", title: "Não entendi", message: "Tente: 'receita por categoria', 'despesa total', 'saldo', 'por centro de custo', 'top despesas'" });
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          <span className="text-sm font-medium text-slate-700">Pergunte aos seus dados</span>
        </div>
        
        <div className="flex gap-2">
          <Input
            placeholder="Ex: receita por categoria, despesa total, saldo..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && processQuery()}
            className="text-sm"
          />
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={processQuery}>
            <Search className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1.5">
          {["receita por categoria", "despesa total", "saldo", "por centro de custo", "top despesas"].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => { setQuery(suggestion); setTimeout(processQuery, 0); }}
              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-600 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-900">{result.title}</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setResult(null)}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
                
                {result.type === "kpi" && (
                  <div className={cn("p-4 rounded-xl", result.color === "emerald" ? "bg-emerald-50" : result.color === "rose" ? "bg-rose-50" : "bg-blue-50")}>
                    <p className={cn("text-2xl font-bold", result.color === "emerald" ? "text-emerald-700" : result.color === "rose" ? "text-rose-700" : "text-blue-700")}>
                      {result.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                  </div>
                )}
                
                {result.type === "bar" && result.data.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={result.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {result.data.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                
                {result.type === "pie" && result.data.length > 0 && (
                  <ResponsiveContainer width="100%" height={200}>
                    <RePieChart>
                      <Pie data={result.data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                        {result.data.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                    </RePieChart>
                  </ResponsiveContainer>
                )}
                
                {result.type === "text" && (
                  <p className="text-sm text-slate-500">{result.message}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};