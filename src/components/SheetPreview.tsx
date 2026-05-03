import { ParsedSheet } from "@/utils/excelParser";
import { Card, CardContent } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";

interface SheetPreviewProps {
  sheet: ParsedSheet;
  isSelected: boolean;
  onSelect: () => void;
}

export const SheetPreview = ({ sheet, isSelected, onSelect }: SheetPreviewProps) => {
  const previewData = sheet.data.slice(0, 8);

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

      <div className="flex gap-2">
        <button
          onClick={onSelect}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isSelected
              ? "bg-emerald-600 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {sheet.name}
        </button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                {sheet.headers.map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-medium text-slate-700 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((row, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  {sheet.headers.map((header, j) => (
                    <td key={j} className="px-4 py-2.5 text-slate-600 whitespace-nowrap max-w-[200px] truncate">
                      {row[header] !== undefined ? String(row[header]) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-t">
          Mostrando {previewData.length} de {sheet.rowCount} linhas
        </div>
      </div>
    </div>
  );
};