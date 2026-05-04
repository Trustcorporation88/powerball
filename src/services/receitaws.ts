/**
 * Serviço de integração com ReceitaWS
 * API gratuita para consulta de CNPJ/CPF na Receita Federal
 * Limite: 3 requisições/minuto
 * Docs: https://www.receitaws.com.br/api
 * 
 * Link para emitir cartão CNPJ:
 * https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp
 */

const RECEITAWS_BASE = import.meta.env.PROD 
  ? '/api/receitaws' // Usa proxy Vercel em produção (evita CORS)
  : 'https://www.receitaws.com.br/v1'; // Direto em dev (pode falhar por CORS)
const RATE_LIMIT_DELAY = 20000; // 20s entre requisições (segurança para 3/min)
let lastRequestTime = 0;

export interface CNPJData {
  cnpj: string; // CNPJ formatado
  razao_social: string; // Nome/Razão Social
  nome_fantasia: string; // Nome fantasia
  atividade_principal: {
    code: string;
    text: string;
  }[];
  natureza_juridica: string;
  situacao: string; // ATIVA, BAIXADA, etc
  data_situacao: string;
  capital_social: string;
  porte: string; // MEI, ME, EPP, etc
  abertura: string; // Data de abertura
  email?: string;
  telefone?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
}

export interface CNPJValidationResult {
  valid: boolean;
  data?: CNPJData;
  error?: string;
  status?: 'ATIVA' | 'BAIXADA' | 'SUSPENSA' | 'INAPTA';
}

/**
 * Valida formato de CNPJ (apenas dígitos)
 */
export function isValidCNPJFormat(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false; // Todos iguais
  
  // Validação de dígitos verificadores
  const calcDigit = (base: string, weights: number[]): number => {
    const sum = base.split('').reduce((acc, digit, i) => acc + parseInt(digit) * weights[i], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const base = cleaned.slice(0, 12);
  const digit1 = calcDigit(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(base + digit1, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return cleaned === base + digit1 + digit2;
}

/**
 * Formata CNPJ: 12345678000195 -> 12.345.678/0001-95
 */
export function formatCNPJ(cnpj: string): string {
  const cleaned = cnpj.replace(/\D/g, '');
  return cleaned.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

/**
 * Rate limiting simples
 */
async function waitRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Consulta CNPJ na Receita Federal
 */
export async function consultCNPJ(cnpj: string): Promise<CNPJValidationResult> {
  const cleaned = cnpj.replace(/\D/g, '');
  
  // Validação offline primeiro
  if (!isValidCNPJFormat(cleaned)) {
    return {
      valid: false,
      error: 'CNPJ inválido (formato ou dígitos verificadores incorretos)',
    };
  }

  try {
    await waitRateLimit();

    const endpoint = import.meta.env.PROD 
      ? `${RECEITAWS_BASE}/${cleaned}` // Proxy: /api/receitaws/10657629000162
      : `${RECEITAWS_BASE}/cnpj/${cleaned}`; // Direto: /v1/cnpj/10657629000162

    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.status === 429) {
      return {
        valid: false,
        error: 'Limite de requisições excedido. Aguarde 1 minuto.',
      };
    }

    if (!response.ok) {
      return {
        valid: false,
        error: `Erro na consulta: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.status === 'ERROR') {
      return {
        valid: false,
        error: data.message || 'CNPJ não encontrado na Receita Federal',
      };
    }

    const isActive = data.situacao?.toUpperCase() === 'ATIVA';

    // Transforma dados da ReceitaWS para nossa interface
    const cnpjData: CNPJData = {
      cnpj: data.cnpj || cleaned,
      razao_social: data.nome || '',
      nome_fantasia: data.fantasia || '',
      atividade_principal: data.atividade_principal || [],
      natureza_juridica: data.natureza_juridica || '',
      situacao: data.situacao || '',
      data_situacao: data.data_situacao || '',
      capital_social: data.capital_social || '0',
      porte: data.porte || '',
      abertura: data.abertura || '',
      email: data.email,
      telefone: data.telefone,
      endereco: {
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        municipio: data.municipio || '',
        uf: data.uf || '',
        cep: data.cep || '',
      },
    };

    return {
      valid: true,
      data: cnpjData,
      status: data.situacao?.toUpperCase() as any,
      error: !isActive ? `Empresa ${data.situacao}` : undefined,
    };
  } catch (error) {
    console.error('Erro ReceitaWS:', error);
    return {
      valid: false,
      error: 'Erro ao consultar Receita Federal. Tente novamente.',
    };
  }
}

/**
 * Link para emitir cartão CNPJ
 */
export const CNPJ_CARD_URL = 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp';
