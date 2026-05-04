import { useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "@/contexts/AppContext";
import { RealUploadArea } from "@/components/RealUploadArea";
import { useExcelParser } from "@/hooks/useExcelParser";
import { ArrowLeft, ArrowRight, Table2, Link as LinkIcon, Trash2, Plus, Rows3, Columns3, FileSpreadsheet, GitBranch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildMergedDataset } from "@/services/relationshipEngine";

interface ImportedTable {
  id: string;
  name: string;
  fileName: string;
  headers: string[];
  allData: Record<string, unknown>[];
  rowCount: number;
  colCount: number;
}

interface FormRelationship {
  id: string;
  leftTableId: string;
  leftColumn: string;
  rightTableId: string;
  rightColumn: string;
  joinType: "inner" | "left";
}

const JOIN_LABELS: Record<string, string> = {
  inner: "Interna (INNER)",
  left: "Esquerda (LEFT)",
};

export default function Relationships() {
  const navigate = useNavigate();
  const {
    currentFile,
    setCurrentFile,
    additionalTables,
    tableRelationships,
    addTable,
    removeTable,
    addRelationship,
    removeRelationship,
  } = useApp();
  const { parse, parsing } = useExcelParser();
  const [showRelationForm, setShowRelationForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    leftTableId: "",
    leftColumn: "",
    rightTableId: "",
    rightColumn: "",
    joinType: "inner" as "inner" | "left",
  });

  const primaryTable = useMemo<ImportedTable | null>(() => {
    if (!currentFile) {
      return null;
    }

    return {
      id: "primary",
      name: currentFile.selectedSheet || currentFile.name,
      fileName: currentFile.name,
      headers: currentFile.headers,
      allData: currentFile.allData,
      rowCount: currentFile.allData.length,
      colCount: currentFile.headers.length,
    };
  }, [currentFile]);

  const tables = useMemo<ImportedTable[]>(() => {
    const extras = additionalTables.map((table) => ({
      id: table.id,
      name: table.name,
      fileName: table.fileName,
      headers: table.headers,
      allData: table.data,
      rowCount: table.rowCount,
      colCount: table.headers.length,
    }));

    return primaryTable ? [primaryTable, ...extras] : extras;
  }, [additionalTables, primaryTable]);

  const relationships = useMemo<FormRelationship[]>(
    () =>
      tableRelationships.map((relationship) => ({
        id: relationship.id,
        leftTableId: relationship.leftTable,
        leftColumn: relationship.leftColumn,
        rightTableId: relationship.rightTable,
        rightColumn: relationship.rightColumn,
        joinType: relationship.joinType,
      })),
    [tableRelationships],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      const result = await parse(file);
      if (!result || result.sheets.length === 0) {
        toast.error("Erro ao processar arquivo. Verifique se é um Excel válido.");
        return;
      }

      const sheet = result.sheets[0];
      addTable({
        id: crypto.randomUUID(),
        name: sheet.name,
        fileName: result.fileName,
        headers: sheet.headers,
        data: sheet.data,
        rowCount: sheet.rowCount,
      });

      toast.success(`Tabela "${sheet.name}" importada — ${sheet.rowCount} linhas, ${sheet.headers.length} colunas`);
    },
    [addTable, parse],
  );

  const handleRemoveTable = (id: string) => {
    if (id === "primary") {
      toast.error("A tabela principal não pode ser removida");
      return;
    }

    removeTable(id);
    toast.success("Tabela removida");
  };

  const handleAddRelationship = () => {
    const { leftTableId, leftColumn, rightTableId, rightColumn, joinType } = contactForm;

    if (!leftTableId || !leftColumn || !rightTableId || !rightColumn) {
      toast.error("Preencha todos os campos do relacionamento");
      return;
    }

    if (leftTableId === rightTableId && leftColumn === rightColumn) {
      toast.error("Não é possível relacionar uma coluna com ela mesma");
      return;
    }

    addRelationship({
      id: crypto.randomUUID(),
      leftTable: leftTableId,
      leftColumn,
      rightTable: rightTableId,
      rightColumn,
      joinType,
    });

    setShowRelationForm(false);
    setContactForm({ leftTableId: "", leftColumn: "", rightTableId: "", rightColumn: "", joinType: "inner" });
    toast.success("Relacionamento criado");
  };

  const tableMap = useMemo(() => {
    const map: Record<string, ImportedTable> = {};
    tables.forEach((table) => {
      map[table.id] = table;
    });
    return map;
  }, [tables]);

  const cardPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number; w: number; h: number }> = {};
    tables.forEach((table, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      positions[table.id] = { x: 40 + col * 280, y: 60 + row * 180, w: 240, h: 130 };
    });
    return positions;
  }, [tables]);

  const handleContinue = async () => {
    if (!currentFile || !primaryTable) {
      toast.error("Carregue uma tabela principal antes de continuar");
      return;
    }

    if (relationships.length > 0) {
      const merged = buildMergedDataset(
        {
          id: primaryTable.id,
          name: primaryTable.name,
          headers: primaryTable.headers,
          data: primaryTable.allData,
        },
        additionalTables.map((table) => ({
          id: table.id,
          name: table.name,
          headers: table.headers,
          data: table.data,
        })),
        tableRelationships,
      );

      await setCurrentFile({
        ...currentFile,
        headers: merged.headers,
        allData: merged.data,
        preview: merged.data.slice(0, 20),
      });
    }

    toast.success("Relacionamentos aplicados aos dados");
    navigate("/mapping");
  };

  const getTableById = (id: string) => tableMap[id];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Relacionamentos entre Tabelas</h1>
          <p className="text-slate-500 mt-1">Defina como as tabelas se relacionam para análises cruzadas</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/etl")} className="flex items-center gap-2 text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <Button onClick={handleContinue} className="bg-emerald-600 hover:bg-emerald-700">
            Continuar para Mapeamento
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Importar Tabela Adicional</h2>
                </div>
                {tables.length > 1 && <span className="text-xs text-slate-400">{tables.length} tabelas importadas</span>}
              </div>
              <RealUploadArea onUpload={handleUpload} isProcessing={parsing} />
            </CardContent>
          </Card>

          {tables.length > 0 && (
            <div>
              <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                <Table2 className="w-4 h-4 text-emerald-600" />
                Tabelas Importadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <AnimatePresence>
                  {tables.map((table) => (
                    <motion.div key={table.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
                      <Card className="border-slate-200 hover:border-emerald-300 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-emerald-100 rounded-lg">
                                <Table2 className="w-4 h-4 text-emerald-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm text-slate-900 truncate max-w-[140px]">{table.name}</p>
                                {table.id === "primary" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">Principal</span>}
                              </div>
                            </div>
                            {table.id !== "primary" && (
                              <button onClick={() => handleRemoveTable(table.id)} className="text-slate-400 hover:text-red-500">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{table.fileName}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-600">
                            <span className="flex items-center gap-1"><Rows3 className="w-3 h-3" />{table.rowCount} linhas</span>
                            <span className="flex items-center gap-1"><Columns3 className="w-3 h-3" />{table.colCount} colunas</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {relationships.length > 0 && (
            <Card className="border-slate-200">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <GitBranch className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Diagrama de Relacionamentos</h2>
                </div>
                <div className="relative w-full overflow-x-auto">
                  <svg width={Math.max(900, tables.length * 290)} height={Math.max(300, Math.ceil(tables.length / 3) * 190)} className="mx-auto">
                    {tables.map((table) => {
                      const pos = cardPositions[table.id];
                      if (!pos) {
                        return null;
                      }

                      return (
                        <g key={table.id}>
                          <rect x={pos.x} y={pos.y} width={pos.w} height={pos.h} rx={8} fill={table.id === "primary" ? "#ecfdf5" : "#f8fafc"} stroke={table.id === "primary" ? "#10b981" : "#cbd5e1"} strokeWidth={1.5} />
                          <text x={pos.x + 12} y={pos.y + 26} fontSize={12} fontWeight={600} fill="#0f172a">{table.name.length > 22 ? `${table.name.slice(0, 22)}…` : table.name}</text>
                          <text x={pos.x + 12} y={pos.y + 48} fontSize={10} fill="#64748b">{table.rowCount} linhas · {table.colCount} colunas</text>
                          <text x={pos.x + 12} y={pos.y + 66} fontSize={9} fill="#94a3b8">{table.fileName.length > 28 ? `${table.fileName.slice(0, 28)}…` : table.fileName}</text>
                          {table.id === "primary" && (
                            <>
                              <rect x={pos.x + 12} y={pos.y + 76} width={48} height={16} rx={3} fill="#d1fae5" />
                              <text x={pos.x + 18} y={pos.y + 88} fontSize={9} fontWeight={500} fill="#059669">Principal</text>
                            </>
                          )}
                        </g>
                      );
                    })}

                    {relationships.map((relationship) => {
                      const left = cardPositions[relationship.leftTableId];
                      const right = cardPositions[relationship.rightTableId];
                      if (!left || !right) {
                        return null;
                      }

                      const x1 = left.x + left.w;
                      const y1 = left.y + left.h / 2;
                      const x2 = right.x;
                      const y2 = right.y + right.h / 2;
                      const midX = (x1 + x2) / 2;

                      return (
                        <g key={relationship.id}>
                          <path d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`} fill="none" stroke={relationship.joinType === "inner" ? "#8b5cf6" : "#3b82f6"} strokeWidth={1.5} strokeDasharray={relationship.joinType === "left" ? "6 3" : "none"} />
                          <circle cx={x1} cy={y1} r={3} fill={relationship.joinType === "inner" ? "#8b5cf6" : "#3b82f6"} />
                          <circle cx={x2} cy={y2} r={3} fill={relationship.joinType === "inner" ? "#8b5cf6" : "#3b82f6"} />
                          <rect x={midX - 40} y={(y1 + y2) / 2 - 12} width={80} height={18} rx={4} fill="white" stroke={relationship.joinType === "inner" ? "#8b5cf6" : "#3b82f6"} strokeWidth={0.5} />
                          <text x={midX} y={(y1 + y2) / 2} textAnchor="middle" fontSize={8} fill={relationship.joinType === "inner" ? "#8b5cf6" : "#3b82f6"}>{JOIN_LABELS[relationship.joinType]}</text>
                          <text x={(x1 + midX) / 2} y={y1 - 6} textAnchor="middle" fontSize={8} fill="#64748b">{relationship.leftColumn}</text>
                          <text x={(x2 + midX) / 2} y={y2 - 6} textAnchor="middle" fontSize={8} fill="#64748b">{relationship.rightColumn}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-emerald-600" />
                  <h2 className="font-semibold text-slate-900">Relacionamentos</h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => {
                    if (tables.length < 2) {
                      toast.error("Importe pelo menos 2 tabelas para criar relacionamentos");
                      return;
                    }

                    setShowRelationForm(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Novo
                </Button>
              </div>

              <AnimatePresence>
                {showRelationForm && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-3">
                    <Card className="border-emerald-300 bg-emerald-50/50">
                      <CardContent className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-emerald-900">Novo Relacionamento</span>
                          <button onClick={() => setShowRelationForm(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <Label className="text-[10px] text-slate-500">Tabela Esquerda</Label>
                          <Select value={contactForm.leftTableId} onValueChange={(value) => setContactForm({ ...contactForm, leftTableId: value, leftColumn: "" })}>
                            <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue placeholder="Selecionar tabela" /></SelectTrigger>
                            <SelectContent>{tables.map((table) => <SelectItem key={table.id} value={table.id} className="text-xs">{table.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px] text-slate-500">Coluna Esquerda</Label>
                          <Select value={contactForm.leftColumn} onValueChange={(value) => setContactForm({ ...contactForm, leftColumn: value })}>
                            <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                            <SelectContent>{(tableMap[contactForm.leftTableId]?.headers || []).map((header) => <SelectItem key={header} value={header} className="text-xs">{header}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px] text-slate-500">Tabela Direita</Label>
                          <Select value={contactForm.rightTableId} onValueChange={(value) => setContactForm({ ...contactForm, rightTableId: value, rightColumn: "" })}>
                            <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue placeholder="Selecionar tabela" /></SelectTrigger>
                            <SelectContent>{tables.map((table) => <SelectItem key={table.id} value={table.id} className="text-xs">{table.name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px] text-slate-500">Coluna Direita</Label>
                          <Select value={contactForm.rightColumn} onValueChange={(value) => setContactForm({ ...contactForm, rightColumn: value })}>
                            <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                            <SelectContent>{(tableMap[contactForm.rightTableId]?.headers || []).map((header) => <SelectItem key={header} value={header} className="text-xs">{header}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px] text-slate-500">Tipo de Junção</Label>
                          <Select value={contactForm.joinType} onValueChange={(value: "inner" | "left") => setContactForm({ ...contactForm, joinType: value })}>
                            <SelectTrigger className="h-7 text-xs mt-0.5"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inner" className="text-xs">Interna (INNER)</SelectItem>
                              <SelectItem value="left" className="text-xs">Esquerda (LEFT)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button onClick={handleAddRelationship} size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 h-7 text-xs">
                          Criar Relacionamento
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {relationships.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">{tables.length < 2 ? "Importe mais tabelas para criar relacionamentos" : "Nenhum relacionamento definido"}</p>
              ) : (
                <div className="space-y-2">
                  {relationships.map((relationship) => {
                    const leftTable = getTableById(relationship.leftTableId);
                    const rightTable = getTableById(relationship.rightTableId);
                    return (
                      <motion.div key={relationship.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 text-xs">
                            <span className="font-medium text-slate-700 truncate">{leftTable?.name || "?"}.{relationship.leftColumn}</span>
                            <span className="text-[10px] px-1 py-0.5 rounded font-medium bg-violet-100 text-violet-700">{JOIN_LABELS[relationship.joinType]}</span>
                            <span className="font-medium text-slate-700 truncate">{rightTable?.name || "?"}.{relationship.rightColumn}</span>
                          </div>
                        </div>
                        <button onClick={() => removeRelationship(relationship.id)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
