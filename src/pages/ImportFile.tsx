import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { RealUploadArea } from "@/components/RealUploadArea";
import { SheetPreview } from "@/components/SheetPreview";
import { useExcelParser } from "@/hooks/useExcelParser";
import { ParsedSheet } from "@/utils/excelParser";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function ImportFile() {
  const navigate = useNavigate();
  const { setCurrentFile } = useApp();
  const { parse, parsing } = useExcelParser();
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [fileName, setFileName] = useState("");

  const handleUpload = async (file: File) => {
    const result = await parse(file);
    if (result && result.sheets.length > 0) {
      setFileName(result.fileName);
      setParsedSheets(result.sheets);
      const firstSheet = result.sheets[0];
      setSelectedSheet(firstSheet.name);
      
      // Salva todos os dados da aba selecionada no contexto
      setCurrentFile({ 
        name: file.name, 
        sheets: result.sheets.map((s) => s.name), 
        selectedSheet: firstSheet.name,
        headers: firstSheet.headers,
        preview: firstSheet.data.slice(0, 20),
        allData: firstSheet.data,
      });
      
      toast.success(`Arquivo "${file.name}" carregado — ${result.sheets.length} aba(s), ${firstSheet.rowCount} linhas`);
    } else {
      toast.error("Erro ao processar arquivo. Verifique se é um Excel válido com dados.");
    }
  };

  const currentSheet = parsedSheets.find((s) => s.name === selectedSheet);

  const handleSelectSheet = (sheetName: string) => {
    setSelectedSheet(sheetName);
    const sheet = parsedSheets.find((s) => s.name === sheetName);
    if (sheet) {
      setCurrentFile((prev) => prev ? {
        ...prev,
        selectedSheet: sheetName,
        headers: sheet.headers,
        preview: sheet.data.slice(0, 20),
        allData: sheet.data,
      } : null);
    }
  };

  const handleContinue = () => {
    if (!currentSheet || currentSheet.headers.length === 0) {
      toast.error("Selecione uma aba com dados para continuar");
      return;
    }
    navigate("/mapping");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Arquivo</h1>
          <p className="text-slate-500 mt-1">Envie sua planilha para análise — leitura real de Excel</p>
        </div>
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {!parsedSheets.length ? (
        <RealUploadArea onUpload={handleUpload} isProcessing={parsing} />
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              {currentSheet && (
                <SheetPreview
                  sheet={currentSheet}
                  isSelected={true}
                  onSelect={() => {}}
                />
              )}
            </CardContent>
          </Card>

          {parsedSheets.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {parsedSheets.map((sheet) => (
                <button
                  key={sheet.name}
                  onClick={() => handleSelectSheet(sheet.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSheet === sheet.name
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sheet.name} ({sheet.rowCount} linhas)
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              Arquivo: <span className="font-medium">{fileName}</span> • Aba: <span className="font-medium">{selectedSheet}</span> • {currentSheet?.rowCount || 0} linhas • {currentSheet?.headers.length || 0} colunas
            </p>
            <Button onClick={handleContinue} className="bg-emerald-600 hover:bg-emerald-700">
              Continuar para Mapeamento
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}