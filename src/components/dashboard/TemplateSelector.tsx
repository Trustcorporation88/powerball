import { ProFeatureCard } from '@/components/ProFeature';

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
  void onSelect;
  return (
    <ProFeatureCard
      title="Templates de Dashboard"
      description={`Os templates avançados (${templates.map((template) => template.name).join(", ")}) ficam disponíveis apenas para Usuário Pro até a padronização completa das variações de layout.`}
    />
  );
}
