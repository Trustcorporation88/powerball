import { useState } from "react";
import { ParsedSheet, detectColumnTypes, inferFinancialRole } from "@/utils/excelParser";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { ColumnMapping } from "@/contexts/AppContext";

const dataTypes = ["text", "number", "date", "currency", "percentage"];

export interface RealColumnMappingProps {
  sheet: ParsedSheet;
  onMappingsChange: (mappings: ColumnMapping[]) => void;
}

export function RealColumnMapping({ sheet, onMappingsChange }: RealColumnMappingProps) {
  const columnInfo = detectColumnTypes(sheet.headers, sheet.data);
  
  const [mappings, setMappings] = useState<ColumnMapping[]>(() =>
    columnInfo.map((col) => ({
      originalName: col.name,
      detectedType: col.detected,
      confirmedType: col.detected,
      financialRole: inferFinancialRole(col.name, col.detected),
    }))
  );

  const updateMapping = (index: number, field: keyof ColumnMapping, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
    onMappingsChange(updated);
  };

  return (
    <div className="space-y-4">
      <Card className="border-slate-200">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="w-5 h-5 text-emerald-600" />
            <h2 className="font-semibold text-slate-900">Colunas Detectadas — {sheet.name}</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Coluna Original</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Tipo Detectado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Tipo Final</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-700">Papel Financeiro</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((col, i) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {col.originalName}
                      <p className="text-xs text-slate-400 font-normal">
                        Ex: {String(columnInfo[i]?.sample ?? "").slice(0, 30)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">
                        {col.detectedType}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select 
                        value={col.confirmedType} 
                        onValueChange={(v) => updateMapping(i, "confirmedType", v)}
                      >
                        <SelectTrigger className="w-28 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {dataTypes.map((t) => (
                            <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select 
                        value={col.financialRole} 
                        onValueChange={(v) => updateMapping(i, "financialRole", v)}
                      >
                        <SelectTrigger className="w-48 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Nenhum" className="text-xs">Nenhum</SelectItem>
                          <SelectItem value="Data do lançamento" className="text-xs">Data do lançamento</SelectItem>
                          <SelectItem value="Descrição" className="text-xs">Descrição</SelectItem>
                          <SelectItem value="Categoria" className="text-xs">Categoria</SelectItem>
                          <SelectItem value="Subcategoria" className="text-xs">Subcategoria</SelectItem>
                          <SelectItem value="Valor" className="text-xs">Valor</SelectItem>
                          <SelectItem value="Centro de custo" className="text-xs">Centro de custo</SelectItem>
                          <SelectItem value="Conta" className="text-xs">Conta</SelectItem>
                          <SelectItem value="Unidade" className="text-xs">Unidade</SelectItem>
                          <SelectItem value="Moeda" className="text-xs">Moeda</SelectItem>
                        </SelectContent>
                      </Select>
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