import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutTemplate } from 'lucide-react';

interface TemplateSelectorProps {
  onSelect: (template: string) => void;
}

const templates = [
  {
    id: 'default',
    name: 'Padrão',
    description: 'KPIs, evolução mensal e despesas por categoria',
    icon: '📊',
  },
  {
    id: 'executive',
    name: 'Executivo',
    description: 'Resumo financeiro com métricas principais e waterfall',
    icon: '💼',
  },
  {
    id: 'detailed',
    name: 'Detalhado',
    description: 'Visão completa com treemap, waterfall e transações',
    icon: '🔍',
  },
  {
    id: 'categories',
    name: 'Por Categorias',
    description: 'Foco em análise de categorias com treemap e drill-down',
    icon: '🏷️',
  },
];

export default function TemplateSelector({ onSelect }: TemplateSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutTemplate className="h-4 w-4" />
          Templates de Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {templates.map(t => (
            <Button
              key={t.id}
              variant="outline"
              className="h-auto flex-col items-start p-3 gap-1"
              onClick={() => onSelect(t.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{t.icon}</span>
                <span className="font-medium text-sm">{t.name}</span>
              </div>
              <span className="text-xs text-muted-foreground text-left">{t.description}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
