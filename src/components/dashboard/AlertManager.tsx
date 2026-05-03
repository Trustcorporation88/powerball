import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BellOff,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Clock,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  name: string;
  kpi: string;
  operator: ">" | "<" | "=";
  threshold: number;
  enabled: boolean;
}

interface AlertHistory {
  id: string;
  alertId: string;
  alertName: string;
  message: string;
  timestamp: string;
  severity: "high" | "medium" | "low";
}

interface AlertManagerProps {
  onClose: () => void;
}

const KPI_OPTIONS = [
  { value: "income", label: "Receita Total" },
  { value: "expense", label: "Despesa Total" },
  { value: "balance", label: "Saldo Líquido" },
  { value: "margin", label: "Margem Operacional" },
  { value: "transactionCount", label: "Nº de Lançamentos" },
];

const OPERATOR_LABELS: Record<string, string> = {
  ">": "maior que",
  "<": "menor que",
  "=": "igual a",
};

const STORAGE_KEY_ALERTS = "datfin_alerts";
const STORAGE_KEY_HISTORY = "datfin_alert_history";

export default function AlertManager({ onClose }: AlertManagerProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [showForm, setShowForm] = useState(false);

  const [newAlert, setNewAlert] = useState({
    name: "",
    kpi: "income",
    operator: ">" as ">" | "<" | "=",
    threshold: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY_ALERTS);
    if (saved) {
      try {
        setAlerts(JSON.parse(saved));
      } catch { /* ignore parse error */ }
    }
    const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch { /* ignore parse error */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
  }, [history]);

  const addAlert = useCallback(() => {
    if (!newAlert.name.trim()) return;
    const alert: Alert = {
      id: crypto.randomUUID(),
      name: newAlert.name.trim(),
      kpi: newAlert.kpi,
      operator: newAlert.operator,
      threshold: newAlert.threshold,
      enabled: true,
    };
    setAlerts((prev) => [...prev, alert]);

    const historyEntry: AlertHistory = {
      id: crypto.randomUUID(),
      alertId: alert.id,
      alertName: alert.name,
      message: `Alerta "${alert.name}" criado`,
      timestamp: new Date().toISOString(),
      severity: "low",
    };
    setHistory((prev) => [historyEntry, ...prev]);

    setNewAlert({ name: "", kpi: "income", operator: ">", threshold: 0 });
    setShowForm(false);
  }, [newAlert]);

  const deleteAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const toggleAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, enabled: !a.enabled } : a
      )
    );

    const alert = alerts.find((a) => a.id === id);
    if (alert) {
      const historyEntry: AlertHistory = {
        id: crypto.randomUUID(),
        alertId: id,
        alertName: alert.name,
        message: `Alerta "${alert.name}" ${alert.enabled ? "desativado" : "ativado"}`,
        timestamp: new Date().toISOString(),
        severity: "low",
      };
      setHistory((prev) => [historyEntry, ...prev]);
    }
  }, [alerts]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const severityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "low":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "high":
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />;
      case "medium":
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <CheckCircle className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  const activeAlerts = alerts.filter((a) => a.enabled);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-emerald-600" />
          <h3 className="font-semibold text-slate-800">Gerenciar Alertas</h3>
          {activeAlerts.length > 0 && (
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
              {activeAlerts.length} ativo{activeAlerts.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            className="w-full border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            onClick={() => setShowForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Alerta
          </Button>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-emerald-100 bg-emerald-50/30">
                <CardContent className="p-4 space-y-3">
                  <Input
                    placeholder="Nome do alerta"
                    value={newAlert.name}
                    onChange={(e) =>
                      setNewAlert((p) => ({ ...p, name: e.target.value }))
                    }
                    className="h-8 text-sm"
                  />

                  <Select
                    value={newAlert.kpi}
                    onValueChange={(v) =>
                      setNewAlert((p) => ({ ...p, kpi: v }))
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KPI_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Select
                      value={newAlert.operator}
                      onValueChange={(v) =>
                        setNewAlert((p) => ({
                          ...p,
                          operator: v as ">" | "<" | "=",
                        }))
                      }
                    >
                      <SelectTrigger className="h-8 w-24 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value=">">maior que</SelectItem>
                        <SelectItem value="<">menor que</SelectItem>
                        <SelectItem value="=">igual a</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      placeholder="Valor"
                      value={newAlert.threshold || ""}
                      onChange={(e) =>
                        setNewAlert((p) => ({
                          ...p,
                          threshold: Number(e.target.value),
                        }))
                      }
                      className="h-8 text-sm flex-1"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-8"
                      onClick={addAlert}
                    >
                      Adicionar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => setShowForm(false)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {alerts.length === 0 && !showForm && (
          <div className="text-center py-8">
            <BellOff className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum alerta configurado</p>
            <p className="text-xs text-slate-300 mt-1">
              Crie alertas para monitorar seus KPIs
            </p>
          </div>
        )}

        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border transition-all",
                alert.enabled
                  ? "border-slate-200 bg-white"
                  : "border-slate-100 bg-slate-50/50"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      alert.enabled ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {alert.name}
                  </span>
                  {!alert.enabled && (
                    <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-400">
                      inativo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {KPI_OPTIONS.find((k) => k.value === alert.kpi)?.label}{" "}
                  {OPERATOR_LABELS[alert.operator]}{" "}
                  {alert.kpi === "margin"
                    ? `${alert.threshold}%`
                    : alert.threshold.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Switch
                  checked={alert.enabled}
                  onCheckedChange={() => toggleAlert(alert.id)}
                  className="scale-90"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-rose-500"
                  onClick={() => deleteAlert(alert.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {history.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Histórico
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-slate-400 hover:text-rose-500"
                onClick={clearHistory}
              >
                Limpar
              </Button>
            </div>
            <ScrollArea className="max-h-36">
              <div className="space-y-1.5">
                {history.slice(0, 20).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 px-2.5 py-1.5 rounded text-xs"
                  >
                    {severityIcon(entry.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-600 truncate">{entry.message}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(entry.timestamp).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </motion.div>
  );
}
