/**
 * Serviço de integração com Brapi.dev
 * API gratuita de dados financeiros de empresas brasileiras (B3/CVM)
 * Docs: https://brapi.dev/docs
 */

const BRAPI_BASE = 'https://brapi.dev/api';

export interface BrapiQuote {
  symbol: string;
  longName: string;
  regularMarketPrice: number;
  currency: string;
  marketCap: number;
}

export interface BrapiFundamentals {
  priceEarnings: number;
  dividendYield: number;
  returnOnEquity: number;
  debtToEquity: number;
  profitMargins: number;
  revenueGrowth: number;
}

export interface BrapiDRE {
  year: number;
  quarter?: number;
  revenue: number; // Receita Bruta
  costOfRevenue: number; // Custo dos Produtos/Serviços Vendidos
  grossProfit: number; // Lucro Bruto
  operatingExpenses: number; // Despesas Operacionais
  operatingIncome: number; // Resultado Operacional (EBIT)
  netIncome: number; // Lucro Líquido
  ebitda: number; // EBITDA
}

export interface BrapiCompany {
  symbol: string;
  longName: string;
  sector: string;
  industry: string;
  quote: BrapiQuote;
  fundamentals: BrapiFundamentals;
  incomeStatement?: BrapiDRE[];
}

/**
 * Busca cotação e dados fundamentais de uma empresa
 */
export async function getCompanyData(ticker: string): Promise<BrapiCompany | null> {
  try {
    const response = await fetch(`${BRAPI_BASE}/quote/${ticker.trim().toUpperCase()}?fundamental=true&dividends=false`);
    
    if (!response.ok) {
      console.error(`Brapi erro ${response.status} para ${ticker}`);
      return null;
    }

    const data = await response.json();
    const result = data.results?.[0];
    
    if (!result) return null;

    return {
      symbol: result.symbol,
      longName: result.longName || result.shortName,
      sector: result.sector || 'N/A',
      industry: result.industryDisp || 'N/A',
      quote: {
        symbol: result.symbol,
        longName: result.longName,
        regularMarketPrice: result.regularMarketPrice || 0,
        currency: result.currency || 'BRL',
        marketCap: result.marketCap || 0,
      },
      fundamentals: {
        priceEarnings: result.priceEarnings || 0,
        dividendYield: result.dividendYield || 0,
        returnOnEquity: result.returnOnEquity || 0,
        debtToEquity: result.debtToEquity || 0,
        profitMargins: result.profitMargins || 0,
        revenueGrowth: result.revenueGrowth || 0,
      },
    };
  } catch (error) {
    console.error('Erro Brapi:', error);
    return null;
  }
}

/**
 * Busca múltiplas empresas de uma vez
 */
export async function getMultipleCompanies(tickers: string[]): Promise<BrapiCompany[]> {
  const tickerList = tickers.map(t => t.trim().toUpperCase()).join(',');
  
  try {
    const response = await fetch(`${BRAPI_BASE}/quote/${tickerList}?fundamental=true`);
    
    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];

    return results.map((r: any) => ({
      symbol: r.symbol,
      longName: r.longName || r.shortName,
      sector: r.sector || 'N/A',
      industry: r.industryDisp || 'N/A',
      quote: {
        symbol: r.symbol,
        longName: r.longName,
        regularMarketPrice: r.regularMarketPrice || 0,
        currency: r.currency || 'BRL',
        marketCap: r.marketCap || 0,
      },
      fundamentals: {
        priceEarnings: r.priceEarnings || 0,
        dividendYield: r.dividendYield || 0,
        returnOnEquity: r.returnOnEquity || 0,
        debtToEquity: r.debtToEquity || 0,
        profitMargins: r.profitMargins || 0,
        revenueGrowth: r.revenueGrowth || 0,
      },
    }));
  } catch (error) {
    console.error('Erro Brapi múltiplos:', error);
    return [];
  }
}

/**
 * Lista empresas disponíveis por setor
 */
export async function getAvailableStocks(): Promise<{ stock: string; name: string; sector?: string }[]> {
  try {
    const response = await fetch(`${BRAPI_BASE}/available`);
    
    if (!response.ok) return [];

    const data = await response.json();
    return data.stocks || [];
  } catch (error) {
    console.error('Erro Brapi lista:', error);
    return [];
  }
}

/**
 * Empresas sugeridas para benchmark por setor
 */
export const BENCHMARK_COMPANIES = {
  'Varejo': ['MGLU3', 'LREN3', 'AMER3', 'VIVA3'],
  'Tecnologia': ['TOTS3', 'LWSA3', 'POSI3'],
  'Energia': ['PETR4', 'VALE3', 'ELET3', 'EGIE3'],
  'Financeiro': ['ITUB4', 'BBDC4', 'BBAS3', 'SANB11'],
  'Saúde': ['RDOR3', 'HAPV3', 'GNDI3', 'FLRY3'],
  'Construção': ['CYRE3', 'MRVE3', 'EZTC3', 'TEND3'],
  'Alimentos': ['ABEV3', 'BEEF3', 'JBSS3', 'MRFG3'],
  'Telecom': ['VIVT3', 'TIMS3', 'OIBR3'],
};
