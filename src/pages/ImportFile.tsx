import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { RealUploadArea } from "@/components/RealUploadArea";
import { SheetPreview } from "@/components/SheetPreview";
import { useExcelParser } from "@/hooks/useExcelParser";
import { ParsedSheet } from "@/utils/excelParser";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

type ImportMode = "single" | "combine";

function normalizeHeaders(headers: string[]): string[] {
  return headers.map((header) => header.trim().toLowerCase());
}

function hasSameStructure(left: ParsedSheet, right: ParsedSheet): boolean {
  const leftHeaders = normalizeHeaders(left.headers);
  const rightHeaders = normalizeHeaders(right.headers);

  if (leftHeaders.length !== rightHeaders.length) {
    return false;
  }

  return leftHeaders.every((header, index) => header === rightHeaders[index]);
}

export default function ImportFile() {
  const navigate = useNavigate();
  const { currentProject, currentFile, setCurrentFile } = useApp();
  const { parse, parsing } = useExcelParser();
  const initialStoredSheets = useMemo(
    () => Array.isArray(currentFile?.sheets)
      ? currentFile.sheets.filter((sheet): sheet is ParsedSheet =>
          typeof sheet === "object" &&
          sheet !== null &&
          "name" in sheet &&
          "headers" in sheet &&
          "data" in sheet,
        )
      : [],
    [currentFile?.sheets],
  );
  const [parsedSheets, setParsedSheets] = useState<ParsedSheet[]>(initialStoredSheets);
  const [selectedSheet, setSelectedSheet] = useState<string>(
    currentFile?.selectedSheets?.[0] || currentFile?.selectedSheet || initialStoredSheets[0]?.name || "",
  );
  const [selectedSheets, setSelectedSheets] = useState<string[]>(
    currentFile?.selectedSheets && currentFile.selectedSheets.length > 0
      ? currentFile.selectedSheets
      : currentFile?.selectedSheet
        ? [currentFile.selectedSheet]
        : initialStoredSheets[0]?.name
          ? [initialStoredSheets[0].name]
          : [],
  );
  const [importMode, setImportMode] = useState<ImportMode>(currentFile?.importMode ?? "single");
  const [fileName, setFileName] = useState(currentFile?.name ?? "");

  useEffect(() => {
    if (!currentFile) {
      setParsedSheets([]);
      setSelectedSheet("");
      setSelectedSheets([]);
      setImportMode("single");
      setFileName("");
      return;
    }

    const storedSheets = Array.isArray(currentFile.sheets)
      ? currentFile.sheets.filter((sheet): sheet is ParsedSheet =>
          typeof sheet === "object" &&
          sheet !== null &&
          "name" in sheet &&
          "headers" in sheet &&
          "data" in sheet,
        )
      : [];

    setParsedSheets(storedSheets);
    setSelectedSheet(currentFile.selectedSheets?.[0] || currentFile.selectedSheet || storedSheets[0]?.name || "");
    setSelectedSheets(
      currentFile.selectedSheets && currentFile.selectedSheets.length > 0
        ? currentFile.selectedSheets
        : currentFile.selectedSheet
          ? [currentFile.selectedSheet]
          : storedSheets[0]?.name
            ? [storedSheets[0].name]
            : [],
    );
    setImportMode(currentFile.importMode ?? "single");
    setFileName(currentFile.name ?? "");
  }, [currentFile]);

  const currentSheet = useMemo(
    () => parsedSheets.find((sheet) => sheet.name === selectedSheet),
    [parsedSheets, selectedSheet],
  );

  const compatibleSheets = useMemo(() => {
    if (!currentSheet) {
      return [];
    }

    return parsedSheets.filter((sheet) => hasSameStructure(currentSheet, sheet));
  }, [currentSheet, parsedSheets]);

  const combinedSelection = useMemo(() => {
    if (!currentSheet) {
      return null;
    }

    const compatibleNames = new Set(compatibleSheets.map((sheet) => sheet.name));
    const validSelectedSheets = selectedSheets.filter((sheetName) => compatibleNames.has(sheetName));
    const effectiveSelectedSheets = validSelectedSheets.length > 0 ? validSelectedSheets : [currentSheet.name];
    const selectedSheetObjects = compatibleSheets.filter((sheet) => effectiveSelectedSheets.includes(sheet.name));
    const allData = selectedSheetObjects.flatMap((sheet) => sheet.data);

    return {
      selectedSheetObjects,
      validSelectedSheets: effectiveSelectedSheets,
      headers: currentSheet.headers,
      preview: allData.slice(0, 20),
      allData,
    };
  }, [compatibleSheets, currentSheet, selectedSheets]);

  const syncCurrentFile = (
    nextParsedSheets: ParsedSheet[],
    nextSelectedSheet: string,
    nextSelectedSheets: string[],
    nextImportMode: ImportMode,
    nextFileName: string,
  ) => {
    const referenceSheet = nextParsedSheets.find((sheet) => sheet.name === nextSelectedSheet);
    if (!referenceSheet) {
      return;
    }

    if (nextImportMode === "combine") {
      const compatible = nextParsedSheets.filter((sheet) => hasSameStructure(referenceSheet, sheet));
      const compatibleNames = new Set(compatible.map((sheet) => sheet.name));
      const validSelectedSheets = nextSelectedSheets.filter((sheetName) => compatibleNames.has(sheetName));
      const effectiveSelectedSheets = validSelectedSheets.length > 0 ? validSelectedSheets : [referenceSheet.name];
      const selectedSheetObjects = compatible.filter((sheet) => effectiveSelectedSheets.includes(sheet.name));
      const allData = selectedSheetObjects.flatMap((sheet) => sheet.data);

      void setCurrentFile({
        name: nextFileName,
        sheets: nextParsedSheets,
        selectedSheet: selectedSheetObjects.length === 1 ? selectedSheetObjects[0].name : `${selectedSheetObjects.length} abas combinadas`,
        selectedSheets: effectiveSelectedSheets,
        importMode: "combine",
        headers: referenceSheet.headers,
        preview: allData.slice(0, 20),
        allData,
      });
      return;
    }

    void setCurrentFile({
      name: nextFileName,
      sheets: nextParsedSheets,
      selectedSheet: referenceSheet.name,
      selectedSheets: [referenceSheet.name],
      importMode: "single",
      headers: referenceSheet.headers,
      preview: referenceSheet.data.slice(0, 20),
      allData: referenceSheet.data,
    });
  };

  const handleUpload = async (file: File) => {
    const result = await parse(file);
    if (result && result.sheets.length > 0) {
      const firstSheet = result.sheets[0];

      setFileName(result.fileName);
      setParsedSheets(result.sheets);
      setSelectedSheet(firstSheet.name);
      setSelectedSheets([firstSheet.name]);
      setImportMode("single");
      syncCurrentFile(result.sheets, firstSheet.name, [firstSheet.name], "single", file.name);

      toast.success(`Arquivo "${file.name}" carregado — ${result.sheets.length} aba(s), ${firstSheet.rowCount} linhas`);
      return;
    }

    toast.error("Erro ao processar arquivo. Verifique se é um Excel válido com dados.");
  };

  const handleSelectSheet = (sheetName: string) => {
    setSelectedSheet(sheetName);
    const nextSelectedSheets = [sheetName];
    setSelectedSheets(nextSelectedSheets);
    syncCurrentFile(parsedSheets, sheetName, nextSelectedSheets, importMode, fileName);
  };

  const handleChangeImportMode = (value: string) => {
    const nextMode = value as ImportMode;
    const nextSelectedSheets = selectedSheet ? [selectedSheet] : [];

    setImportMode(nextMode);
    setSelectedSheets(nextSelectedSheets);

    if (selectedSheet) {
      syncCurrentFile(parsedSheets, selectedSheet, nextSelectedSheets, nextMode, fileName);
    }
  };

  const handleToggleSheet = (sheetName: string, checked: boolean) => {
    if (!currentSheet) {
      return;
    }

    const isCompatible = compatibleSheets.some((sheet) => sheet.name === sheetName);
    if (!isCompatible) {
      return;
    }

    let nextSelectedSheets = checked
      ? Array.from(new Set([...selectedSheets, sheetName]))
      : selectedSheets.filter((currentName) => currentName !== sheetName);

    if (nextSelectedSheets.length === 0) {
      nextSelectedSheets = [currentSheet.name];
    }

    setSelectedSheets(nextSelectedSheets);
    syncCurrentFile(parsedSheets, selectedSheet, nextSelectedSheets, "combine", fileName);
  };

  const handleContinue = () => {
    if (!currentSheet || currentSheet.headers.length === 0) {
      toast.error("Selecione uma aba com dados para continuar");
      return;
    }

    if (importMode === "combine" && (!combinedSelection || combinedSelection.selectedSheetObjects.length === 0)) {
      toast.error("Selecione pelo menos uma aba compatível para combinar.");
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

      {!currentProject && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
          <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-amber-900">Nenhum projeto aberto</h2>
              <p className="text-sm text-amber-700 mt-1">
                Abra ou crie um projeto antes de importar a planilha para que os dados não fiquem soltos.
              </p>
            </div>
            <Button variant="outline" onClick={() => navigate("/projects")}>
              Ir para Projetos
            </Button>
          </CardContent>
        </Card>
      )}

      {!currentProject ? null : !parsedSheets.length ? (
        <RealUploadArea onUpload={handleUpload} isProcessing={parsing} />
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4 text-sm text-slate-600">
              Projeto atual: <span className="font-semibold text-slate-900">{currentProject.name}</span>
            </CardContent>
          </Card>

          {parsedSheets.length > 1 && (
            <Card className="border-slate-200">
              <CardContent className="p-5 space-y-4">
                <div>
                  <h2 className="font-semibold text-slate-900">Modo de leitura</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Escolha entre processar uma aba ou combinar várias abas com a mesma estrutura.
                  </p>
                </div>

                <RadioGroup value={importMode} onValueChange={handleChangeImportMode} className="gap-3">
                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="single" id="import-mode-single" className="mt-1" />
                    <div>
                      <Label htmlFor="import-mode-single" className="font-medium text-slate-900">Uma aba por vez</Label>
                      <p className="text-sm text-slate-500">Use quando Folha1 e Folha3 forem planilhas diferentes.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-lg border p-3">
                    <RadioGroupItem value="combine" id="import-mode-combine" className="mt-1" />
                    <div>
                      <Label htmlFor="import-mode-combine" className="font-medium text-slate-900">Combinar abas compatíveis</Label>
                      <p className="text-sm text-slate-500">Junta abas apenas se as colunas forem iguais e na mesma ordem.</p>
                    </div>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          )}

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
            <div className="space-y-3">
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

              {importMode === "combine" && currentSheet && (
                <Card className="border-slate-200 bg-slate-50">
                  <CardContent className="p-4 space-y-3">
                    <div>
                      <h3 className="font-medium text-slate-900">Selecionar abas para combinar</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        Aba base: <span className="font-medium">{currentSheet.name}</span>. Abas incompatíveis ficam bloqueadas.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {parsedSheets.map((sheet) => {
                        const compatible = compatibleSheets.some((candidate) => candidate.name === sheet.name);
                        const checked = selectedSheets.includes(sheet.name);

                        return (
                          <label
                            key={sheet.name}
                            className={`flex items-start gap-3 rounded-lg border p-3 ${compatible ? "bg-white" : "bg-slate-100 opacity-60"}`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={!compatible}
                              onCheckedChange={(value) => handleToggleSheet(sheet.name, value === true)}
                              className="mt-1"
                            />
                            <div>
                              <p className="font-medium text-slate-900">{sheet.name}</p>
                              <p className="text-xs text-slate-500">
                                {sheet.rowCount} linhas • {sheet.headers.length} colunas
                              </p>
                              {!compatible && (
                                <p className="text-xs text-amber-700 mt-1">
                                  Estrutura diferente da aba base; não pode ser combinada automaticamente.
                                </p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-slate-500">
              Arquivo: <span className="font-medium">{fileName}</span>
              {" • "}
              {importMode === "combine"
                ? (
                  <>
                    Modo: <span className="font-medium">Múltiplas abas</span>
                    {" • "}
                    Abas: <span className="font-medium">{combinedSelection?.validSelectedSheets.join(", ") || selectedSheet}</span>
                    {" • "}
                    {combinedSelection?.allData.length || 0} linhas combinadas
                    {" • "}
                    {combinedSelection?.headers.length || 0} colunas
                  </>
                )
                : (
                  <>
                    Aba: <span className="font-medium">{selectedSheet}</span>
                    {" • "}
                    {currentSheet?.rowCount || 0} linhas
                    {" • "}
                    {currentSheet?.headers.length || 0} colunas
                  </>
                )}
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
