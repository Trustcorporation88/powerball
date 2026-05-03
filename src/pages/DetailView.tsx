import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

export default function DetailView() {
  const navigate = useNavigate();
  const { transactions } = useApp();

  const monthlyDetail = transactions.reduce((acc: any[], t) => {
    const month = t.date.slice(0, 7);
    const existing = acc.find((a) => a.month === month);
    if (existing) {
      existing.value += t.value;
    } else {
      acc.push({ month, value: t.value });
    }
    return acc;
  }, []).sort((a: any, b: any) => a.month.localeCompare(b.month));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Detalhe Analítico</h1>
          <p className="text-slate-500 mt-1">Visão detalhada dos lançamentos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.info("Exportação em desenvolvimento")}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Excel
          </Button>
          <Button variant="outline" onClick={() => toast.info("Exportação em desenvolvimento")}>
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Série Temporal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyDetail}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-sm text-emerald-600 font-medium">Total de Lançamentos</p>
              <p className="text-2xl font-bold text-emerald-800">{transactions.length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-blue-600 font-medium">Período</p>
              <p className="text-lg font-bold text-blue-800">Jan - Mar 2024</p>
            </div>
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-sm text-violet-600 font-medium">Categorias</p>
              <p className="text-lg font-bold text-violet-800">{new Set(transactions.map(t => t.category)).size}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Tabela de Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Data</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Descrição</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Categoria</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Subcategoria</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Centro de Custo</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Conta</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-700">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">{t.date}</td>
                    <td className="px-4 py-2.5 text-slate-900 font-medium">{t.description}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{t.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{t.subcategory}</td>
                    <td className="px-4 py-2.5 text-slate-600">{t.costCenter}</td>
                    <td className="px-4 py-2.5 text-slate-600">{t.account}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${t.value >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {t.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}