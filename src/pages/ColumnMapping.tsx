import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Settings2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { detectColumnTypes, inferFinancialRole } from "@/utils/excelParser";
import { buildTransactionsFromSheet } from "@/utils/transactionBuilder";
import { ColumnMapping } from "@/contexts/AppContext";
import { toast } from "sonner";

const dataTypes = ["text", "number", "date", "currency", "percentage"];

export default function ColumnMapping() {
  const navigate = useNavigate();
  const { currentFile, setColumnMappings, setTransactions, updateProjectStatus, currentProject } = useApp();
  const [processing, setProcessing] = useState(false);

  // Pega os dados reais do arquivo parseado ou fallback para mock
  const sheetData = currentFile?.preview || [];
  const headers = currentFile?.preview?.length > 0 ? Object.keys(currentFile.preview[0]) : [];
  
  const columnInfo = detectColumnTypes(headers, sheetData);

  const [mappings, setMappings] = useState<ColumnMapping[]>(() =>
    columnInfo.map((col) => ({
      originalName: col.name,
      detectedType: col.detected,
      confirmedType: col.detected,
      financialRole: inferFinancialRole(col.name, col.detected),
    }))
  );

  const updateMapping = (index: number, field: string, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const handleProcess = () => {
    setProcessing(true);
    
    setTimeout(() => {
      setColumnMappings(mappings);
      
      // Tenta construir transações a partir dos dados reais
      if (currentFile && currentFile.preview && currentFile.preview.length > 0) {
        const mockSheet = {
          name: "Dados",
          data: currentFile.preview,
          headers,
          rowCount: currentFile.preview.length,
        };
        const builtTransactions = buildTransactionsFromSheet(mockSheet, mappings);
        setTransactions(builtTransactions);
      }
      
      if (currentProject) {
        updateProjectStatus(currentProject.id, "active");
      }
      
      toast.success("Dados processados com sucesso! Dashboard gerado.");
      navigate("/dashboard");
      setProcessing(false);
    }, 1500);
  };

  const hasValueMapping = mappings.some((m) => m.financialRole === "Valor");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapeamento de Colunas</h1>
          <p className="text-slate-500 mt-1">Confirme os tipos e papéis financeiros de cada coluna detectada</p>
        </div>
        <button
          onClick={() => navigate("/import")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Colunas Detectadas</h2>
                <span className="text-xs text-slate-400 ml-auto">{headers.length} colunas</span>
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
                          <Select value={col.confirmedType} onValueChange={(v) => updateMapping(i, "confirmedType", v)}>
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
                          <Select value={col.financialRole} onValueChange={(v) => updateMapping(i, "financialRole", v)}>
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

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-slate-900">Regras Automáticas</h2>
              </div>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Datas normalizadas para ISO 8601
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Separadores decimais padronizados
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Textos trimados e capitalizados
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Valores negativos = saída
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-1.5 shrink-0" />
                  Categorias vazias = "Não classificado"
                </li>
              </ul>
            </CardContent>
          </Card>

          {!hasValueMapping && (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h2 className="font-semibold text-amber-800">Atenção</h2>
                </div>
                <p className="text-sm text-amber-700">
                  Nenhuma coluna foi mapeada como <strong>Valor</strong>. O dashboard não conseguirá calcular KPIs financeiros.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-100 bg-slate-50">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Resumo do Mapeamento</h2>
              <div className="space-y-2">
                {mappings.filter(m => m.financialRole !== "Nenhum").map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{m.financialRole}</span>
                    <span className="font-medium text-emerald-700">→ {m.originalName}</span>
                  </div>
                ))}
                {mappings.filter(m => m.financialRole !== "Nenhum").length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum papel financeiro definido</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button
          onClick={handleProcess}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={processing || mappings.length === 0}
        >
          {processing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              Processar Dados
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}