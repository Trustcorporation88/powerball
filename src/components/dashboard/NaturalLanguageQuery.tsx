import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, X, Lightbulb, MessageSquare, History, Shield, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EXTERNAL_AI_DISABLED_REASON, queryNLP } from '@/services/ai';
import type { Transaction } from '@/contexts/AppContext';
import type { KpiData } from '@/hooks/useDashboardData';

interface NLPProps {
  transactions: Transaction[];
  kpis: KpiData;
  onFilterChange: (filters: (previous: Record<string, unknown>) => Record<string, unknown>) => void;
  externalQuestionRequest?: {
    id: number;
    question: string;
  } | null;
}

export default function NaturalLanguageQuery({ transactions, kpis, onFilterChange, externalQuestionRequest }: NLPProps) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof queryNLP>> | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ q: string; r: Awaited<ReturnType<typeof queryNLP>> }[]>([]);
  
  const hasApiKey = Boolean(import.meta.env.VITE_DEEPSEEK_API_KEY);

  const categories = useMemo(() => [...new Set(transactions.map((t) => t.category))], [transactions]);
  const costCenters = useMemo(() => [...new Set(transactions.map((t) => t.costCenter))], [transactions]);

  const totalIncome = transactions.filter((t) => t.flowType === 'income').reduce((s, t) => s + t.value, 0);
  const totalExpense = transactions.filter((t) => t.flowType === 'expense').reduce((s, t) => s + Math.abs(t.value), 0);

  const contextualQuestions = [
    { q: `Qual a receita total?`, icon: '💰' },
    { q: `Top 5 despesas por categoria?`, icon: '📊' },
    { q: `Qual o saldo líquido?`, icon: '💎' },
    { q: `Evolução mensal da receita?`, icon: '📈' },
    { q: `Compare receita vs despesa?`, icon: '⚖️' },
    { q: `Qual centro de custo gasta mais?`, icon: '🏢' },
    { q: `Margem operacional do período?`, icon: '🎯' },
    { q: `Tendência dos últimos meses?`, icon: '🔮' },
    { q: `Distribuição por categoria?`, icon: '🍩' },
    { q: `Quais as maiores transações?`, icon: '🏆' },
    { q: `Resumo das despesas por centro de custo?`, icon: '📋' },
    { q: `Mês com maior receita?`, icon: '📅' },
  ];

  const handleQuery = useCallback(async (q?: string) => {
    const queryText = q || question;
    if (!queryText.trim()) return;
    setLoading(true);

    const response = await queryNLP(queryText, {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: categories as string[],
      costCenters: costCenters as string[],
      dateRange: 'último período',
    });

    setResult(response);
    setHistory(prev => [...prev.slice(-4), { q: queryText, r: response }]);
    setLoading(false);
    setQuestion('');

    if (response.filter) {
      onFilterChange((prev: any) => ({
        ...prev,
        ...response.filter,
      }));
    }
  }, [categories, costCenters, onFilterChange, question, totalExpense, totalIncome]);

  useEffect(() => {
    if (!externalQuestionRequest) {
      return;
    }

    void handleQuery(externalQuestionRequest.question);
  }, [externalQuestionRequest, handleQuery]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-emerald-500" />
            Análise Inteligente com IA
          </CardTitle>
          {hasApiKey ? (
            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              DeepSeek Ativo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
              <AlertCircle className="h-3 w-3 mr-1" />
              Modo Local
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            placeholder="Pergunte sobre seus dados..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleQuery()}
            className="flex-1"
          />
          <Button size="icon" onClick={() => handleQuery()} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Lightbulb className="h-3 w-3" /> Sugestões
        </p>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
          {contextualQuestions.map((s, i) => (
            <Badge
              key={i}
              variant="secondary"
              className="cursor-pointer hover:bg-emerald-100 hover:text-emerald-700 transition-colors text-xs py-1"
              onClick={() => handleQuery(s.q)}
            >
              {s.icon} {s.q}
            </Badge>
          ))}
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-emerald-600 border-t-transparent rounded-full" />
              Analisando com IA...
            </motion.div>
          )}

          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between p-3 bg-emerald-50 dark:bg-emerald-950 rounded-lg border border-emerald-200">
              <div className="space-y-1 flex-1">
                <Badge variant="outline" className="text-[10px] bg-emerald-100 border-emerald-300 text-emerald-700">
                  {result.type?.toUpperCase()}
                </Badge>
                <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                  {result.title}
                </p>
                {result.answer && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    {result.answer}
                  </p>
                )}
              </div>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {history.length > 0 && (
          <div className="border-t pt-2 mt-2">
            <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
              <History className="h-3 w-3" /> Histórico
            </p>
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => handleQuery(h.q)}
                className="block w-full text-left text-xs text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded transition-colors"
              >
                <MessageSquare className="h-3 w-3 inline mr-1" />
                {h.q}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
