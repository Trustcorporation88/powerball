import { useState, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Share2, Sliders, Bell, Bookmark, MapPin, FileText, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useApp } from '@/contexts/AppContext';
import { useDashboardData, type ComparisonType } from '@/hooks/useDashboardData';
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

import GaugeChart from '@/components/dashboard/GaugeChart';
import WhatIfPanel from '@/components/dashboard/WhatIfPanel';
import AlertManager from '@/components/dashboard/AlertManager';
import BookmarkManager from '@/components/dashboard/BookmarkManager';
import SuggestedQuestions from '@/components/dashboard/SuggestedQuestions';
import KeyInfluencers from '@/components/dashboard/KeyInfluencers';
import MapChart from '@/components/dashboard/MapChart';
import { generateMockTransactions } from '@/data/mockData';
import PowerPointExport from '@/components/dashboard/PowerPointExport';
import { Database } from 'lucide-react';

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#3b82f6', '#8b5cf6'];

export default function Dashboard() {
  const { transactions, currentProject, setTransactions, currentFile } = useApp();
  const [searchParams] = useSearchParams();

  const drillCategory = searchParams.get('category') || null;
  const drillCostCenter = searchParams.get('costCenter') || null;

  const [filters, setFilters] = useState<any>({
    period: 'all',
    category: drillCategory || null,
    costCenter: drillCostCenter || null,
    search: '',
  });
  const [crossFilterCategory, setCrossFilterCategory] = useState<string | null>(drillCategory);
  const [crossFilterCostCenter, setCrossFilterCostCenter] = useState<string | null>(drillCostCenter);
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const [template, setTemplate] = useState('default');
  const [showShare, setShowShare] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCalculated, setShowCalculated] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('pop');

  const activeFilters = {
    ...filters,
    category: crossFilterCategory || filters.category,
    costCenter: crossFilterCostCenter || filters.costCenter,
  };

  const {
    kpis,
    monthlyData,
    categoryData,
    costCenterData,
    topCategories,
    categories,
    costCenters,
    comparison,
    keyInfluencers,
  } = useDashboardData(transactions, activeFilters, comparisonType);

  const treemapData = useMemo(() =>
    categoryData.map((c: any) => ({ name: c.name, value: c.value })),
    [categoryData]
  );

  const handleGlobalClick = useCallback((payload: any) => {
    if (payload?.name) {
      setCrossFilterCategory(payload.name);
      setFilters((prev: any) => ({ ...prev, category: payload.name }));
    }
  }, []);

  const handleCrossFilterSelect = useCallback((cat: string | null) => {
    setCrossFilterCategory(cat);
    setFilters((prev: any) => ({ ...prev, category: cat }));
    if (cat) setDrillDownCategory(cat);
  }, []);

  const handleCrossFilterCostCenter = useCallback((cc: string | null) => {
    setCrossFilterCostCenter(cc);
    setFilters((prev: any) => ({ ...prev, costCenter: cc }));
  }, []);

  const handleDrillDown = (name: string) => setDrillDownCategory(name);
  const handleExportPDF = () => window.print();
  const handleLoadBookmark = (savedFilters: any) => {
    setFilters(savedFilters);
    setCrossFilterCategory(savedFilters.category || null);
  };

  const mapPoints = useMemo(() => {
    const cities: Record<string, { lat: number; lng: number }> = {
      'Matriz': { lat: -23.5505, lng: -46.6333 },
      'Filial SP': { lat: -23.5505, lng: -46.6333 },
      'Filial RJ': { lat: -22.9068, lng: -43.1729 },
      'Home Office': { lat: -19.9167, lng: -43.9345 },
      'Geral': { lat: -15.7801, lng: -47.9292 },
    };
    const grouped: Record<string, number> = {};
    transactions.forEach(t => {
      const key = t.costCenter || 'Geral';
      grouped[key] = (grouped[key] || 0) + Math.abs(t.value);
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      lat: cities[name]?.lat || -15.7801,
      lng: cities[name]?.lng || -47.9292,
    }));
  }, [transactions]);

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
              onSelect={handleCrossFilterSelect}
              color="#059669"
            />
            <ChartCard title="Composição por Centro de Custo">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={costCenterData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    onClick={handleGlobalClick}>
                    {costCenterData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <KeyInfluencers transactions={transactions} targetMetric="expense" />
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
            onSelect={handleCrossFilterSelect}
            color="#8b5cf6"
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CrossFilterBar
              data={costCenterData.map((c: any) => ({ name: c.name, value: c.value }))}
              title="Centros de Custo"
              selected={crossFilterCostCenter}
              onSelect={handleCrossFilterCostCenter}
              color="#3b82f6"
            />
            <KeyInfluencers transactions={transactions} targetMetric="expense" />
          </div>
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
                <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} fontSize={10} />
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
            onSelect={handleCrossFilterSelect}
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
                <Pie data={costCenterData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  onClick={handleGlobalClick}>
                  {costCenterData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <NaturalLanguageQuery transactions={transactions} kpis={kpis} onFilterChange={setFilters} />
          <DecompositionTree transactions={transactions} />
        </div>

        {showMap && (
          <MapChart data={mapPoints} title="Distribuição Geográfica" />
        )}
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
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={comparisonType} onValueChange={(v) => setComparisonType(v as ComparisonType)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pop" className="text-xs">vs Período</SelectItem>
              <SelectItem value="mom" className="text-xs">vs Mês Ant.</SelectItem>
              <SelectItem value="yoy" className="text-xs">vs Ano Ant.</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
            const mock = generateMockTransactions();
            setTransactions(mock);
          }}>
            <Database className="h-4 w-4 mr-1" /> Dados Demo
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
            Templates
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowCalculated(!showCalculated)}>
            Colunas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowWhatIf(true)}>
            <Sliders className="h-4 w-4 mr-1" /> Simular
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowAlerts(true)}>
            <Bell className="h-4 w-4 mr-1" /> Alertas
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowBookmarks(true)}>
            <Bookmark className="h-4 w-4 mr-1" /> Favoritos
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowMap(!showMap)}>
            <MapPin className="h-4 w-4 mr-1" /> Mapa
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)}>
            <Share2 className="h-4 w-4 mr-1" /> Compartilhar
          </Button>
          <ThemeToggle />
          <ExportButton />
          <PowerPointExport
            projectName={currentProject?.name || 'Dashboard'}
            kpis={kpis}
            categoryData={categoryData}
          />
          <Link to="/detail">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-1" /> Detalhes
            </Button>
          </Link>
        </div>
      </div>

      {showTemplates && <TemplateSelector onSelect={(t) => { setTemplate(t); setShowTemplates(false); }} />}
      {showCalculated && <CalculatedColumns />}

      {transactions.length === 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-xl p-8 text-center">
          <Database className="h-12 w-12 mx-auto text-amber-500 mb-3" />
          <h2 className="text-xl font-bold text-amber-800 mb-2">Nenhum dado carregado</h2>
          <p className="text-amber-600 mb-4 max-w-md mx-auto">
            Importe uma planilha Excel com dados financeiros ou use dados de demonstração para testar os dashboards.
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-white" onClick={() => {
              const mock = generateMockTransactions();
              setTransactions(mock);
            }}>
              <Database className="h-5 w-5 mr-2" /> Carregar 150 Transações Demo
            </Button>
            <Link to="/import">
              <Button size="lg" variant="outline">
                <FileSpreadsheet className="h-5 w-5 mr-2" /> Importar Planilha
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      <SuggestedQuestions onSelect={(q) => {
        setFilters((prev: any) => ({ ...prev, search: q }));
      }} context={{ categories, period: filters.period }} />

      <DashboardFilters filters={filters} onChange={setFilters} categories={categories} costCenters={costCenters} />
      <KpiCards kpis={kpis} monthlyData={monthlyData} comparison={comparison} />

      {comparison && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GaugeChart title="Receita vs Meta" value={kpis.income} target={comparison.income * 1.2 || 10000} unit="R$" color="#059669" />
          <GaugeChart title="Despesa Controlada" value={kpis.expense} target={comparison.expense * 0.9 || 10000} unit="R$" color="#ef4444" />
          <GaugeChart title="Saldo" value={kpis.balance} target={Math.max(kpis.balance, 10000)} unit="R$" color="#3b82f6" />
          <GaugeChart title="Margem %" value={kpis.margin} target={30} unit="%" color="#8b5cf6" />
        </div>
      )}

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

      <WhatIfPanel
        open={showWhatIf}
        onClose={() => setShowWhatIf(false)}
        transactions={transactions}
        kpis={kpis}
      />

      <AlertManager onClose={() => setShowAlerts(false)} />

      <BookmarkManager
        currentFilters={activeFilters}
        onLoad={handleLoadBookmark}
      />
    </motion.div>
  );
}
