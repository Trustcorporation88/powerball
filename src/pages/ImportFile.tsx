import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { UploadArea } from "@/components/UploadArea";
import { ArrowLeft, ArrowRight, FileSpreadsheet, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockPreviewData } from "@/data/mockData";
import { toast } from "sonner";

export default function ImportFile() {
  const navigate = useNavigate();
  const { setCurrentFile } = useApp();
  const [uploaded, setUploaded] = useState(false);
  const [selectedSheet, setSelectedSheet] = useState("Plan1");

  const sheets = ["Plan1", "Dados", "Resumo"];

  const handleUpload = (file: File) => {
    setCurrentFile({ name: file.name, sheets, preview: mockPreviewData });
    setUploaded(true);
    toast.success(`Arquivo "${file.name}" carregado com sucesso!`);
  };

  const handleContinue = () => {
    navigate("/mapping");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Importar Arquivo</h1>
          <p className="text-slate-500 mt-1">Envie sua planilha para análise</p>
        </div>
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
      </div>

      {!uploaded ? (
        <UploadArea onUpload={handleUpload} />
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">dados_financeiros_q1.xlsx</p>
                  <p className="text-sm text-slate-500">3 abas detectadas • 1.240 linhas</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                {sheets.map((sheet) => (
                  <button
                    key={sheet}
                    onClick={() => setSelectedSheet(sheet)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedSheet === sheet
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {sheet}
                  </button>
                ))}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b">
                      <tr>
                        {Object.keys(mockPreviewData[0]).map((col) => (
                          <th key={col} className="px-4 py-3 text-left font-medium text-slate-700">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {mockPreviewData.map((row, i) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2.5 text-slate-600">
                              {typeof val === "number" ? val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : val}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-t">
                  Mostrando 8 de 1.240 linhas • Aba: {selectedSheet}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
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