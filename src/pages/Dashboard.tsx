import { useState, useMemo, useCallback, useEffect } from 'react';
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
import ShareDialog from '@/components/dashboard/ShareDialog';

import GaugeChart from '@/components/dashboard/GaugeChart';
import WhatIfPanel from '@/components/dashboard/WhatIfPanel';
import AlertManager from '@/components/dashboard/AlertManager';
import BookmarkManager from '@/components/dashboard/BookmarkManager';
import SuggestedQuestions from '@/components/dashboard/SuggestedQuestions';
import KeyInfluencers from '@/components/dashboard/KeyInfluencers';
import MapChart from '@/components/dashboard/MapChart';
import PowerPointExport from '@/components/dashboard/PowerPointExport';
import { Database } from 'lucide-react';
import { generateMockTransactions } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { validateTransactions } from '@/services/validation';
import { ValidationSummary } from '@/components/ValidationSummary';
import { queryNLP } from '@/services/ai';
import { ProFeatureButton } from '@/components/ProFeature';
import { EmptyState } from '@/components/EmptyState';
import { AuditPanel } from '@/components/audit/AuditPanel';
import { auditDashboardConsolidation, type AuditReport } from '@/services/audit';

const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#3b82f6', '#8b5cf6'];

const periods = [
  { id: "all", label: "Todo Período" },
  { id: "today", label: "Hoje" },
  { id: "7days", label: "Últimos 7 dias" },
  { id: "30days", label: "Últimos 30 dias" },
  { id: "thisMonth", label: "Este Mês" },
  { id: "thisQuarter", label: "Este Trimestre" },
  { id: "thisYear", label: "Este Ano" },
];

export default function Dashboard() {
  const { transactions, currentProject, setTransactions, getRLSFilteredData } = useApp();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditKey, setAuditKey] = useState<string>("");

  const drillCategory = searchParams.get('category') || null;
  const drillCostCenter = searchParams.get('costCenter') || null;
  const panel = searchParams.get('panel');

  const [filters, setFilters] = useState<any>({
    period: 'all',
    category: drillCategory || null,
    costCenter: drillCostCenter || null,
    search: '',
  });
  const [crossFilterCategory, setCrossFilterCategory] = useState<string | null>(drillCategory);
  const [crossFilterCostCenter, setCrossFilterCostCenter] = useState<string | null>(drillCostCenter);
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const [template, setTemplate] = useState<'default' | 'executive' | 'categories'>('default');
  const [showShare, setShowShare] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [comparisonType, setComparisonType] = useState<ComparisonType>('pop');
  const [externalQuestionRequest, setExternalQuestionRequest] = useState<{ id: number; question: string } | null>(null);
  const visibleTransactions = useMemo(
    () => getRLSFilteredData(user?.role ?? 'user'),
    [getRLSFilteredData, user?.role],
  );
  const validationReport = useMemo(
    () => validateTransactions(visibleTransactions),
    [visibleTransactions],
  );

  const updatePanel = useCallback((nextPanel: 'alerts' | 'bookmarks' | 'map' | null) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextPanel) {
      nextParams.set('panel', nextPanel);
    } else {
      nextParams.delete('panel');
    }

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setShowAlerts(panel === 'alerts');
    setShowBookmarks(panel === 'bookmarks');
    setShowMap(panel === 'map');
  }, [panel]);

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
  } = useDashboardData(visibleTransactions, activeFilters, comparisonType);

  const treemapData = useMemo(() =>
    categoryData.map((c: any) => ({ name: c.name, value: c.value })),
    [categoryData]
  );

  const runDashboardAudit = useCallback(async () => {
    if (!kpis || Object.keys(kpis).length === 0) {
      return;
    }

    setAuditLoading(true);
    try {
      const summary = {
        totalIncome: kpis.income || 0,
        totalExpense: kpis.expense || 0,
        netResult: kpis.balance ?? ((kpis.income || 0) - (kpis.expense || 0)),
        projectCount: currentProject ? 1 : 0,
        transactionCount: visibleTransactions.length,
      };

      const report = await auditDashboardConsolidation(summary);
      setAuditReport(report);
    } catch (error) {
      console.error('Dashboard audit failed:', error);
    } finally {
      setAuditLoading(false);
    }
  }, [kpis, currentProject, visibleTransactions.length]);

  // Auto-run audit when KPIs change
  useEffect(() => {
    if (!kpis || Object.keys(kpis).length === 0) {
      setAuditReport(null);
      return;
    }

    const currentKey = JSON.stringify(kpis);
    if (currentKey !== auditKey) {
      setAuditKey(currentKey);
      setAuditReport(null);
      
      const timer = setTimeout(() => {
        runDashboardAudit();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [kpis, auditKey, runDashboardAudit]);

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
    setCrossFilterCostCenter(savedFilters.costCenter || null);
  };

  const handleSuggestedQuestion = useCallback(async (question: string) => {
    setFilters((prev: any) => ({ ...prev, search: '' }));

    const response = await queryNLP(question, {
      totalIncome: kpis.income,
      totalExpense: kpis.expense,
      balance: kpis.balance,
      categories,
      costCenters,
      dateRange: 'período atual',
    });

    if (response.filter) {
      setFilters((prev: any) => ({
        ...prev,
        ...response.filter,
      }));

      if (response.filter.category !== undefined) {
        setCrossFilterCategory(response.filter.category ?? null);
      }

      if (response.filter.costCenter !== undefined) {
        setCrossFilterCostCenter(response.filter.costCenter ?? null);
      }
    }

    setExternalQuestionRequest({ id: Date.now(), question });
  }, [categories, costCenters, kpis.balance, kpis.expense, kpis.income]);

  const mapPoints = useMemo(() => {
    const cities: Record<string, { lat: number; lng: number }> = {
      'Matriz': { lat: -23.5505, lng: -46.6333 },
      'Filial SP': { lat: -23.5505, lng: -46.6333 },
      'Filial RJ': { lat: -22.9068, lng: -43.1729 },
      'Home Office': { lat: -19.9167, lng: -43.9345 },
      'Geral': { lat: -15.7801, lng: -47.9292 },
    };
    const grouped: Record<string, number> = {};
    visibleTransactions.forEach(t => {
      const key = t.costCenter || 'Geral';
      grouped[key] = (grouped[key] || 0) + Math.abs(t.value);
    });
    return Object.entries(grouped).map(([name, value]) => ({
      name,
      value,
      lat: cities[name]?.lat || -15.7801,
      lng: cities[name]?.lng || -47.9292,
    }));
  }, [visibleTransactions]);

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
          <KeyInfluencers transactions={visibleTransactions} targetMetric="expense" />
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
             <KeyInfluencers transactions={visibleTransactions} targetMetric="expense" />
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
           <NaturalLanguageQuery
             transactions={visibleTransactions}
             kpis={kpis}
             onFilterChange={setFilters}
             externalQuestionRequest={externalQuestionRequest}
           />
           <DecompositionTree transactions={visibleTransactions} />
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
            <h1 className="text-2xl font-bold">{currentProject?.name || 'Dashboard Analítico'}</h1>
            <p className="text-sm text-muted-foreground">
              {currentProject?.segment} • apoio analítico complementar à entrega DRE
            </p>
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
             void setTransactions(mock);
           }}>
            <Database className="h-4 w-4 mr-1" /> Dados Demo
          </Button>
          <Select value={template} onValueChange={(v) => setTemplate(v as typeof template)}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default" className="text-xs">Painel Padrão</SelectItem>
              <SelectItem value="executive" className="text-xs">Resumo Executivo</SelectItem>
              <SelectItem value="categories" className="text-xs">Por Categoria</SelectItem>
            </SelectContent>
          </Select>
          <ProFeatureButton label="Colunas" />
          <Button variant="outline" size="sm" onClick={() => setShowWhatIf(true)}>
            <Sliders className="h-4 w-4 mr-1" /> Simular
          </Button>
          <Button variant="outline" size="sm" onClick={() => updatePanel('alerts')}>
            <Bell className="h-4 w-4 mr-1" /> Alertas
          </Button>
          <Button variant="outline" size="sm" onClick={() => updatePanel('bookmarks')}>
            <Bookmark className="h-4 w-4 mr-1" /> Favoritos
          </Button>
          <Button variant="outline" size="sm" onClick={() => updatePanel(showMap ? null : 'map')}>
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
          <Link to="/dre">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-1" /> DRE
            </Button>
          </Link>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 text-sm text-blue-900 flex items-center justify-between gap-3 flex-wrap">
          <span>
            Esta tela agora funciona como <strong>apoio analítico</strong>. A entrega principal do projeto é o <strong>DRE Gerencial</strong>.
          </span>
          <Link to="/dre">
            <Button size="sm" variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Abrir DRE
            </Button>
          </Link>
        </CardContent>
      </Card>

      {visibleTransactions.length === 0 && (
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
               void setTransactions(mock);
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

      {visibleTransactions.length > 0 && (
        <ValidationSummary report={validationReport} title="Validação final da entrega" />
      )}

      {visibleTransactions.length > 0 && kpis && (
        <AuditPanel
          type="dashboard"
          audit={auditReport}
          loading={auditLoading}
          onRunAudit={runDashboardAudit}
          blocking={false}
          disabled={Object.keys(kpis).length === 0}
        />
      )}

      {!validationReport.approved && visibleTransactions.length > 0 && (
        <Card className="border-rose-200 bg-rose-50">
          <CardContent className="p-5 text-sm text-rose-700">
            A apresentação analítica foi bloqueada porque a validação local encontrou inconsistências críticas nos dados processados. Corrija o mapeamento/importação antes de prosseguir.
          </CardContent>
        </Card>
      )}

      {validationReport.approved && (
        <>
          <SuggestedQuestions onSelect={(q) => {
            void handleSuggestedQuestion(q);
          }} context={{ categories, period: filters.period }} />

          <DashboardFilters filters={filters} onChange={setFilters} categories={categories} costCenters={costCenters} />
          
          {kpis.transactionCount === 0 && (filters.period !== 'all' || filters.category !== 'all' || filters.costCenter !== 'all' || filters.search !== '') && (
            <EmptyState
              title="Nenhuma transação encontrada"
              message={`Filtro ativo: ${
                filters.period !== 'all' ? periods.find(p => p.id === filters.period)?.label :
                filters.category !== 'all' ? `Categoria: ${filters.category}` :
                filters.costCenter !== 'all' ? `Centro de Custo: ${filters.costCenter}` :
                'Busca textual'
              }. Tente "Todo Período" ou ajuste os filtros.`}
              action={{
                label: 'Limpar todos os filtros',
                onClick: () => setFilters({ period: 'all', category: 'all', costCenter: 'all', search: '' })
              }}
            />
          )}
          
          {kpis.transactionCount > 0 && (
            <KpiCards kpis={kpis} monthlyData={monthlyData} comparison={comparison} />
          )}

          {kpis.transactionCount > 0 && comparison && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <GaugeChart title="Receita vs Meta" value={kpis.income} target={comparison.income * 1.2 || 10000} unit="R$" color="#059669" goal="maximize" />
              <GaugeChart title="Despesa Controlada" value={kpis.expense} target={comparison.expense * 0.9 || 10000} unit="R$" color="#ef4444" goal="minimize" />
              <GaugeChart title="Saldo" value={kpis.balance} target={Math.max(comparison.balance, 10000)} unit="R$" color="#3b82f6" goal="maximize" />
              <GaugeChart title="Margem %" value={kpis.margin} target={30} unit="%" color="#8b5cf6" goal="maximize" />
            </div>
          )}

          {kpis.transactionCount > 0 && renderCharts()}

          {kpis.transactionCount > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Transações</CardTitle>
              </CardHeader>
              <CardContent>
                <TransactionsTable transactions={visibleTransactions} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ShareDialog
        open={showShare}
        onClose={() => setShowShare(false)}
        projectName={currentProject?.name || 'Dashboard'}
        onExportPDF={handleExportPDF}
        snapshot={{
          projectName: currentProject?.name || 'Dashboard',
          createdAt: new Date().toISOString(),
          transactions: visibleTransactions,
          kpis,
          monthlyData,
          categoryData,
          costCenterData,
          filters: activeFilters,
          comparison: comparison ?? null,
        }}
      />

      <WhatIfPanel
        open={showWhatIf}
        onClose={() => setShowWhatIf(false)}
        transactions={visibleTransactions}
        kpis={kpis}
      />

      {showAlerts && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => updatePanel(null)}>
          <div onClick={(event) => event.stopPropagation()}>
            <AlertManager onClose={() => updatePanel(null)} />
          </div>
        </div>
      )}

      <BookmarkManager
        currentFilters={activeFilters}
        onLoad={handleLoadBookmark}
        open={showBookmarks}
        onOpenChange={(open) => {
          setShowBookmarks(open);
          if (!open) {
            updatePanel(null);
          }
        }}
        hideTrigger
      />
    </motion.div>
  );
}
