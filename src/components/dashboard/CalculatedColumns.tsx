import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface CalcField {
  id: string;
  name: string;
  formula: string;
  result: number;
}

export default function CalculatedColumns() {
  const { transactions } = useApp();
  const [fields, setFields] = useState<CalcField[]>([]);
  const [newName, setNewName] = useState('');
  const [newFormula, setNewFormula] = useState('');

  const evaluateFormula = (formula: string): number => {
    try {
      const totalIncome = transactions.filter(t => t.flowType === 'income').reduce((s, t) => s + t.value, 0);
      const totalExpense = transactions.filter(t => t.flowType === 'expense').reduce((s, t) => s + t.value, 0);

      const expr = formula
        .replace(/RECEITA_TOTAL/gi, String(totalIncome))
        .replace(/DESPESA_TOTAL/gi, String(totalExpense))
        .replace(/SALDO/gi, String(totalIncome - totalExpense))
        .replace(/MARGEM/gi, String(totalIncome > 0 ? (totalIncome - totalExpense) / totalIncome * 100 : 0))
        .replace(/,/g, '.')
        .replace(/[^0-9+\-*/().%\s]/g, '');

      const result = Function(`"use strict"; return (${expr})`)();
      return typeof result === 'number' && !isNaN(result) ? result : 0;
    } catch {
      return 0;
    }
  };

  const addField = () => {
    if (!newName.trim() || !newFormula.trim()) return;
    const result = evaluateFormula(newFormula);
    setFields([...fields, { id: crypto.randomUUID(), name: newName, formula: newFormula, result }]);
    setNewName('');
    setNewFormula('');
  };

  const removeField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const presets = [
    { label: 'Receita Total', formula: 'RECEITA_TOTAL' },
    { label: 'Despesa Total', formula: 'DESPESA_TOTAL' },
    { label: 'Saldo Líquido', formula: 'RECEITA_TOTAL - DESPESA_TOTAL' },
    { label: 'Margem %', formula: '(RECEITA_TOTAL - DESPESA_TOTAL) / RECEITA_TOTAL * 100' },
    { label: 'Receita + 10%', formula: 'RECEITA_TOTAL * 1.1' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Colunas Calculadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {presets.map(p => (
            <Button key={p.label} variant="outline" size="sm" onClick={() => { setNewName(p.label); setNewFormula(p.formula); }}>
              {p.label}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} className="w-1/3" />
          <Input placeholder="Fórmula (ex: RECEITA_TOTAL * 0.1)" value={newFormula} onChange={e => setNewFormula(e.target.value)} className="flex-1" />
          <Button size="sm" onClick={addField}><Plus className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-2">
          {fields.map(f => (
            <div key={f.id} className="flex items-center justify-between p-2 bg-muted rounded">
              <div>
                <span className="font-medium text-sm">{f.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{f.formula}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-600">
                  R$ {f.result.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <Button size="icon" variant="ghost" onClick={() => removeField(f.id)}>
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          Use: RECEITA_TOTAL, DESPESA_TOTAL, SALDO, MARGEM. Operadores: + - * / ( )
        </div>
      </CardContent>
    </Card>
  );
}
