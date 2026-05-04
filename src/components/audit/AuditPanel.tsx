import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";
import type { AuditReport, AuditIssue } from "@/services/audit";
import { motion, AnimatePresence } from "framer-motion";

interface AuditPanelProps {
  type: "import" | "cashflow" | "costcenter" | "dashboard" | "dre";
  audit: AuditReport | null;
  loading?: boolean;
  onRunAudit?: () => void;
  blocking?: boolean; // Se verdadeiro, bloqueia ação quando há críticos
  disabled?: boolean; // Desabilita o painel (ex: sem dados)
}

const typeLabels = {
  import: "Auditoria de Importação",
  cashflow: "Auditoria do Fluxo de Caixa",
  costcenter: "Auditoria de Centros de Custo",
  dashboard: "Auditoria de Consolidação",
  dre: "Auditoria de Entrega DRE",
};

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  info: {
    icon: AlertCircle,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
};

function IssueCard({ issue }: { issue: AuditIssue }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[issue.severity];
  const Icon = config.icon;

  return (
    <Card className={`border ${config.border} ${config.bg}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`h-5 w-5 ${config.color} shrink-0 mt-0.5`} />
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={`font-semibold ${config.color}`}>{issue.title}</p>
                {issue.affectedItem && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Afetado: {issue.affectedItem}
                  </p>
                )}
              </div>
              <Badge variant="secondary" className={config.badge}>
                {issue.severity === "critical"
                  ? "CRÍTICO"
                  : issue.severity === "warning"
                    ? "Aviso"
                    : "Info"}
              </Badge>
            </div>

            <p className="text-sm text-slate-700">{issue.description}</p>

            {issue.suggestion && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3 w-3" /> Ocultar
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3" /> Sugestão
                  </>
                )}
              </button>
            )}

            <AnimatePresence>
              {expanded && issue.suggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-2 bg-blue-100/50 rounded text-sm text-blue-900">
                    <p className="font-medium">💡 Sugestão:</p>
                    <p>{issue.suggestion}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AuditPanel({
  type,
  audit,
  loading = false,
  onRunAudit,
  blocking = false,
  disabled = false,
}: AuditPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (disabled) {
    return null;
  }

  const hasCritical = audit?.issues.some((i) => i.severity === "critical") ?? false;
  const hasWarning =
    audit?.issues.some((i) => i.severity === "warning") ?? false;

  const status =
    loading
      ? "loading"
      : !audit
        ? "idle"
        : audit.passed
          ? "passed"
          : "failed";

  const isBlocked = blocking && hasCritical;

  return (
    <Card
      className={`border-2 transition-all ${
        status === "passed"
          ? "border-green-200 bg-green-50"
          : status === "failed"
            ? isBlocked
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50"
            : "border-slate-200"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {status === "loading" ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            ) : status === "passed" ? (
              <ShieldCheck className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <CardTitle className="text-lg">{typeLabels[type]}</CardTitle>
          </div>

          {audit && (
            <div className="flex items-center gap-2">
              {audit.engine === "offline" && (
                <Badge variant="outline" className="text-xs">
                  Offline
                </Badge>
              )}
              <Badge
                variant="outline"
                className={`text-xs ${
                  audit.passed
                    ? "border-green-200 text-green-700"
                    : "border-amber-200 text-amber-700"
                }`}
              >
                {audit.checksPassed}/{audit.checksPerformed} ✓
              </Badge>
            </div>
          )}
        </div>

        {audit && !loading && (
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-slate-700">{audit.summary}</p>
            {audit.engine === "offline" && (
              <p className="text-xs text-slate-600 italic">
                ⚠️ Auditoria offline: verifique a API DeepSeek
              </p>
            )}
          </div>
        )}

        {isBlocked && (
          <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-800 font-medium flex items-center gap-2">
            <span>🚫</span> Auditoria bloqueada: Existem problemas críticos
          </div>
        )}
      </CardHeader>

      {audit && audit.issues.length > 0 && (
        <CardContent className="space-y-4">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="w-full flex items-center justify-between p-2 rounded bg-slate-100 hover:bg-slate-200 transition text-sm text-slate-700 font-medium"
            >
              <span>
                Mostrar {hasCritical ? "1 crítico" : ""}{" "}
                {hasCritical && hasWarning ? "+" : ""}
                {hasWarning ? "avisos" : ""}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                onClick={() => setExpanded(false)}
                className="w-full flex items-center justify-between p-2 rounded bg-slate-100 hover:bg-slate-200 transition text-sm text-slate-700 font-medium"
              >
                <span>Ocultar detalhes</span>
                <ChevronUp className="h-4 w-4" />
              </button>

              <div className="space-y-3">
                {audit.issues.map((issue, idx) => (
                  <IssueCard key={idx} issue={issue} />
                ))}
              </div>
            </>
          )}
        </CardContent>
      )}

      {!audit && !loading && onRunAudit && (
        <CardContent>
          <Button
            onClick={onRunAudit}
            variant="outline"
            size="sm"
            className="w-full gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Executar Auditoria
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
