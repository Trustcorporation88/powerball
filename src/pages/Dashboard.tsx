import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/AppContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { motion } from 'framer-motion';

import { KpiCards } from '@/components/dashboard/KpiCards';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { TransactionsTable } from '@/components/dashboard/TransactionsTable';
import { SmartNarrative } from '@/components/dashboard/SmartNarrative';
import { ThemeToggle } from '@/components/dashboard/ThemeToggle';
import ExportButton from '@/components/dashboard/ExportButton';
import { CustomTooltip } from '@/components/dashboard/CustomTooltip';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { DecompositionTree } from '@/components/dashboard/DecompositionTree';
import NaturalLanguageQuery from '@/components/dashboard/NaturalLanguageQuery';
import CrossFilterBar from '@/components/dashboard/CrossFilterBar';
import TreemapChart from '@/components/dashboard/TreemapChart';
import WaterfallChart from '@/components/dashboard/WaterfallChart';
import DrillDownChart from '@/components/dashboard/DrillDownChart';
import CalculatedColumns from '@/components/dashboard/CalculatedColumns';
import TemplateSelector from '@/components/dashboard/TemplateSelector';
import ShareDialog from '@/components/dashboard/ShareDialog';

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#3b82f6', '#8b5cf6'];

export default function Dashboard() {
  const { transactions, currentProject } = useApp();
  const [filters, setFilters] = useState<any>({ period: 'all', category: null, costCenter: null, search: '' });
  const [crossFilterCategory, setCrossFilterCategory] = useState<string | null>(null);
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const [template, setTemplate] = useState('default');
  const [showShare, setShowShare] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCalculated, setShowCalculated] = useState(false);

  const activeFilters = { ...filters, category: crossFilterCategory || filters.category };

  const { kpis, monthlyData, categoryData, costCenterData, topCategories, categories, costCenters } = useDashboardData(transactions, activeFilters);

  const treemapData = useMemo(() =>
    categoryData.map((c: any) => ({ name: c.name, value: c.value })),
    [categoryData]
  );

  const handleDrillDown = (name: string) => setDrillDownCategory(name);
  const handleExportPDF = () => window.print();

  const renderCharts = () => {
    if (template === 'executive') {
      return (
        <>
          <SmartNarrative kpis={kpis} topCategories={topCategories} monthlyData={monthlyData} />
          <WaterfallChart title="Fluxo Financeiro (Waterfall)" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CrossFilterBar
              data={categoryData}
              title="Despesas por Categoria"
              selected={crossFilterCategory}
              onSelect={(c) => setCrossFilterCategory(c)}
              color="#059669"
            />
            <ChartCard title="Composição por Centro de Custo">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={costCenterData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {costCenterData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      );
    }

    if (template === 'categories') {
      return (
        <>
          {drillDownCategory ? (
            <DrillDownChart category={drillDownCategory} onBack={() => setDrillDownCategory(null)} />
          ) : (
            <TreemapChart data={treemapData} title="Despesas por Categoria (Treemap)" onDrillDown={handleDrillDown} />
          )}
          <CrossFilterBar
            data={categoryData}
            title="Top Categorias"
            selected={crossFilterCategory}
            onSelect={(c) => setCrossFilterCategory(c)}
            color="#8b5cf6"
          />
        </>
      );
    }

    return (
      <>
        <SmartNarrative kpis={kpis} topCategories={topCategories} monthlyData={monthlyData} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartCard title="Evolução Mensal">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={10} />
                <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} fontSize={10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="income" name="Receita" stroke="#059669" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expense" name="Despesa" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <CrossFilterBar
            data={categoryData}
            title="Despesas por Categoria"
            selected={crossFilterCategory}
            onSelect={(c) => { setCrossFilterCategory(c); if (c) setDrillDownCategory(c); }}
            color="#059669"
          />
        </div>

        {drillDownCategory && (
          <DrillDownChart category={drillDownCategory} onBack={() => setDrillDownCategory(null)} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChartCard title="Composição por Centro de Custo">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={costCenterData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                  {costCenterData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <NaturalLanguageQuery transactions={transactions} kpis={kpis} onFilterChange={setFilters} />
          <DecompositionTree transactions={transactions} />
        </div>
      </>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link to="/projects" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{currentProject?.name || 'Dashboard'}</h1>
            <p className="text-sm text-muted-foreground">{currentProject?.segment}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCalculated(!showCalculated)}>
            Colunas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)}>
            <Share2 className="h-4 w-4 mr-1" /> Compartilhar
          </Button>
          <ThemeToggle />
          <ExportButton />
          <Link to="/detail">
            <Button variant="outline" size="sm">Detalhes</Button>
          </Link>
        </div>
      </div>

      {showTemplates && <TemplateSelector onSelect={(t) => { setTemplate(t); setShowTemplates(false); }} />}
      {showCalculated && <CalculatedColumns />}

      <DashboardFilters filters={filters} onChange={setFilters} categories={categories} costCenters={costCenters} />
      <KpiCards kpis={kpis} monthlyData={monthlyData} />
      {renderCharts()}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transações</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable transactions={transactions} />
        </CardContent>
      </Card>

      <ShareDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        projectName={currentProject?.name || 'Dashboard'}
        onExportPDF={handleExportPDF}
      />
    </motion.div>
  );
}
