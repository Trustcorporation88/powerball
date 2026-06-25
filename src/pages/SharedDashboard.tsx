import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, Link2Off } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/dashboard/TransactionsTable";
import { getShareSnapshot, type SharedDashboardSnapshot } from "@/services/shareSnapshots";

export default function SharedDashboard() {
  const navigate = useNavigate();
  const { token = "" } = useParams();
  const [snapshot, setSnapshot] = useState<SharedDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadSnapshot = async () => {
      const result = await getShareSnapshot(token);
      if (!cancelled) {
        setSnapshot(result);
        setLoading(false);
      }
    };

    void loadSnapshot();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando dashboard compartilhado...</div>;
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center space-y-4">
            <Link2Off className="h-10 w-10 mx-auto text-slate-400" />
            <div>
              <h1 className="text-xl font-semibold">Link indisponível</h1>
              <p className="text-sm text-muted-foreground mt-1">O snapshot não existe mais neste navegador.</p>
            </div>
            <Button onClick={() => navigate("/")}>Voltar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-2">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-slate-900">{snapshot.projectName}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
              <CalendarClock className="w-4 h-4" />
              Snapshot gerado em {new Date(snapshot.createdAt).toLocaleString("pt-BR")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Receita</p><p className="text-xl font-bold">{snapshot.kpis.income.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Despesa</p><p className="text-xl font-bold">{snapshot.kpis.expense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Saldo</p><p className="text-xl font-bold">{snapshot.kpis.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Margem</p><p className="text-xl font-bold">{snapshot.kpis.margin.toFixed(2)}%</p></CardContent></Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Evolução mensal</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={snapshot.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                  <Area type="monotone" dataKey="income" stroke="#059669" fill="#a7f3d0" />
                  <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#fecaca" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Despesas por categoria</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={snapshot.categoryData} dataKey="value" nameKey="name" outerRadius={100} fill="#059669" />
                  <Tooltip formatter={(value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Transações compartilhadas</CardTitle></CardHeader>
          <CardContent>
            <TransactionsTable transactions={snapshot.transactions} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
