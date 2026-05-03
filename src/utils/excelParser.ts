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
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        
        const sheets: ParsedSheet[] = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[];
          
          const headers = jsonData.length > 0 ? jsonData[0].map((h: any) => String(h).trim()) : [];
          const rows = jsonData.slice(1).filter((row) => 
            row.some((cell: any) => cell !== "" && cell !== null && cell !== undefined)
          );
          
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

export function detectColumnTypes(headers: string[], sampleData: any[]): Array<{ name: string; detected: string; sample: any; confidence: number }> {
  return headers.map((header) => {
    const samples = sampleData.slice(0, 50).map((row) => row[header]).filter((v) => v !== undefined && v !== "" && v !== null);
    const firstValue = samples[0];
    
    let detected = "text";
    let confidence = 0.5;
    
    // Verifica se é numérico por padrão
    const numericSamples = samples.filter(v => {
      if (typeof v === "number") return true;
      if (typeof v === "string") {
        const cleaned = v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
        return !isNaN(Number(cleaned)) && cleaned !== "";
      }
      return false;
    });
    
    const numericRatio = samples.length > 0 ? numericSamples.length / samples.length : 0;
    
    // Verifica se é data
    const dateSamples = samples.filter(v => {
      if (v instanceof Date) return true;
      if (typeof v === "string") {
        const str = String(v).trim();
        if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(str)) return true;
        if (/^\d{4}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(str)) return true;
      }
      return false;
    });
    
    const dateRatio = samples.length > 0 ? dateSamples.length / samples.length : 0;
    
    if (numericRatio > 0.7) {
      detected = "currency";
      confidence = numericRatio;
    } else if (dateRatio > 0.7) {
      detected = "date";
      confidence = dateRatio;
    } else if (typeof firstValue === "number") {
      detected = "number";
      confidence = 0.8;
    }
    
    return { name: header, detected, sample: firstValue, confidence };
  });
}

export function inferFinancialRole(columnName: string, detectedType: string, samples: any[]): string {
  const nameLower = columnName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  
  // Detecção por nome - datas
  const datePatterns = ["data", "dt", "date", "vencimento", "emissao", "competencia", "periodo", "mes", "ano", "dia", "venc", "dtpgto", "dtpag", "dtvenc", "dtemis", "period", "year"];
  if (datePatterns.some(p => nameLower.includes(p))) {
    return "Data do lançamento";
  }
  
  // Detecção por nome - valores monetários
  const valuePatterns = [
    "valor", "val", "valo", "montante", "recebido", "pago", "entrada", "saida", "total", 
    "custo", "preco", "lucro", "faturamento", "receita", "despesa", "saldo", "debito", 
    "credito", "juros", "multa", "desconto", "acrescimo", "quantia", "importe", "amount", 
    "price", "value", "vlr", "vltotal", "vlliquido", "vlbruto", "vlrparcela", "parcela",
    "principal", "vloriginal", "atualizado", "corrigido", "pago", "recebido", "baixa",
    "quitado", "pendente", "resta", "abatimento", "tarifa", "iof", "cms", "icms", "ipi",
    "pis", "cofins", "ir", "csll", "inss", "iss", "simples", "fgts", "salario", "prolabore",
    "honorarios", "comissao", "frete", "despesa", "receita", "ganho", "perda", "prov"
  ];
  if (valuePatterns.some(p => nameLower.includes(p))) {
    return "Valor";
  }
  
  // Se o tipo detectado é currency/number e tem muitos valores numéricos, sugere Valor
  if ((detectedType === "currency" || detectedType === "number") && samples.length > 0) {
    const numericCount = samples.filter(v => {
      if (typeof v === "number") return true;
      if (typeof v === "string") {
        const cleaned = v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
        return !isNaN(Number(cleaned)) && cleaned !== "";
      }
      return false;
    }).length;
    if (numericCount / samples.length > 0.6) {
      return "Valor";
    }
  }
  
  // Detecção por nome - descrição
  const descPatterns = [
    "descr", "hist", "lancamento", "nome", "referencia", "obs", "detalhe", "item", 
    "produto", "servico", "fornecedor", "cliente", "pagador", "recebedor", "beneficiario",
    "terceiro", "pessoa", "empresa", "contribuinte", "participante", "emitente", "sacado",
    "cedente", "favorecido", "tomador", "prestador", "credor", "devedor", "identificacao",
    "doc", "documento", "complemento", "observacao", "motivo", "justificativa", "esp"
  ];
  if (descPatterns.some(p => nameLower.includes(p))) {
    return "Descrição";
  }
  
  // Detecção por nome - categoria
  const catPatterns = ["categ", "tipo", "class", "grupo", "natureza", "origem", "rubrica", "rubric", "rct", "desp"];
  if (catPatterns.some(p => nameLower.includes(p))) {
    return "Categoria";
  }
  
  // Detecção por nome - centro de custo
  const ccPatterns = ["centro", "cc", "cost", "departamento", "depart", "setor", "area", "filial", "regional"];
  if (ccPatterns.some(p => nameLower.includes(p))) {
    return "Centro de custo";
  }
  
  // Detecção por nome - conta
  const accountPatterns = ["conta", "banco", "cartao", "bank", "contabil", "plano", "agencia", "ag"];
  if (accountPatterns.some(p => nameLower.includes(p))) {
    return "Conta";
  }
  
  // Detecção por nome - unidade
  const unitPatterns = ["unidade", "loja", "sede", "matriz", "predio", "local"];
  if (unitPatterns.some(p => nameLower.includes(p))) {
    return "Unidade";
  }
  
  // Detecção por nome - moeda
  const currencyPatterns = ["moeda", "currency", "cambio", "cotacao"];
  if (currencyPatterns.some(p => nameLower.includes(p))) {
    return "Moeda";
  }
  
  // Fallback por tipo: se é currency/number e não casou nada, ainda sugere Valor
  if (detectedType === "currency" || detectedType === "number") {
    return "Valor";
  }
  
  return "Nenhum";
}

export function formatCellValue(value: any, type?: string): string {
  if (value === undefined || value === null || value === "") return "-";
  
  if (typeof value === "number") {
    // Formata como moeda se parece ser valor monetário
    if (Math.abs(value) > 100 && type !== "quantity") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  if (value instanceof Date) {
    return value.toLocaleDateString("pt-BR");
  }
  
  if (typeof value === "string") {
    // Se for string numérica formatada
    const cleaned = value.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
    if (!isNaN(Number(cleaned)) && cleaned !== "") {
      const num = Number(cleaned);
      if (Math.abs(num) > 100) {
        return num.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
      }
      return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return String(value);
  }
  
  return String(value);
}