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
    
    const numericSamples = samples.filter(v => {
      if (typeof v === "number") return true;
      if (typeof v === "string") {
        const cleaned = v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
        return !isNaN(Number(cleaned)) && cleaned !== "";
      }
      return false;
    });
    
    const numericRatio = samples.length > 0 ? numericSamples.length / samples.length : 0;
    
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

export function inferFinancialRole(columnName: string, detectedType: string, samples: any[] = []): string {
  const nameLower = columnName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  
  // ===== DATA =====
  const datePatterns = ["data", "dt", "date", "vencimento", "emissao", "competencia", "periodo", "mes", "ano", "dia", "venc", "dtpgto", "dtpag", "dtvenc", "dtemis", "period", "year", "vencim", "emissa", "compet", "pagto", "pgto"];
  if (datePatterns.some(p => nameLower.includes(p))) {
    return "Data do lançamento";
  }
  
  // ===== VALOR / MOEDA =====
  const valuePatterns = [
    "valor", "val", "valo", "montante", "recebido", "pago", "entrada", "saida", "total", 
    "custo", "preco", "lucro", "faturamento", "receita", "despesa", "saldo", "debito", 
    "credito", "juros", "multa", "desconto", "acrescimo", "quantia", "importe", "amount", 
    "price", "value", "vlr", "vltotal", "vlliquido", "vlbruto", "vlrparcela", "parcela",
    "principal", "vloriginal", "atualizado", "corrigido", "baixa", "quitado", "pendente", 
    "resta", "abatimento", "tarifa", "iof", "cms", "icms", "ipi", "pis", "cofins", "ir", 
    "csll", "inss", "iss", "simples", "fgts", "salario", "prolabore", "honorarios", 
    "comissao", "frete", "ganho", "perda", "prov", "provisionado", "provisionamento",
    "original", "atual", "corrig", "atualiz", "multa", "mora", "atraso", "provisao"
  ];
  if (valuePatterns.some(p => nameLower.includes(p))) {
    return "Valor";
  }
  
  // Se é numérico e tem muitos valores numéricos → Valor
  if ((detectedType === "currency" || detectedType === "number") && samples.length > 0) {
    const numericCount = samples.filter(v => {
      if (typeof v === "number") return true;
      if (typeof v === "string") {
        const cleaned = v.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
        return !isNaN(Number(cleaned)) && cleaned !== "";
      }
      return false;
    }).length;
    if (numericCount / samples.length > 0.5) {
      return "Valor";
    }
  }
  
  // ===== DESCRIÇÃO =====
  const descPatterns = [
    "descr", "hist", "lancamento", "nome", "referencia", "obs", "detalhe", "item", 
    "produto", "servico", "fornecedor", "cliente", "pagador", "recebedor", "beneficiario",
    "terceiro", "pessoa", "empresa", "contribuinte", "participante", "emitente", "sacado",
    "cedente", "favorecido", "tomador", "prestador", "credor", "devedor", "identificacao",
    "doc", "documento", "complemento", "observacao", "motivo", "justificativa", "esp",
    "especie", "historico", "lanc", "movimento", "operacao", "transacao", "titulo",
    "numero", "nro", "nr", "seq", "sequencia", "protocolo", "chave", "identif"
  ];
  if (descPatterns.some(p => nameLower.includes(p))) {
    return "Descrição";
  }
  
  // ===== CATEGORIA =====
  const catPatterns = [
    "categ", "tipo", "class", "grupo", "natureza", "origem", "rubrica", "rubric", 
    "rct", "desp", "receit", "despesa", "receita", "classe", "tipo", "especie",
    "modalidade", "forma", "meio", "canal", "segmento", "setor", "subsetor"
  ];
  if (catPatterns.some(p => nameLower.includes(p))) {
    return "Categoria";
  }
  
  // ===== CENTRO DE CUSTO =====
  const ccPatterns = [
    "centro", "cc", "cost", "departamento", "depart", "setor", "area", "filial", 
    "regional", "unidade", "loja", "sede", "matriz", "predio", "local", "projeto",
    "obra", "contrato", "regiao", "zona", "territorio", "distrito", "coordenacao",
    "gerencia", "diretoria", "superintendencia", "nucleo", "polo", "base"
  ];
  if (ccPatterns.some(p => nameLower.includes(p))) {
    return "Centro de custo";
  }
  
  // ===== CONTA =====
  const accountPatterns = [
    "conta", "banco", "cartao", "bank", "contabil", "plano", "agencia", "ag", 
    "contacontabil", "contabilidade", "bancaria", "instituicao", "financeira",
    "caixa", "tesouraria", "cobranca", "arrecadacao"
  ];
  if (accountPatterns.some(p => nameLower.includes(p))) {
    return "Conta";
  }
  
  // ===== UNIDADE =====
  const unitPatterns = [
    "unidade", "loja", "sede", "matriz", "predio", "local", "filial", "regional",
    "unid", "und", "posto", "ponto", "base", "escritorio", "sala", "andar"
  ];
  if (unitPatterns.some(p => nameLower.includes(p))) {
    return "Unidade";
  }
  
  // ===== MOEDA =====
  const currencyPatterns = ["moeda", "currency", "cambio", "cotacao", "taxa", "indexador"];
  if (currencyPatterns.some(p => nameLower.includes(p))) {
    return "Moeda";
  }
  
  // Fallback por tipo
  if (detectedType === "currency" || detectedType === "number") {
    return "Valor";
  }
  
  return "Nenhum";
}

export function formatCellValue(value: any, type?: string): string {
  if (value === undefined || value === null || value === "") return "-";
  
  if (typeof value === "number") {
    if (Math.abs(value) > 100 && type !== "quantity") {
      return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  if (value instanceof Date) {
    return value.toLocaleDateString("pt-BR");
  }
  
  if (typeof value === "string") {
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