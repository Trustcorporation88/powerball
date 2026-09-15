import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApp } from '@/contexts/AppContext';
import { FolderOpen, PlusCircle, CheckCircle2, Activity, Clock, TrendingUp, FileText, BarChart3, FileSpreadsheet, Wallet, Building2, Clover } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { projects } = useApp();
  const navigate = useNavigate();

  const processedCount = projects.filter(p => p.status === 'active').length;
  const processingCount = projects.filter(p => p.status === 'processing').length;
  const successRate = projects.length > 0 ? Math.round((processedCount / projects.length) * 100) : 0;

  const statCards = [
    { title: 'Total de Projetos', value: projects.length, icon: FolderOpen, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
    { title: 'Processados', value: processedCount, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950' },
    { title: 'Taxa de Sucesso', value: `${successRate}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950' },
    { title: 'Em Processamento', value: processingCount, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central de Entregas</h1>
          <p className="text-muted-foreground">Escolha a entrega principal do projeto e use o dashboard como apoio analítico</p>
        </div>
        <Button onClick={() => navigate('/projects/new')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            title: 'DRE Gerencial',
            description: 'Entrega estruturada com receita líquida, lucro bruto, EBITDA e resultado líquido.',
            route: '/dre',
            action: 'Abrir DRE',
            badge: 'Principal',
            icon: FileText,
            style: 'border-emerald-200 bg-emerald-50',
          },
          {
            title: 'Dashboard Analítico',
            description: 'Exploração por gráficos, tendências, centros de custo, filtros e consultas.',
            route: '/dashboard',
            action: 'Abrir Dashboard',
            badge: 'Apoio',
            icon: BarChart3,
            style: 'border-blue-200 bg-blue-50',
          },
          {
            title: 'Fluxo de Caixa',
            description: 'Entradas, saídas, saldo do período e caixa acumulado em uma entrega própria.',
            route: '/fluxo-caixa',
            action: 'Abrir Fluxo de Caixa',
            badge: 'Entrega',
            icon: Wallet,
            style: 'border-violet-200 bg-violet-50',
          },
          {
            title: 'Resultado por Centro de Custo',
            description: 'Receita, despesa, saldo e margem por centro de custo, com quadro consolidado.',
            route: '/resultado-centro-custo',
            action: 'Abrir Centro de Custo',
            badge: 'Entrega',
            icon: Building2,
            style: 'border-sky-200 bg-sky-50',
          },
          {
            title: 'Lançamentos Auditáveis',
            description: 'Tabela detalhada para auditoria, exportação e rastreio dos lançamentos processados.',
            route: '/detail',
            action: 'Abrir Auditoria',
            badge: 'Auditoria',
            icon: FolderOpen,
            style: 'border-fuchsia-200 bg-fuchsia-50',
          },
          {
            title: 'Loterias Caixa Inteligentes',
            description: 'Palpites para Mega-Sena e Lotofácil com inteligência estatística, fechamentos e conferidor oficial.',
            route: '/loterias',
            action: 'Abrir Palpites',
            badge: 'Novo',
            icon: Clover,
            style: 'border-emerald-300 bg-gradient-to-br from-emerald-50 to-purple-50',
          },
          {
            title: 'Importação e Mapeamento',
            description: 'Entrada da planilha, confirmação das colunas e classificação financeira + DRE.',
            route: '/import',
            action: 'Importar Dados',
            badge: 'Entrada',
            icon: FileSpreadsheet,
            style: 'border-amber-200 bg-amber-50',
          },
        ].map((delivery, index) => (
          <motion.div key={delivery.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }}>
            <Card className={`h-full ${delivery.style}`}>
              <CardContent className="p-5 flex flex-col h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="p-2 rounded-lg bg-white/70">
                    <delivery.icon className="h-5 w-5 text-slate-800" />
                  </div>
                  <span className="text-[10px] uppercase tracking-wide font-semibold text-slate-600">{delivery.badge}</span>
                </div>
                <div className="mt-4 space-y-2 flex-1">
                  <h2 className="text-lg font-semibold">{delivery.title}</h2>
                  <p className="text-sm text-muted-foreground">{delivery.description}</p>
                </div>
                <Button className="mt-4" variant="outline" onClick={() => navigate(delivery.route)}>
                  {delivery.action}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div key={stat.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.title}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {projects.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold mb-4">Projetos Recentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 6).map(project => (
              <motion.div key={project.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/projects`)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <FolderOpen className="h-8 w-8 text-emerald-600" />
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-xs text-muted-foreground">{project.segment}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        project.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                        project.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {project.status === 'active' ? 'Processado' : project.status === 'processing' ? 'Em andamento' : 'Erro'}
                      </span>
                    </div>
                    {project.lastProcessed && (
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(project.lastProcessed).toLocaleString('pt-BR')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <Card className="text-center p-12">
          <CardContent>
            <FolderOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum projeto ainda</h2>
            <p className="text-muted-foreground mb-4">Importe uma planilha Excel para começar a analisar seus dados financeiros.</p>
            <Button onClick={() => navigate('/projects/new')}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-500" />
              Entregas prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• DRE como entrega principal para resultado consolidado</p>
            <p>• Fluxo de caixa para leitura operacional de entradas e saídas</p>
            <p>• Resultado por centro de custo para responsabilização gerencial</p>
            <p>• Visão auditável para evidência e rastreio dos lançamentos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Recursos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• Classificação DRE direta pela planilha ou inferida</p>
            <p>• Validação determinística antes da entrega</p>
            <p>• Drill-down por categoria, centro de custo e período</p>
            <p>• Exportações executivas e dados auditáveis</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
