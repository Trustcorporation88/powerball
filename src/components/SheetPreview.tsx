import { ParsedSheet } from "@/utils/excelParser";
import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet, EyeOff, Table2, LayoutList } from "lucide-react";

interface SheetPreviewProps {
  sheet: ParsedSheet;
  isSelected: boolean;
  onSelect: () => void;
}

export const SheetPreview = ({ sheet, isSelected, onSelect }: SheetPreviewProps) => {
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
            <span className="text-xs font-medium text-slate-600">Estrutura detectada</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <EyeOff className="w-3.5 h-3.5" />
            Dados ocultos
          </div>
        </div>

        <div className="p-4 space-y-3">
          {sheet.headers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {sheet.headers.map((header, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 rounded-md text-xs text-slate-700"
                >
                  <LayoutList className="w-3 h-3 text-slate-400" />
                  <span className="font-medium truncate max-w-[150px]">
                    {header.trim() || `Coluna ${i + 1}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-2">Nenhum cabeçalho detectado</p>
          )}

          <div className="flex items-center gap-4 text-xs text-slate-500 border-t pt-3">
            <span>{sheet.rowCount} registros</span>
            <span>•</span>
            <span>{sheet.headers.length} campos</span>
            <span>•</span>
            <span>Preview mascarado</span>
          </div>
        </div>
      </div>
    </div>
  );
};