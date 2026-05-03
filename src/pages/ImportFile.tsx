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
    if (result) {
      setFileName(result.fileName);
      setParsedSheets(result.sheets);
      setSelectedSheet(result.sheets[0]?.name || "");
      setCurrentFile({ 
        name: file.name, 
        sheets: result.sheets.map((s) => s.name), 
        preview: result.sheets[0]?.data || [] 
      });
      toast.success(`Arquivo "${file.name}" carregado — ${result.sheets.length} aba(s) detectada(s)`);
    } else {
      toast.error("Erro ao processar arquivo. Verifique se é um Excel válido.");
    }
  };

  const currentSheet = parsedSheets.find((s) => s.name === selectedSheet);

  const handleContinue = () => {
    if (!currentSheet) {
      toast.error("Selecione uma aba para continuar");
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
                  onClick={() => setSelectedSheet(sheet.name)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedSheet === sheet.name
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {sheet.name}
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              Arquivo: <span className="font-medium">{fileName}</span> • {parsedSheets.length} aba(s)
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