import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Settings2, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { detectColumnTypes, inferFinancialRole, formatCellValue } from "@/utils/excelParser";
import { buildTransactionsFromSheet } from "@/utils/transactionBuilder";
import { ColumnMapping } from "@/contexts/AppContext";
import { toast } from "sonner";

const dataTypes = ["text", "number", "date", "currency", "percentage"];

export default function ColumnMapping() {
  const navigate = useNavigate();
  const { currentFile, setColumnMappings, setTransactions, updateProjectStatus, currentProject } = useApp();
  const [processing, setProcessing] = useState(false);

  const allData = currentFile?.allData || [];
  const headers = currentFile?.headers || [];
  
  const columnInfo = detectColumnTypes(headers, allData);

  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  useEffect(() => {
    if (headers.length > 0 && allData.length > 0) {
      const samplesByColumn: Record<string, any[]> = {};
      headers.forEach(h => {
        samplesByColumn[h] = allData.slice(0, 20).map(row => row[h]).filter(v => v !== undefined && v !== "" && v !== null);
      });
      
      const initialMappings = columnInfo.map((col) => ({
        originalName: col.name,
        detectedType: col.detected,
        confirmedType: col.detected,
        financialRole: inferFinancialRole(col.name, col.detected, samplesByColumn[col.name] || []),
      }));
      
      setMappings(initialMappings);
    }
  }, [currentFile?.name, currentFile?.selectedSheet]);

  const updateMapping = (index: number, field: string, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  // Preview stats: simula o processamento para mostrar ao usuario o impacto
  const previewStats = useMemo(() => {
    if (mappings.length === 0 || !currentFile || allData.length === 0) return null;
    
    const sheetData = {
      name: currentFile.selectedSheet || "Dados",
      data: allData,
      headers: headers,
      rowCount: allData.length,
    };
    
    try {
      const { stats } = buildTransactionsFromSheet(sheetData, mappings);
      return stats;
    } catch (e) {
      return null;
    }
  }, [mappings, currentFile, allData, headers]);

  const hasValueMapping = mappings.some((m) => m.financialRole === "Valor");
  const hasDateMapping = mappings.some((m) => m.financialRole === "Data do lançamento");
  const mappedRoles = mappings.filter(m => m.financialRole !== "Nenhum");

  const handleProcess = () => {
    if (mappings.length === 0) {
      toast.error("Nenhuma coluna detectada. Verifique o arquivo.");
      return;
    }

    if (!hasValueMapping) {
      toast.error("Mapeie pelo menos uma coluna como 'Valor' para processar os dados financeiros.");
      return;
    }

    setProcessing(true);
    
    setTimeout(() => {
      setColumnMappings(mappings);
      
      if (currentFile && allData.length > 0) {
        const sheetData = {
          name: currentFile.selectedSheet || "Dados",
          data: allData,
          headers: headers,
          rowCount: allData.length,
        };
        const { transactions: builtTransactions, stats } = buildTransactionsFromSheet(sheetData, mappings);
        setTransactions(builtTransactions);
        
        if (currentProject) {
          updateProjectStatus(currentProject.id, "active");
        }
        
        if (builtTransactions.length === 0) {
          toast.error("Nenhuma transação válida foi gerada. Verifique o mapeamento de colunas.");
          setProcessing(false);
          return;
        }
        
        if (stats.invalidValues > 0) {
          toast.warning(`${stats.invalidValues} registros com valores não numéricos foram tratados como zero.`);
        }
        
        toast.success(`${builtTransactions.length} transações processadas! Total: ${stats.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
        navigate("/dashboard");
      } else {
        toast.error("Dados do arquivo não encontrados.");
      }
      
      setProcessing(false);
    }, 1500);
  };

  if (headers.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Mapeamento de Colunas</h1>
            <p className="text-slate-500 mt-1">Nenhum dado disponível. Volte e faça o upload do arquivo.</p>
          </div>
          <button onClick={() => navigate("/import")} className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapeamento de Colunas</h1>
          <p className="text-slate-500 mt-1">
            Confirme os tipos e papéis financeiros de cada coluna detectada
            {currentFile && ` — ${currentFile.name} (${currentFile.selectedSheet})`}
          </p>
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
                <span className="text-xs text-slate-400 ml-auto">{headers.length} colunas • {allData.length} linhas</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-700 text-xs">Coluna Original</th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-700 text-xs">Tipo</th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-700 text-xs">Papel Financeiro</th>
                      <th className="px-3 py-2.5 text-left font-medium text-slate-700 text-xs">Amostra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((col, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium text-slate-900 text-xs">
                          {col.originalName}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            col.detectedType === "currency" ? "bg-emerald-100 text-emerald-700" :
                            col.detectedType === "date" ? "bg-blue-100 text-blue-700" :
                            col.detectedType === "number" ? "bg-violet-100 text-violet-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {col.confirmedType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <Select value={col.financialRole} onValueChange={(v) => updateMapping(i, "financialRole", v)}>
                            <SelectTrigger className="w-44 h-7 text-xs">
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
                        <td className="px-3 py-2.5 text-xs text-slate-500 font-mono">
                          {formatCellValue(columnInfo[i]?.sample)}
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
          {/* Preview de Impacto */}
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <h2 className="font-semibold text-emerald-900">Preview do Processamento</h2>
              </div>
              
              {previewStats ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Registros Válidos</p>
                      <p className="text-xl font-bold text-emerald-800">{previewStats.processedRows}</p>
                      <p className="text-[10px] text-emerald-500">de {previewStats.totalRows} lidos</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Valor Total</p>
                      <p className="text-xl font-bold text-emerald-800">
                        {previewStats.totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </p>
                      <p className="text-[10px] text-emerald-500">soma dos absolutos</p>
                    </div>
                  </div>
                  
                  {previewStats.dateRange.min && (
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Período Detectado</p>
                      <p className="text-sm font-medium text-emerald-800">
                        {previewStats.dateRange.min} → {previewStats.dateRange.max}
                      </p>
                    </div>
                  )}
                  
                  {previewStats.categoriesFound.length > 0 && (
                    <div className="bg-white rounded-lg p-3 border border-emerald-100">
                      <p className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">Categorias</p>
                      <p className="text-sm text-emerald-800">{previewStats.categoriesFound.slice(0, 5).join(", ")}
                        {previewStats.categoriesFound.length > 5 && ` +${previewStats.categoriesFound.length - 5}`}
                      </p>
                    </div>
                  )}
                  
                  {previewStats.invalidValues > 0 && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">
                        {previewStats.invalidValues} registros com valores inválidos serão tratados como zero
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-emerald-700">Ajuste o mapeamento para ver o preview</p>
              )}
            </CardContent>
          </Card>

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
                  Nenhuma coluna foi mapeada como <strong>Valor</strong>. O processamento não pode continuar sem dados financeiros.
                </p>
              </CardContent>
            </Card>
          )}

          {!hasDateMapping && hasValueMapping && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600" />
                  <h2 className="font-semibold text-blue-800">Dica</h2>
                </div>
                <p className="text-sm text-blue-700">
                  Mapeie uma coluna como <strong>Data do lançamento</strong> para análises temporais mais precisas.
                </p>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-100 bg-slate-50">
            <CardContent className="p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Resumo do Mapeamento</h2>
              <div className="space-y-2">
                {mappedRoles.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{m.financialRole}</span>
                    <span className="font-medium text-emerald-700">→ {m.originalName}</span>
                  </div>
                ))}
                {mappedRoles.length === 0 && (
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
          disabled={processing || !hasValueMapping}
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