import { ParsedSheet } from "@/utils/excelParser";
import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet, EyeOff, Table2, LayoutList, Hash, Type, Calendar, DollarSign, AlertCircle } from "lucide-react";
import { detectColumnTypes } from "@/utils/excelParser";

interface SheetPreviewProps {
  sheet: ParsedSheet;
  isSelected: boolean;
  onSelect: () => void;
}

export const SheetPreview = ({ sheet, isSelected, onSelect }: SheetPreviewProps) => {
  const columnInfo = detectColumnTypes(sheet.headers, sheet.data);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "date": return <Calendar className="w-3 h-3 text-blue-500" />;
      case "currency":
      case "number": return <DollarSign className="w-3 h-3 text-emerald-500" />;
      default: return <Type className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{sheet.name}</p>
          <p className="text-sm text-slate-500">{sheet.headers.length} colunas • {sheet.rowCount} linhas</p>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="bg-slate-50 border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Estrutura e Tipos Detectados</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <EyeOff className="w-3.5 h-3.5" />
            Dados ocultos
          </div>
        </div>

        <div className="p-4 space-y-3">
          {sheet.headers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {columnInfo.map((col, i) => {
                const filledCount = sheet.data.slice(0, 100).filter(row => {
                  const val = row[col.name];
                  return val !== undefined && val !== "" && val !== null;
                }).length;
                const fillRate = sheet.data.length > 0 ? Math.round((filledCount / Math.min(sheet.data.length, 100)) * 100) : 0;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <div className="p-1.5 bg-white rounded border border-slate-100 shrink-0">
                      {getTypeIcon(col.detected)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {col.name.trim() || `Coluna ${i + 1}`}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          col.detected === "currency" ? "bg-emerald-100 text-emerald-700" :
                          col.detected === "date" ? "bg-blue-100 text-blue-700" :
                          col.detected === "number" ? "bg-violet-100 text-violet-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {col.detected}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-400 rounded-full"
                            style={{ width: `${fillRate}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-8 text-right">{fillRate}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 py-4 text-slate-400 justify-center">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">Nenhum cabeçalho detectado</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500 border-t pt-3">
            <span>{sheet.rowCount} registros</span>
            <span>•</span>
            <span>{sheet.headers.length} campos</span>
            <span>•</span>
            <span>Preview mascarado por segurança</span>
          </div>
        </div>
      </div>
    </div>
  );
};