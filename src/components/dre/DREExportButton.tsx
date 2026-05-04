import { useState } from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DREReport } from "@/services/dre";
import type { Transaction } from "@/contexts/AppContext";

interface DREExportButtonProps {
  projectName?: string;
  periodLabel: string;
  dreReport: DREReport;
  comparisonLabel?: string | null;
  comparisonReport?: DREReport | null;
  transactions: Transaction[];
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatVariation(current: number, previous: number) {
  const delta = current - previous;
  const ratio = previous !== 0 ? (delta / Math.abs(previous)) * 100 : null;

  return {
    delta,
    ratio,
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DREExportButton({
  projectName,
  periodLabel,
  dreReport,
  comparisonLabel,
  comparisonReport,
  transactions,
}: DREExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  const exportExcel = () => {
    try {
      setExporting(true);

      const workbook = XLSX.utils.book_new();
      const baseForPercentage =
        Math.abs(dreReport.summary.receitaLiquida) ||
        Math.abs(dreReport.summary.receitaBruta) ||
        1;

      const dreSheet = XLSX.utils.aoa_to_sheet([
        ["Projeto", projectName || "Sem projeto"],
        ["Período", periodLabel],
        [],
        ["Linha", "Valor", "% da Receita Líquida"],
        ...dreReport.lines.map((line) => [
          line.label,
          line.amount,
          line.amount / baseForPercentage,
        ]),
      ]);
      dreSheet["!cols"] = [{ wch: 42 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, dreSheet, "DRE");

      const summaryRows = [
        ["Métrica", "Atual", comparisonLabel ?? "", "Variação"],
        [
          "Receita Líquida",
          dreReport.summary.receitaLiquida,
          comparisonReport?.summary.receitaLiquida ?? "",
          comparisonReport
            ? formatVariation(dreReport.summary.receitaLiquida, comparisonReport.summary.receitaLiquida).delta
            : "",
        ],
        [
          "Lucro Bruto",
          dreReport.summary.lucroBruto,
          comparisonReport?.summary.lucroBruto ?? "",
          comparisonReport
            ? formatVariation(dreReport.summary.lucroBruto, comparisonReport.summary.lucroBruto).delta
            : "",
        ],
        [
          "EBITDA",
          dreReport.summary.ebitda,
          comparisonReport?.summary.ebitda ?? "",
          comparisonReport
            ? formatVariation(dreReport.summary.ebitda, comparisonReport.summary.ebitda).delta
            : "",
        ],
        [
          "Resultado Líquido",
          dreReport.summary.resultadoLiquido,
          comparisonReport?.summary.resultadoLiquido ?? "",
          comparisonReport
            ? formatVariation(dreReport.summary.resultadoLiquido, comparisonReport.summary.resultadoLiquido).delta
            : "",
        ],
      ];

      const summarySheet = XLSX.utils.aoa_to_sheet([
        ["Projeto", projectName || "Sem projeto"],
        ["Período atual", periodLabel],
        comparisonLabel ? ["Comparação", comparisonLabel] : [],
        [],
        ...summaryRows,
      ].filter((row) => row.length > 0));
      summarySheet["!cols"] = [{ wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Resumo Executivo");

      const transactionSheet = XLSX.utils.aoa_to_sheet([
        ["Data", "Descrição", "Categoria", "Grupo DRE", "Centro de Custo", "Conta", "Valor", "Tipo"],
        ...transactions.map((transaction) => [
          transaction.date,
          transaction.description,
          transaction.category,
          transaction.dreOriginalGroup || transaction.dreGroup || "",
          transaction.costCenter,
          transaction.account,
          transaction.value,
          transaction.flowType === "income" ? "Receita" : "Despesa",
        ]),
      ]);
      transactionSheet["!cols"] = [
        { wch: 12 },
        { wch: 40 },
        { wch: 20 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(workbook, transactionSheet, "Lançamentos");

      XLSX.writeFile(workbook, `${projectName || "DRE"}_${periodLabel.replace(/[^\w-]+/g, "_")}.xlsx`);
      toast.success("DRE executivo exportado em Excel.");
    } catch {
      toast.error("Não foi possível exportar o DRE em Excel.");
    } finally {
      setExporting(false);
    }
  };

  const exportPdf = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1200,height=900");

    if (!printWindow) {
      toast.error("O navegador bloqueou a janela de impressão.");
      return;
    }

    const comparisonRows = comparisonReport
      ? `
        <h2>Comparativo</h2>
        <table>
          <thead>
            <tr><th>Métrica</th><th>${escapeHtml(periodLabel)}</th><th>${escapeHtml(comparisonLabel || "Anterior")}</th><th>Variação</th></tr>
          </thead>
          <tbody>
            ${[
              ["Receita Líquida", dreReport.summary.receitaLiquida, comparisonReport.summary.receitaLiquida],
              ["Lucro Bruto", dreReport.summary.lucroBruto, comparisonReport.summary.lucroBruto],
              ["EBITDA", dreReport.summary.ebitda, comparisonReport.summary.ebitda],
              ["Resultado Líquido", dreReport.summary.resultadoLiquido, comparisonReport.summary.resultadoLiquido],
            ]
              .map(([label, current, previous]) => {
                const variation = formatVariation(Number(current), Number(previous));
                return `<tr>
                  <td>${escapeHtml(String(label))}</td>
                  <td>${escapeHtml(formatCurrency(Number(current)))}</td>
                  <td>${escapeHtml(formatCurrency(Number(previous)))}</td>
                  <td>${escapeHtml(formatCurrency(variation.delta))}${variation.ratio !== null ? ` (${variation.ratio.toFixed(1)}%)` : ""}</td>
                </tr>`;
              })
              .join("")}
          </tbody>
        </table>
      `
      : "";

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>DRE Executivo</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
            h1 { margin-bottom: 4px; }
            h2 { margin: 28px 0 12px; }
            p.meta { color: #475569; margin: 0 0 6px; }
            .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
            .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 16px; background: #f8fafc; }
            .label { font-size: 12px; text-transform: uppercase; color: #64748b; }
            .value { font-size: 24px; font-weight: 700; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; }
            th { background: #f8fafc; }
            td.right, th.right { text-align: right; }
            @media print { body { margin: 18px; } }
          </style>
        </head>
        <body>
          <h1>DRE Executivo</h1>
          <p class="meta">${escapeHtml(projectName || "Sem projeto")}</p>
          <p class="meta">Período: ${escapeHtml(periodLabel)}</p>

          <div class="grid">
            <div class="card"><div class="label">Receita Líquida</div><div class="value">${escapeHtml(formatCurrency(dreReport.summary.receitaLiquida))}</div></div>
            <div class="card"><div class="label">Lucro Bruto</div><div class="value">${escapeHtml(formatCurrency(dreReport.summary.lucroBruto))}</div></div>
            <div class="card"><div class="label">EBITDA</div><div class="value">${escapeHtml(formatCurrency(dreReport.summary.ebitda))}</div></div>
            <div class="card"><div class="label">Resultado Líquido</div><div class="value">${escapeHtml(formatCurrency(dreReport.summary.resultadoLiquido))}</div></div>
          </div>

          <h2>Demonstrativo</h2>
          <table>
            <thead>
              <tr><th>Linha</th><th class="right">Valor</th></tr>
            </thead>
            <tbody>
              ${dreReport.lines
                .map((line) => `
                  <tr>
                    <td>${escapeHtml(line.label)}</td>
                    <td class="right">${escapeHtml(formatCurrency(line.amount))}</td>
                  </tr>
                `)
                .join("")}
            </tbody>
          </table>

          ${comparisonRows}
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    toast.success("Janela de PDF executivo aberta para impressão.");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exportando..." : "Exportar DRE"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel executivo
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf}>
          <FileText className="h-4 w-4 mr-2" />
          PDF executivo
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
