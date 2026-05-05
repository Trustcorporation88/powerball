import * as XLSX from 'xlsx';
import {
  ExcelSheet,
  ExcelWorkbook,
  AssistantResponse,
  DeepSeekExcelResponse,
  ChartConfig,
  FilterConfig,
  SortConfig,
  CalculateConfig,
  OperationType,
} from '@/types/excelAssistant';

const DEEPSEEK_API = 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const USE_AI = Boolean(DEEPSEEK_API_KEY);

/**
 * Converte arquivo Excel em estrutura ExcelWorkbook
 */
export async function parseExcelWorkbook(file: File): Promise<ExcelWorkbook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        const sheets: ExcelSheet[] = workbook.SheetNames.map((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
          }) as any[][];

          const headers = jsonData.length > 0 ? jsonData[0].map((h: any) => String(h).trim()) : [];
          const dataRows = jsonData.slice(1);

          return {
            name: sheetName,
            data: dataRows,
            headers: headers,
            rowCount: dataRows.length,
            columnCount: headers.length,
          };
        });

        resolve({
          fileName: file.name,
          sheets,
          currentSheet: 0,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Exporta ExcelSheet para arquivo Excel
 */
export function exportToExcel(sheet: ExcelSheet, fileName: string): void {
  const wsData = [sheet.headers, ...sheet.data];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  XLSX.writeFile(wb, fileName);
}

/**
 * Processa comando de linguagem natural via DeepSeek
 */
export async function processCommand(
  command: string,
  sheet: ExcelSheet
): Promise<AssistantResponse> {
  if (!USE_AI) {
    return fallbackProcessor(command, sheet);
  }

  try {
    const prompt = buildPrompt(command, sheet);
    const deepseekResponse = await callDeepSeek(prompt);

    if (!deepseekResponse) {
      return fallbackProcessor(command, sheet);
    }

    return executeOperation(deepseekResponse, sheet);
  } catch (error) {
    console.error('DeepSeek processing failed:', error);
    return {
      type: 'error',
      success: false,
      message: 'Erro ao processar comando. Tente reformular.',
      error: String(error),
      timestamp: Date.now(),
    };
  }
}

/**
 * Constrói prompt para DeepSeek
 */
function buildPrompt(command: string, sheet: ExcelSheet): string {
  const sampleData = sheet.data.slice(0, 3).map((row, idx) => {
    const obj: Record<string, any> = {};
    sheet.headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });

  return `Você é um assistente especializado em manipulação de planilhas Excel.

PLANILHA ATUAL:
Nome: ${sheet.name}
Colunas: ${sheet.headers.join(', ')}
Total de linhas: ${sheet.rowCount}
Amostra de dados (primeiras 3 linhas):
${JSON.stringify(sampleData, null, 2)}

COMANDO DO USUÁRIO: ${command}

Analise o comando e retorne um JSON com a seguinte estrutura:
{
  "type": "chart" | "filter" | "sort" | "calculate" | "analyze" | "error",
  "operation": {
    // Para type: "chart"
    "chart": {
      "type": "bar" | "line" | "pie" | "area",
      "title": "Título do gráfico",
      "xColumn": "nome_coluna_x",
      "yColumns": ["coluna_y1", "coluna_y2"]
    },
    // Para type: "filter"
    "filter": {
      "column": "nome_coluna",
      "condition": "equals" | "contains" | "greater" | "less",
      "value": valor
    },
    // Para type: "sort"
    "sort": {
      "column": "nome_coluna",
      "order": "asc" | "desc"
    },
    // Para type: "calculate"
    "calculate": {
      "operation": "add" | "multiply" | "percentage" | "sum" | "average",
      "column": "nome_coluna",
      "value": numero,
      "newColumn": "nome_nova_coluna_opcional"
    }
  },
  "message": "Mensagem explicativa curta para o usuário"
}

IMPORTANTE:
- Use EXATAMENTE os nomes de colunas que existem na planilha
- Para comandos de gráfico, identifique as colunas corretas
- Para cálculos com percentual (ex: "adicione 20%"), use operation: "percentage" e value: 20
- Para filtros alfabéticos, use operation: "sort"
- Retorne apenas o JSON válido, sem texto adicional`;
}

/**
 * Chama API DeepSeek
 */
async function callDeepSeek(prompt: string): Promise<DeepSeekExcelResponse | null> {
  try {
    const response = await fetch(DEEPSEEK_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente de planilhas Excel. Responda apenas com JSON válido.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('DeepSeek API error:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return JSON.parse(jsonMatch[0]) as DeepSeekExcelResponse;
  } catch (error) {
    console.error('DeepSeek call failed:', error);
    return null;
  }
}

/**
 * Executa operação baseada na resposta do DeepSeek
 */
function executeOperation(
  response: DeepSeekExcelResponse,
  sheet: ExcelSheet
): AssistantResponse {
  try {
    switch (response.type) {
      case 'chart':
        return executeChart(response.operation.chart!, sheet, response.message);

      case 'filter':
        return executeFilter(response.operation.filter!, sheet, response.message);

      case 'sort':
        return executeSort(response.operation.sort!, sheet, response.message);

      case 'calculate':
        return executeCalculate(response.operation.calculate!, sheet, response.message);

      case 'analyze':
        return executeAnalyze(sheet, response.message);

      default:
        return {
          type: 'error',
          success: false,
          message: response.message || 'Não consegui processar este comando.',
          timestamp: Date.now(),
        };
    }
  } catch (error) {
    return {
      type: 'error',
      success: false,
      message: 'Erro ao executar operação.',
      error: String(error),
      timestamp: Date.now(),
    };
  }
}

/**
 * Executa criação de gráfico
 */
function executeChart(
  config: ChartConfig,
  sheet: ExcelSheet,
  message: string
): AssistantResponse {
  const xIdx = sheet.headers.indexOf(config.xColumn);
  const yIndices = config.yColumns.map((col) => sheet.headers.indexOf(col));

  if (xIdx === -1 || yIndices.some((idx) => idx === -1)) {
    return {
      type: 'error',
      success: false,
      message: 'Colunas especificadas não encontradas na planilha.',
      timestamp: Date.now(),
    };
  }

  const chartData = sheet.data.map((row) => {
    const dataPoint: Record<string, any> = {};
    dataPoint[config.xColumn] = row[xIdx];
    config.yColumns.forEach((col, i) => {
      dataPoint[col] = parseFloat(row[yIndices[i]]) || 0;
    });
    return dataPoint;
  });

  return {
    type: 'chart',
    success: true,
    message,
    chart: config,
    data: chartData,
    timestamp: Date.now(),
  };
}

/**
 * Executa filtro
 */
function executeFilter(
  config: FilterConfig,
  sheet: ExcelSheet,
  message: string
): AssistantResponse {
  const colIdx = sheet.headers.indexOf(config.column);

  if (colIdx === -1) {
    return {
      type: 'error',
      success: false,
      message: `Coluna "${config.column}" não encontrada.`,
      timestamp: Date.now(),
    };
  }

  const filteredData = sheet.data.filter((row) => {
    const cellValue = row[colIdx];

    switch (config.condition) {
      case 'equals':
        return cellValue == config.value;
      case 'contains':
        return String(cellValue).toLowerCase().includes(String(config.value).toLowerCase());
      case 'greater':
        return parseFloat(cellValue) > parseFloat(config.value);
      case 'less':
        return parseFloat(cellValue) < parseFloat(config.value);
      default:
        return true;
    }
  });

  const modifiedSheet: ExcelSheet = {
    ...sheet,
    data: filteredData,
    rowCount: filteredData.length,
  };

  return {
    type: 'filter',
    success: true,
    message: `${message} (${filteredData.length} linhas encontradas)`,
    modifiedSheet,
    timestamp: Date.now(),
  };
}

/**
 * Executa ordenação
 */
function executeSort(
  config: SortConfig,
  sheet: ExcelSheet,
  message: string
): AssistantResponse {
  const colIdx = sheet.headers.indexOf(config.column);

  if (colIdx === -1) {
    return {
      type: 'error',
      success: false,
      message: `Coluna "${config.column}" não encontrada.`,
      timestamp: Date.now(),
    };
  }

  const sortedData = [...sheet.data].sort((a, b) => {
    const aVal = a[colIdx];
    const bVal = b[colIdx];

    const aNum = parseFloat(aVal);
    const bNum = parseFloat(bVal);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return config.order === 'asc' ? aNum - bNum : bNum - aNum;
    }

    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (config.order === 'asc') {
      return aStr.localeCompare(bStr);
    } else {
      return bStr.localeCompare(aStr);
    }
  });

  const modifiedSheet: ExcelSheet = {
    ...sheet,
    data: sortedData,
  };

  return {
    type: 'sort',
    success: true,
    message,
    modifiedSheet,
    timestamp: Date.now(),
  };
}

/**
 * Executa cálculo
 */
function executeCalculate(
  config: CalculateConfig,
  sheet: ExcelSheet,
  message: string
): AssistantResponse {
  const colIdx = config.column ? sheet.headers.indexOf(config.column) : -1;

  if (config.column && colIdx === -1) {
    return {
      type: 'error',
      success: false,
      message: `Coluna "${config.column}" não encontrada.`,
      timestamp: Date.now(),
    };
  }

  let modifiedSheet: ExcelSheet = { ...sheet };

  switch (config.operation) {
    case 'percentage':
    case 'add':
    case 'multiply':
      const newColumnName = config.newColumn || `${config.column}_modificado`;
      const newHeaders = [...sheet.headers, newColumnName];
      
      const newData = sheet.data.map((row) => {
        const originalValue = parseFloat(row[colIdx]) || 0;
        let newValue: number;

        if (config.operation === 'percentage') {
          newValue = originalValue * (1 + (config.value || 0) / 100);
        } else if (config.operation === 'add') {
          newValue = originalValue + (config.value || 0);
        } else {
          newValue = originalValue * (config.value || 1);
        }

        return [...row, newValue];
      });

      modifiedSheet = {
        ...sheet,
        headers: newHeaders,
        data: newData,
        columnCount: newHeaders.length,
      };
      break;

    case 'sum':
    case 'average':
      const values = sheet.data.map((row) => parseFloat(row[colIdx]) || 0);
      const result =
        config.operation === 'sum'
          ? values.reduce((acc, val) => acc + val, 0)
          : values.reduce((acc, val) => acc + val, 0) / values.length;

      return {
        type: 'analyze',
        success: true,
        message: `${message}: R$ ${result.toFixed(2)}`,
        data: { result, operation: config.operation },
        timestamp: Date.now(),
      };
  }

  return {
    type: 'calculate',
    success: true,
    message,
    modifiedSheet,
    timestamp: Date.now(),
  };
}

/**
 * Executa análise
 */
function executeAnalyze(sheet: ExcelSheet, message: string): AssistantResponse {
  return {
    type: 'analyze',
    success: true,
    message,
    data: {
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      headers: sheet.headers,
    },
    timestamp: Date.now(),
  };
}

/**
 * Processador fallback quando DeepSeek não está disponível
 */
function fallbackProcessor(command: string, sheet: ExcelSheet): AssistantResponse {
  const cmd = command.toLowerCase();

  // Detectar gráficos
  if (cmd.includes('gráfico') || cmd.includes('grafico') || cmd.includes('chart')) {
    if (cmd.includes('receita') && cmd.includes('despesa')) {
      return {
        type: 'chart',
        success: true,
        message: 'Gráfico de Receita vs Despesa',
        chart: {
          type: 'line',
          title: 'Receita vs Despesa',
          xColumn: sheet.headers[0],
          yColumns: [sheet.headers[1], sheet.headers[2]],
        },
        timestamp: Date.now(),
      };
    }
  }

  // Detectar filtros
  if (cmd.includes('filtr')) {
    return {
      type: 'error',
      success: false,
      message: 'DeepSeek não configurada. Especifique: "filtrar coluna X onde valor > Y"',
      timestamp: Date.now(),
    };
  }

  // Detectar ordenação
  if (cmd.includes('orden') || cmd.includes('sort')) {
    const columnMatch = cmd.match(/coluna\s+(\w+)/i) || cmd.match(/column\s+(\w+)/i);
    if (columnMatch) {
      const column = columnMatch[1].toUpperCase();
      return executeSort(
        { column, order: cmd.includes('desc') ? 'desc' : 'asc' },
        sheet,
        `Planilha ordenada pela coluna ${column}`
      );
    }
  }

  return {
    type: 'error',
    success: false,
    message: 'Comando não reconhecido. Configure DeepSeek API Key para usar IA.',
    timestamp: Date.now(),
  };
}
