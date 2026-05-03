import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { queryNLP } from '@/services/ai';

interface NLPProps {
  transactions: any[];
  kpis: any;
  onFilterChange: (filters: any) => void;
}

export default function NaturalLanguageQuery({ transactions, kpis, onFilterChange }: NLPProps) {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const categories = [...new Set(transactions.map((t: any) => t.category))];
  const costCenters = [...new Set(transactions.map((t: any) => t.costCenter))];

  const totalIncome = kpis?.income?.value || 0;
  const totalExpense = kpis?.expense?.value || 0;

  const handleQuery = async () => {
    if (!question.trim()) return;
    setLoading(true);

    const response = await queryNLP(question, {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      categories: categories as string[],
      costCenters: costCenters as string[],
      dateRange: 'último período',
    });

    setResult(response);
    setLoading(false);

    if (response.filter) {
      onFilterChange((prev: any) => ({
        ...prev,
        ...response.filter,
      }));
    }
  };

  const suggestions = [
    'Receita por categoria',
    'Top 5 despesas',
    'Qual o meu saldo?',
    'Despesas por centro de custo',
    'Margem operacional',
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-yellow-500" />
          Consulta Inteligente (IA)
        </CardTitle>
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
          <Button size="icon" onClick={handleQuery} disabled={loading}>
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          {suggestions.map((s, i) => (
            <Button key={i} variant="secondary" size="sm" onClick={() => { setQuestion(s); }}>
              {s}
            </Button>
          ))}
        </div>

        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              Consultando IA...
            </motion.div>
          )}

          {result && !loading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start justify-between p-3 bg-emerald-50 dark:bg-emerald-950 rounded">
              <div>
                <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {result.type?.toUpperCase()}: {result.title}
                </span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
