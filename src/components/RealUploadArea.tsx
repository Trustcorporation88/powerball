import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealUploadAreaProps {
  onUpload: (file: File) => void;
  isProcessing?: boolean;
}

export const RealUploadArea = ({ onUpload, isProcessing }: RealUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xlsm") || file.name.endsWith(".csv"))) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onUpload(file);
    },
    [onUpload]
  );

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 text-center transition-colors",
        isProcessing ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
        isDragging
          ? "border-emerald-500 bg-emerald-50"
          : "border-slate-300 bg-white hover:border-slate-400"
      )}
    >
      <input
        type="file"
        accept=".xlsx,.xlsm,.csv"
        onChange={handleFileInput}
        className="hidden"
        id="file-upload"
        disabled={isProcessing}
      />
      <label htmlFor="file-upload" className={cn("block", isProcessing && "pointer-events-none")}>
        <div className="flex justify-center gap-3 mb-4">
          <div className="p-3 bg-emerald-100 rounded-xl">
            <FileSpreadsheet className="w-8 h-8 text-emerald-600" />
          </div>
          <div className="p-3 bg-blue-100 rounded-xl">
            <FileText className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        {isProcessing ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
            <p className="text-lg font-semibold text-slate-700 mb-1">Processando arquivo...</p>
            <p className="text-sm text-slate-500">Lendo abas e detectando colunas</p>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-700 mb-1">
              Arraste seu arquivo aqui ou clique para selecionar
            </p>
            <p className="text-sm text-slate-500">
              Aceitamos arquivos .xlsx, .xlsm e .csv
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
              <Upload className="w-4 h-4" />
              Selecionar arquivo
            </div>
          </>
        )}
      </label>
    </div>
  );
};