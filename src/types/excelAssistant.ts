export interface ExcelSheet {
  name: string;
  data: any[][];
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export interface ExcelWorkbook {
  fileName: string;
  sheets: ExcelSheet[];
  currentSheet: number;
}

export type OperationType = 
  | 'chart'
  | 'filter'
  | 'sort'
  | 'calculate'
  | 'format'
  | 'analyze'
  | 'pivot'
  | 'error';

export type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter';

export interface ChartConfig {
  type: ChartType;
  title: string;
  xColumn: string;
  yColumns: string[];
  dataRange?: { start: number; end: number };
}

export interface FilterConfig {
  column: string;
  condition: 'equals' | 'contains' | 'greater' | 'less' | 'between';
  value: any;
  value2?: any;
}

export interface SortConfig {
  column: string;
  order: 'asc' | 'desc';
}

export interface CalculateConfig {
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'percentage' | 'sum' | 'average' | 'custom';
  column?: string;
  value?: number;
  formula?: string;
  newColumn?: string;
}

export interface AssistantCommand {
  text: string;
  timestamp: number;
}

export interface AssistantResponse {
  type: OperationType;
  success: boolean;
  message: string;
  data?: any;
  chart?: ChartConfig;
  modifiedData?: any[][];
  modifiedSheet?: ExcelSheet;
  error?: string;
  timestamp: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  data?: AssistantResponse;
}

export interface OperationHistory {
  operation: string;
  timestamp: number;
  canUndo: boolean;
  snapshot?: ExcelSheet;
}

export interface DeepSeekExcelResponse {
  type: OperationType;
  operation: {
    chart?: ChartConfig;
    filter?: FilterConfig;
    sort?: SortConfig;
    calculate?: CalculateConfig;
  };
  message: string;
  code?: string;
}
