import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ShieldCheck, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from "lucide-react";
import type { AuditReport, AuditIssue } from "@/services/audit";
import { motion, AnimatePresence } from "framer-motion";

interface AuditReportDisplayProps {
  dreAudit?: AuditReport | null;
  transactionsAudit?: AuditReport | null;
  loading?: boolean;
  onRunAudit?: () => void;
}

const severityConfig = {
  critical: {
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
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
                  <p className="text-xs text-slate-500 mt-0.5">Afetado: {issue.affectedItem}</p>
                )}
              </div>
              <Badge variant="secondary" className={config.badge}>
                {issue.severity === 'critical' ? 'CRÍTICO' : issue.severity === 'warning' ? 'Aviso' : 'Info'}
              </Badge>
            </div>

            <p className="text-sm text-slate-700">{issue.description}</p>

            {issue.suggestion && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Ocultar' : 'Ver'} sugestão
              </button>
            )}

            <AnimatePresence>
              {expanded && issue.suggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-white rounded border border-blue-200"
                >
                  <p className="text-xs font-semibold text-blue-900 mb-1">💡 Sugestão:</p>
                  <p className="text-xs text-blue-700">{issue.suggestion}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditSection({ report, title }: { report: AuditReport; title: string }) {
  const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalCount} crítico{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge className="bg-amber-100 text-amber-700 text-xs">
              {warningCount} aviso{warningCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 bg-slate-50 rounded border border-slate-200">
          <p className="text-xs text-slate-500">Verificações</p>
          <p className="text-lg font-bold text-slate-900">{report.checksPerformed}</p>
        </div>
        <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
          <p className="text-xs text-emerald-600">Aprovadas</p>
          <p className="text-lg font-bold text-emerald-900">{report.checksPassed}</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium text-slate-600">Confiança nos Dados</p>
          <p className="text-xs font-bold text-slate-900">{report.confidence}%</p>
        </div>
        <Progress value={report.confidence} className="h-2" />
      </div>

      <p className="text-sm text-slate-600 italic">{report.summary}</p>

      {report.issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase">Problemas Encontrados:</p>
          {report.issues.map((issue, i) => (
            <IssueCard key={i} issue={issue} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditReportDisplay({ dreAudit, transactionsAudit, loading, onRunAudit }: AuditReportDisplayProps) {
  const hasAnyReport = dreAudit || transactionsAudit;
  const usedDeepSeek = dreAudit?.engine === 'deepseek' && transactionsAudit?.engine === 'deepseek';
  const allPassed = usedDeepSeek && dreAudit?.passed && transactionsAudit?.passed;
  const hasCritical = 
    (dreAudit?.issues.some(i => i.severity === 'critical')) || 
    (transactionsAudit?.issues.some(i => i.severity === 'critical'));

  return (
    <Card className={
      !hasAnyReport ? 'border-slate-200' :
      hasCritical ? 'border-red-200 bg-red-50/30' :
      allPassed ? 'border-emerald-200 bg-emerald-50/30' :
      'border-amber-200 bg-amber-50/30'
    }>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className={`h-5 w-5 ${
              !hasAnyReport ? 'text-slate-500' :
              hasCritical ? 'text-red-600' :
              allPassed ? 'text-emerald-600' :
              'text-amber-600'
            }`} />
            Auditoria Inteligente (DeepSeek)
          </CardTitle>
          {onRunAudit && (
            <Button
              onClick={onRunAudit}
              disabled={loading}
              size="sm"
              className="bg-violet-600 hover:bg-violet-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Auditando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Auditar com IA
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {loading && (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-violet-600 mb-3" />
            <p className="text-sm text-slate-600">DeepSeek está validando seus dados...</p>
            <p className="text-xs text-slate-500 mt-1">Verificando cálculos e classificações</p>
          </div>
        )}

        {!loading && !hasAnyReport && (
          <div className="text-center py-8 space-y-3">
            <div className="flex justify-center">
              <div className="p-3 bg-violet-100 rounded-full">
                <Sparkles className="h-8 w-8 text-violet-600" />
              </div>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Auditoria Inteligente Disponível</p>
              <p className="text-sm text-slate-600 mt-1">
                Use DeepSeek para validar cálculos do DRE e classificações de transações
              </p>
            </div>
          </div>
        )}

        {!loading && hasAnyReport && (
          <>
            {!usedDeepSeek && (
              <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                <div>
                  <p className="font-semibold text-amber-900">⚠️ Auditoria IA não concluída</p>
                  <p className="text-sm text-amber-700 mt-1">
                    O sistema caiu em validação offline. Esta entrega não deve ser tratada como contra-testada pela DeepSeek.
                  </p>
                </div>
              </div>
            )}

            {allPassed && (
              <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-900">✅ Auditoria Aprovada</p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Todos os cálculos e classificações foram validados pela IA.
                  </p>
                </div>
              </div>
            )}

            {hasCritical && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">❌ Problemas Críticos Encontrados</p>
                  <p className="text-sm text-red-700 mt-1">
                    A IA identificou erros que precisam ser corrigidos antes da entrega.
                  </p>
                </div>
              </div>
            )}

            {dreAudit && <AuditSection report={dreAudit} title="Auditoria DRE (Cálculos)" />}
            {transactionsAudit && <AuditSection report={transactionsAudit} title="Auditoria Transações (Classificações)" />}

            <div className="pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Auditoria realizada em: {new Date(dreAudit?.validatedAt || transactionsAudit?.validatedAt || '').toLocaleString('pt-BR')}
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
