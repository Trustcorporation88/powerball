import * as XLSX from "xlsx";

export interface ParsedSheet {
  name: string;
  data: any[];
  headers: string[];
  rowCount: number;
}

export interface ParsedExcel {
  fileName: string;
  sheets: ParsedSheet[];
}

export async function parseExcelFile(file: File): Promise<ParsedExcel> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[];
          
          const headers = jsonData.length > 0 ? jsonData[0] : [];
          const rows = jsonData.slice(1).filter((row) => 
            row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined)
          );
          
          // Converte array de arrays para array de objetos
          const dataObjects = rows.map((row) => {
            const obj: Record<string, any> = {};
            headers.forEach((header: string, index: number) => {
              if (header) {
                obj[header] = row[index];
              }
            });
            return obj;
          });
          
          return {
            name: sheetName,
            data: dataObjects,
            headers: headers.filter(Boolean),
            rowCount: rows.length,
          };
        }).filter((s) => s.headers.length > 0);
        
        resolve({
          fileName: file.name,
          sheets,
        });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

export function detectColumnTypes(headers: string[], sampleData: any[]): Array<{ name: string; detected: string; sample: any }> {
  return headers.map((header) => {
    const samples = sampleData.slice(0, 20).map((row) => row[header]).filter((v) => v !== undefined && v !== "");
    const firstValue = samples[0];
    
    let detected = "text";
    
    if (typeof firstValue === "number") {
      detected = "number";
    } else if (!isNaN(Date.parse(String(firstValue))) && String(firstValue).includes("-")) {
      detected = "date";
    } else if (typeof firstValue === "string") {
      const cleanValue = String(firstValue).replace(/[R$\s.]/g, "").replace(",", ".");
      if (!isNaN(Number(cleanValue)) && cleanValue !== "") {
        detected = "currency";
      }
    }
    
    return { name: header, detected, sample: firstValue };
  });
}

export function inferFinancialRole(columnName: string, detectedType: string): string {
  const nameLower = columnName.toLowerCase();
  
  if (nameLower.includes("data") || nameLower.includes("dt") || nameLower.includes("date")) {
    return "Data do lançamento";
  }
  if (nameLower.includes("descr") || nameLower.includes("hist") || nameLower.includes("lançamento") || nameLower.includes("nome")) {
    return "Descrição";
  }
  if (nameLower.includes("categ") || nameLower.includes("tipo") || nameLower.includes("class")) {
    return "Categoria";
  }
  if (nameLower.includes("subcateg") || nameLower.includes("sub")) {
    return "Subcategoria";
  }
  if (nameLower.includes("valor") || nameLower.includes("val") || nameLower.includes("valo") || nameLower.includes("montante") || nameLower.includes("recebido") || nameLower.includes("pago") || nameLower.includes("entrada") || nameLower.includes("saída") || nameLower.includes("total") || nameLower.includes("custo") || nameLower.includes("preço") || nameLower.includes("lucro") || nameLower.includes("faturamento")) {
    return "Valor";
  }
  if (nameLower.includes("centro") || nameLower.includes("c.c") || nameLower.includes("cc") || nameLower.includes("cost")) {
    return "Centro de custo";
  }
  if (nameLower.includes("conta") || nameLower.includes("banco") || nameLower.includes("cartão") || nameLower.includes("bank")) {
    return "Conta";
  }
  if (nameLower.includes("unidade") || nameLower.includes("filial") || nameLower.includes("loja")) {
    return "Unidade";
  }
  if (nameLower.includes("moeda") || nameLower.includes("currency")) {
    return "Moeda";
  }
  
  return "Nenhum";
}