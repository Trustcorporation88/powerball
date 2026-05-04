import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ValidationReport } from "@/services/validation";

interface ValidationSummaryProps {
  report: ValidationReport;
  title?: string;
}

export function ValidationSummary({ report, title = "Validação local" }: ValidationSummaryProps) {
  return (
    <Card className={report.approved ? "border-emerald-200" : "border-rose-200"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {report.approved ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <ShieldAlert className="h-4 w-4 text-rose-600" />}
          {title}
          <Badge variant="outline" className={report.approved ? "border-emerald-200 text-emerald-700" : "border-rose-200 text-rose-700"}>
            {report.approved ? "Aprovado" : "Bloqueado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2 flex-wrap text-xs">
          <Badge variant="secondary" className="bg-rose-50 text-rose-700">
            {report.errors} erro(s)
          </Badge>
          <Badge variant="secondary" className="bg-amber-50 text-amber-700">
            {report.warnings} alerta(s)
          </Badge>
        </div>

        {report.issueList.length === 0 ? (
          <p className="text-sm text-emerald-700">Nenhuma inconsistência detectada na validação determinística.</p>
        ) : (
          <div className="space-y-2">
            {report.issueList.slice(0, 6).map((issue) => (
              <div key={issue.code} className="flex items-start gap-2 text-sm">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${issue.severity === "error" ? "text-rose-500" : "text-amber-500"}`} />
                <span className="text-slate-700">
                  {issue.message}
                  {issue.count ? ` (${issue.count})` : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

