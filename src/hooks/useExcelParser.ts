import { useState, useCallback } from "react";
import { parseExcelFile, ParsedExcel, detectColumnTypes } from "@/utils/excelParser";

interface UseExcelParserReturn {
  parsing: boolean;
  error: string | null;
  parsedData: ParsedExcel | null;
  parse: (file: File) => Promise<ParsedExcel | null>;
}

export function useExcelParser(): UseExcelParserReturn {
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedExcel | null>(null);

  const parse = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    
    try {
      const result = await parseExcelFile(file);
      setParsedData(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido ao processar arquivo";
      setError(message);
      return null;
    } finally {
      setParsing(false);
    }
  }, []);

  return { parsing, error, parsedData, parse };
}