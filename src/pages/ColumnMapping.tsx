import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, ArrowRight, AlertTriangle, CheckCircle2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateMockColumnMappings, generateMockTransactions } from "@/data/mockData";
import { toast } from "sonner";

const financialRoles = [
  "Nenhum",
  "Data do lançamento",
  "Descrição",
  "Categoria",
  "Subcategoria",
  "Valor",
  "Centro de custo",
  "Conta",
  "Unidade",
  "Moeda",
  "Tipo de fluxo",
];

const dataTypes = ["text", "number", "date", "currency", "percentage"];

export default function ColumnMapping() {
  const navigate = useNavigate();
  const { setColumnMappings, setTransactions, updateProjectStatus, currentProject } = useApp();
  const [mappings, setMappings] = useState(generateMockColumnMappings());
  const [processing, setProcessing] = useState(false);

  const updateMapping = (index: number, field: string, value: string) => {
    const updated = [...mappings];
    updated[index] = { ...updated[index], [field]: value };
    setMappings(updated);
  };

  const handleProcess = () => {
    setProcessing(true);
    setTimeout(() => {
      setColumnMappings(mappings);
      setTransactions(generateMockTransactions());
      if (currentProject) {
        updateProjectStatus(currentProject.id, "active");
      }
      toast.success("Dados processados com sucesso! Dashboard gerado.");
      navigate("/dashboard");
      setProcessing(false);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mapeamento de Colunas</h1>
          <p className="text-slate-500 mt-1">Confirme os tipos e papéis financeiros de cada coluna</p>
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
                        <td className="px-4 py-3 font-medium text-slate-900">{col.originalName}</td>
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
                            <SelectTrigger className="w-44 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {financialRoles.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                              ))}
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

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h2 className="font-semibold text-amber-800">Inconsistências</h2>
              </div>
              <div className="space-y-2">
                <div className="p-3 bg-white rounded-lg border border-amber-100">
                  <p className="text-sm text-amber-800 font-medium">3 datas inválidas</p>
                  <p className="text-xs text-amber-600 mt-0.5">Linhas 45, 112, 203</p>
                </div>
                <div className="p-3 bg-white rounded-lg border border-amber-100">
                  <p className="text-sm text-amber-800 font-medium">12 valores nulos em "Categoria"</p>
                  <p className="text-xs text-amber-600 mt-0.5">Serão classificados como "Não classificado"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button
          onClick={handleProcess}
          className="bg-emerald-600 hover:bg-emerald-700"
          disabled={processing}
        >
          {processing ? "Processando..." : "Processar Dados"}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}