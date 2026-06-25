import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import type { ParsedFileData } from "@/contexts/AppContext";
import {
  ArrowLeft, ArrowRight, Trash2, GripVertical, Plus, X, Columns,
  Filter, ArrowUpDown, Replace, Trash, Type, Sigma, Layers, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { evaluateFormula, validateFormula } from "@/services/formulaEngine";
import { readStorage, removeStorage, writeStorage } from "@/services/storage";

type TransformType =
  | "rename"
  | "replace"
  | "calcColumn"
  | "filter"
  | "sort"
  | "groupBy"
  | "removeCol"
  | "changeType";

interface TransformStep {
  id: string;
  type: TransformType;
  label: string;
  column?: string;
  details: string;
  config: Record<string, any>;
}

const TYPE_ICONS: Record<TransformType, React.ReactNode> = {
  rename: <RefreshCw className="w-3.5 h-3.5" />,
  replace: <Replace className="w-3.5 h-3.5" />,
  calcColumn: <Sigma className="w-3.5 h-3.5" />,
  filter: <Filter className="w-3.5 h-3.5" />,
  sort: <ArrowUpDown className="w-3.5 h-3.5" />,
  groupBy: <Layers className="w-3.5 h-3.5" />,
  removeCol: <Trash className="w-3.5 h-3.5" />,
  changeType: <Type className="w-3.5 h-3.5" />,
};

const DATA_TYPES = ["texto", "número", "data", "moeda"];

export default function ETLPipeline() {
  const navigate = useNavigate();
  const { currentFile, setCurrentFile, currentProject } = useApp();

  const [steps, setSteps] = useState<TransformStep[]>([]);
  const [activeOp, setActiveOp] = useState<TransformType | null>(null);
  const [opForm, setOpForm] = useState<Record<string, any>>({});

  const storageKey = currentProject ? `dat-fin-etl-${currentProject.id}` : null;

  useEffect(() => {
    if (storageKey) {
      setSteps(readStorage<TransformStep[]>(storageKey, []));
    }
  }, [storageKey]);

  useEffect(() => {
    if (storageKey) {
      writeStorage(storageKey, steps);
    }
  }, [steps, storageKey]);

  const headers = useMemo(() => currentFile?.headers ?? [], [currentFile?.headers]);
  const baseData = useMemo(() => currentFile?.allData ?? [], [currentFile?.allData]);

  const columnTypes: Record<string, string> = useMemo(() => {
    const types: Record<string, string> = {};
    headers.forEach((h) => {
      const vals = baseData.slice(0, 30).map((r) => r[h]).filter((v) => v != null && v !== "");
      if (vals.length === 0) {
        types[h] = "texto";
        return;
      }
      const numeric = vals.filter((v) => {
        if (typeof v === "number") return true;
        const c = String(v).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
        return !isNaN(Number(c)) && c !== "";
      });
      if (numeric.length / vals.length > 0.7) {
        types[h] = "moeda";
      } else {
        types[h] = "texto";
      }
    });
    return types;
  }, [headers, baseData]);

  const transformedData = useMemo(() => {
    let data = [...baseData];
    const cols = new Set(headers);

    steps.forEach((step) => {
      try {
        switch (step.type) {
          case "rename": {
            const { col, newName } = step.config;
            data = data.map((row) => {
              const r = { ...row };
              if (col in r) {
                r[newName] = r[col];
                delete r[col];
              }
              return r;
            });
            break;
          }
          case "replace": {
            const { col, find, replaceWith } = step.config;
            data = data.map((row) => {
              const r = { ...row };
              if (col in r && typeof r[col] === "string") {
                r[col] = r[col].split(find).join(replaceWith);
              }
              return r;
            });
            break;
          }
          case "calcColumn": {
            const { col, formula } = step.config;
            data = data.map((row) => {
              const r = { ...row };
              try {
                r[col] = evaluateFormula(String(formula), r);
              } catch {
                r[col] = 0;
              }
              return r;
            });
            break;
          }
          case "filter": {
            const { col, operator, value } = step.config;
            const numVal = Number(
              String(value).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
            );
            data = data.filter((row) => {
              const raw = row[col];
              const cellNum = typeof raw === "number" ? raw : Number(
                String(raw || 0).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
              );
              switch (operator) {
                case ">": return cellNum > numVal;
                case "<": return cellNum < numVal;
                case "=": return cellNum === numVal || String(raw) === String(value);
                case ">=": return cellNum >= numVal;
                case "<=": return cellNum <= numVal;
                case "contém": return String(raw || "").toLowerCase().includes(String(value).toLowerCase());
                default: return true;
              }
            });
            break;
          }
          case "sort": {
            const { col, direction } = step.config;
            data = [...data].sort((a, b) => {
              const va = a[col];
              const vb = b[col];
              const na = typeof va === "number" ? va : Number(String(va || 0).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", "."));
              const nb = typeof vb === "number" ? vb : Number(String(vb || 0).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", "."));
              const cmp = isNaN(na) || isNaN(nb)
                ? String(va ?? "").localeCompare(String(vb ?? ""))
                : na - nb;
              return direction === "asc" ? cmp : -cmp;
            });
            break;
          }
          case "groupBy": {
            const { col, agg } = step.config;
            const grp: Record<string, { sum: number; count: number; vals: number[] }> = {};
            data.forEach((row) => {
              const key = String(row[col] ?? "(vazio)");
              if (!grp[key]) grp[key] = { sum: 0, count: 0, vals: [] };
              const v = typeof row[col] === "number" ? row[col] : Number(
                String(row[col] || 0).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
              );
              grp[key].sum += isNaN(v) ? 0 : v;
              grp[key].count += 1;
              grp[key].vals.push(isNaN(v) ? 0 : v);
            });
            data = Object.entries(grp).map(([key, grpData]) => {
              const vals = grpData.vals;
              let val = 0;
              if (agg === "soma") val = grpData.sum;
              else if (agg === "media") val = vals.reduce((s, v) => s + v, 0) / vals.length;
              else if (agg === "contagem") val = grpData.count;
              return { [col]: key, [`${agg}_${col}`]: round2(val) };
            });
            break;
          }
          case "removeCol": {
            const { col } = step.config;
            data = data.map((row) => {
              const r = { ...row };
              delete r[col];
              return r;
            });
            break;
          }
          case "changeType": {
            const { col, newType } = step.config;
            data = data.map((row) => {
              const r = { ...row };
              const raw = r[col];
              if (newType === "número" || newType === "moeda") {
                r[col] = typeof raw === "number" ? raw : Number(
                  String(raw || 0).replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".")
                );
              } else if (newType === "texto") {
                r[col] = String(raw ?? "");
              } else if (newType === "data") {
                r[col] = String(raw ?? "");
              }
              return r;
            });
            break;
          }
        }
      } catch {
        // skip malformed step
      }
    });
    return data;
  }, [baseData, steps, headers]);

  const currentHeaders = useMemo(() => {
    const hSet = new Set<string>();
    transformedData.slice(0, 1).forEach((row) => {
      Object.keys(row).forEach((k) => hSet.add(k));
    });
    if (hSet.size === 0) headers.forEach((h) => hSet.add(h));
    return [...hSet];
  }, [transformedData, headers]);

  const previewRows = useMemo(() => transformedData.slice(0, 20), [transformedData]);

  const startNewOperation = (type: TransformType) => {
    setActiveOp(type);
    setOpForm({ type });
  };

  const addStep = () => {
    if (!activeOp) return;
    let label = "";
    let details = "";
    const column = opForm.col || currentHeaders[0] || "";

    switch (activeOp) {
      case "rename":
        if (!opForm.col || !opForm.newName) {
          toast.error("Informe a coluna e o novo nome");
          return;
        }
        label = "Renomear coluna";
        details = `${opForm.col} → ${opForm.newName}`;
        break;
      case "replace":
        if (!opForm.col || opForm.find === undefined || opForm.replaceWith === undefined) {
          toast.error("Preencha a substituição completa");
          return;
        }
        label = "Substituir valores";
        details = `${opForm.col}: "${opForm.find}" → "${opForm.replaceWith}"`;
        break;
      case "calcColumn":
        if (!opForm.col) {
          toast.error("Informe o nome da nova coluna");
          return;
        }
        {
          const validation = validateFormula(String(opForm.formula || ""), currentHeaders);
          if (!validation.valid) {
            toast.error(validation.error ?? "Fórmula inválida");
            return;
          }
        }
        label = "Coluna calculada";
        details = `${opForm.col} = ${opForm.formula}`;
        break;
      case "filter":
        if (!opForm.col || !opForm.operator) {
          toast.error("Selecione coluna e operador");
          return;
        }
        label = "Filtrar linhas";
        details = `${opForm.col} ${opForm.operator} ${opForm.value}`;
        break;
      case "sort":
        if (!opForm.col || !opForm.direction) {
          toast.error("Selecione coluna e direção");
          return;
        }
        label = "Ordenar";
        details = `${opForm.col} ${opForm.direction === "asc" ? "crescente" : "decrescente"}`;
        break;
      case "groupBy":
        if (!opForm.col || !opForm.agg) {
          toast.error("Selecione coluna e agregação");
          return;
        }
        label = "Agrupar por";
        details = `${opForm.col} (${opForm.agg})`;
        break;
      case "removeCol":
        if (!opForm.col) {
          toast.error("Selecione a coluna a remover");
          return;
        }
        label = "Remover coluna";
        details = opForm.col;
        break;
      case "changeType":
        if (!opForm.col || !opForm.newType) {
          toast.error("Selecione coluna e novo tipo");
          return;
        }
        label = "Alterar tipo";
        details = `${opForm.col} → ${opForm.newType}`;
        break;
    }

    setSteps((prev) => [
      ...prev,
      { id: crypto.randomUUID(), type: activeOp, label, column, details, config: { ...opForm } },
    ]);
    setActiveOp(null);
    setOpForm({});
    toast.success("Etapa adicionada ao pipeline");
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleReorder = (reordered: TransformStep[]) => {
    setSteps(reordered);
  };

  const handleContinue = () => {
    const finalHeaders = currentHeaders;
    const finalData = transformedData;
    if (currentFile && currentFile.name) {
      setCurrentFile({
        ...currentFile,
        headers: finalHeaders,
        allData: finalData,
        preview: finalData.slice(0, 20),
      });
    }
    toast.success("Transformações aplicadas aos dados");
    navigate("/mapping");
  };

  if (!currentFile || headers.length === 0) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ETL / Power Query</h1>
            <p className="text-slate-500 mt-1">Nenhum arquivo carregado. Volte e faça o upload primeiro.</p>
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ETL / Power Query</h1>
          <p className="text-slate-500 mt-1">
            Transforme seus dados — {baseData.length} linhas • {headers.length} colunas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/import")} className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <Button onClick={handleContinue} className="bg-emerald-600 hover:bg-emerald-700">
            Continuar para Mapeamento
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* LEFT SIDEBAR - Columns */}
        <div className="col-span-2">
          <Card className="border-slate-200 sticky top-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Columns className="w-4 h-4 text-emerald-600" />
                <h2 className="font-semibold text-sm text-slate-900">Colunas</h2>
              </div>
              <div className="space-y-1">
                {headers.map((h) => (
                  <div key={h} className="flex items-center justify-between px-2 py-1.5 rounded-md bg-slate-50 text-xs">
                    <span className="truncate font-medium text-slate-700 max-w-[100px]">{h}</span>
                    <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                      {columnTypes[h] || "texto"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MAIN AREA - Preview Table + Operations */}
        <div className="col-span-7 space-y-4">
          {/* Operations toolbar */}
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500 mr-1">Transformar:</span>
                {([
                  { type: "rename" as TransformType, label: "Renomear" },
                  { type: "replace" as TransformType, label: "Substituir" },
                  { type: "calcColumn" as TransformType, label: "Col. Calculada" },
                  { type: "filter" as TransformType, label: "Filtrar" },
                  { type: "sort" as TransformType, label: "Ordenar" },
                  { type: "groupBy" as TransformType, label: "Agrupar" },
                  { type: "removeCol" as TransformType, label: "Remover Col." },
                  { type: "changeType" as TransformType, label: "Alterar Tipo" },
                ]).map(({ type, label }) => (
                  <button
                    key={type}
                    onClick={() => startNewOperation(type)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      activeOp === type
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {TYPE_ICONS[type]}
                    {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Operation form */}
          <AnimatePresence>
            {activeOp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-emerald-300 bg-emerald-50/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-emerald-900">
                        {activeOp === "rename" && "Renomear coluna"}
                        {activeOp === "replace" && "Substituir valores"}
                        {activeOp === "calcColumn" && "Criar coluna calculada"}
                        {activeOp === "filter" && "Filtrar linhas"}
                        {activeOp === "sort" && "Ordenar por coluna"}
                        {activeOp === "groupBy" && "Agrupar por coluna"}
                        {activeOp === "removeCol" && "Remover coluna"}
                        {activeOp === "changeType" && "Alterar tipo de dados"}
                      </h3>
                      <button onClick={() => setActiveOp(null)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-end gap-3">
                      {activeOp !== "calcColumn" && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Coluna</label>
                          <Select value={opForm.col || ""} onValueChange={(v) => setOpForm({ ...opForm, col: v })}>
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue placeholder="Selecionar coluna" />
                            </SelectTrigger>
                            <SelectContent>
                              {currentHeaders.map((h) => (
                                <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {activeOp === "rename" && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Novo nome</label>
                          <Input
                            value={opForm.newName || ""}
                            onChange={(e) => setOpForm({ ...opForm, newName: e.target.value })}
                            className="h-8 text-xs w-40"
                            placeholder="Novo nome"
                          />
                        </div>
                      )}

                      {activeOp === "replace" && (
                        <>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Buscar</label>
                            <Input
                              value={opForm.find || ""}
                              onChange={(e) => setOpForm({ ...opForm, find: e.target.value })}
                              className="h-8 text-xs w-40"
                              placeholder="Texto a buscar"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Substituir por</label>
                            <Input
                              value={opForm.replaceWith || ""}
                              onChange={(e) => setOpForm({ ...opForm, replaceWith: e.target.value })}
                              className="h-8 text-xs w-40"
                              placeholder="Novo valor"
                            />
                          </div>
                        </>
                      )}

                      {activeOp === "calcColumn" && (
                        <>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Nome da nova coluna</label>
                            <Input
                              value={opForm.col || ""}
                              onChange={(e) => setOpForm({ ...opForm, col: e.target.value })}
                              className="h-8 text-xs w-40"
                              placeholder="ex: resultado"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Fórmula</label>
                            <Input
                              value={opForm.formula || ""}
                              onChange={(e) => setOpForm({ ...opForm, formula: e.target.value })}
                              className="h-8 text-xs w-64 font-mono"
                              placeholder="ex: [Quantidade] * [Preco Unitario]"
                            />
                          </div>
                        </>
                      )}

                      {activeOp === "filter" && (
                        <>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Operador</label>
                            <Select value={opForm.operator || ""} onValueChange={(v) => setOpForm({ ...opForm, operator: v })}>
                              <SelectTrigger className="w-28 h-8 text-xs">
                                <SelectValue placeholder="Operador" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value=">" className="text-xs">&gt; (maior que)</SelectItem>
                                <SelectItem value="<" className="text-xs">&lt; (menor que)</SelectItem>
                                <SelectItem value="=" className="text-xs">= (igual a)</SelectItem>
                                <SelectItem value=">=" className="text-xs">&gt;= (maior ou igual)</SelectItem>
                                <SelectItem value="<=" className="text-xs">&lt;= (menor ou igual)</SelectItem>
                                <SelectItem value="contém" className="text-xs">contém</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Valor</label>
                            <Input
                              value={opForm.value || ""}
                              onChange={(e) => setOpForm({ ...opForm, value: e.target.value })}
                              className="h-8 text-xs w-32"
                              placeholder="Valor"
                            />
                          </div>
                        </>
                      )}

                      {activeOp === "sort" && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Direção</label>
                          <Select value={opForm.direction || ""} onValueChange={(v) => setOpForm({ ...opForm, direction: v })}>
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue placeholder="Direção" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="asc" className="text-xs">Crescente</SelectItem>
                              <SelectItem value="desc" className="text-xs">Decrescente</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {activeOp === "groupBy" && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Agregação</label>
                          <Select value={opForm.agg || ""} onValueChange={(v) => setOpForm({ ...opForm, agg: v })}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Agregação" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="soma" className="text-xs">Soma</SelectItem>
                              <SelectItem value="media" className="text-xs">Média</SelectItem>
                              <SelectItem value="contagem" className="text-xs">Contagem</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {activeOp === "changeType" && (
                        <div>
                          <label className="text-xs text-slate-500 mb-1 block">Novo tipo</label>
                          <Select value={opForm.newType || ""} onValueChange={(v) => setOpForm({ ...opForm, newType: v })}>
                            <SelectTrigger className="w-28 h-8 text-xs">
                              <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              {DATA_TYPES.map((dt) => (
                                <SelectItem key={dt} value={dt} className="text-xs">{dt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <Button onClick={addStep} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-8 text-xs">
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Adicionar etapa
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview table */}
          <Card className="border-slate-200">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-slate-600 w-10">#</th>
                      {currentHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium text-slate-600 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                        {currentHeaders.map((h) => (
                          <td key={h} className="px-3 py-1.5 text-slate-700 whitespace-nowrap max-w-[180px] truncate">
                            {row[h] != null ? String(row[h]) : "-"}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {previewRows.length === 0 && (
                      <tr>
                        <td colSpan={currentHeaders.length + 1} className="px-3 py-8 text-center text-slate-400">
                          Nenhum dado disponível
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-t bg-slate-50 text-xs text-slate-500">
                Exibindo {previewRows.length} de {transformedData.length} linhas
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL - Steps */}
        <div className="col-span-3">
          <Card className="border-slate-200 sticky top-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm text-slate-900">Etapas Aplicadas</h2>
                <span className="text-xs text-slate-400">{steps.length} etapa(s)</span>
              </div>

              {steps.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Nenhuma transformação aplicada. Use a barra de ferramentas acima para começar.
                </p>
              ) : (
                <Reorder.Group axis="y" values={steps} onReorder={handleReorder} className="space-y-1.5">
                  <AnimatePresence>
                    {steps.map((step, i) => (
                      <Reorder.Item key={step.id} value={step}>
                        <motion.div
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 group"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 mt-0.5 cursor-grab shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-emerald-600">{TYPE_ICONS[step.type]}</span>
                              <span className="text-xs font-medium text-slate-700 truncate">{step.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5 truncate">{step.details}</p>
                          </div>
                          <button
                            onClick={() => removeStep(step.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
              )}

              {steps.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-3 text-xs text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    setSteps([]);
                    if (storageKey) {
                      removeStorage(storageKey);
                    }
                    toast.success("Todas as etapas foram removidas");
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Limpar todas as etapas
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
