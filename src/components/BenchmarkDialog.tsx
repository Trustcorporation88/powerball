import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Search, TrendingUp, AlertCircle, ExternalLink, Loader2, CheckCircle, XCircle } from "lucide-react";
import { getMultipleCompanies, BENCHMARK_COMPANIES, type BrapiCompany } from "@/services/brapi";

interface BenchmarkDialogProps {
  open: boolean;
  onClose: () => void;
  userMetrics: {
    revenue: number;
    grossProfit: number;
    operatingIncome: number;
    profitMargin: number;
  };
}

export function BenchmarkDialog({ open, onClose, userMetrics }: BenchmarkDialogProps) {
  const [selectedSector, setSelectedSector] = useState<string>('Varejo');
  const [companies, setCompanies] = useState<BrapiCompany[]>([]);
  const [loading, setLoading] = useState(false);
  const [customTicker, setCustomTicker] = useState('');

  const handleLoadBenchmark = async () => {
    setLoading(true);
    const tickers = BENCHMARK_COMPANIES[selectedSector as keyof typeof BENCHMARK_COMPANIES] || [];
    const data = await getMultipleCompanies(tickers);
    setCompanies(data);
    setLoading(false);
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Benchmark com Empresas Brasileiras (B3)
          </DialogTitle>
          <DialogDescription>
            Compare seus indicadores com empresas públicas usando dados da CVM via Brapi.dev
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seus indicadores */}
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4">
              <p className="text-sm font-semibold text-emerald-900 mb-3">Seus Indicadores</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-emerald-600">Receita</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(userMetrics.revenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600">Lucro Bruto</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(userMetrics.grossProfit)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600">EBIT</p>
                  <p className="text-lg font-bold text-emerald-900">{formatCurrency(userMetrics.operatingIncome)}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600">Margem Líquida</p>
                  <p className="text-lg font-bold text-emerald-900">{formatPercent(userMetrics.profitMargin / 100)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seletor de setor */}
          <div>
            <p className="text-sm font-medium mb-2">Selecione um setor para comparar</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(BENCHMARK_COMPANIES).map((sector) => (
                <Button
                  key={sector}
                  variant={selectedSector === sector ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSector(sector)}
                  className={selectedSector === sector ? "bg-emerald-600" : ""}
                >
                  {sector}
                </Button>
              ))}
            </div>
          </div>

          {/* Ação */}
          <div className="flex gap-2">
            <Button onClick={handleLoadBenchmark} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Carregar Dados do Setor {selectedSector}
            </Button>
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Ex: PETR4"
                value={customTicker}
                onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                className="w-32"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setLoading(true);
                  const data = await getMultipleCompanies([customTicker]);
                  setCompanies(prev => [...prev, ...data]);
                  setCustomTicker('');
                  setLoading(false);
                }}
                disabled={!customTicker || loading}
              >
                Adicionar
              </Button>
            </div>
          </div>

          {/* Resultados */}
          {companies.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold">Empresas do Setor ({companies.length})</p>
              <div className="grid gap-3">
                {companies.map((company) => (
                  <Card key={company.symbol} className="border-slate-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-slate-500" />
                            <p className="font-semibold text-slate-900">{company.longName}</p>
                            <Badge variant="secondary">{company.symbol}</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{company.industry}</p>
                        </div>
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(company.quote.regularMarketPrice)}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Margem Lucro</p>
                          <p className="font-semibold text-slate-900">
                            {formatPercent(company.fundamentals.profitMargins)}
                          </p>
                          {company.fundamentals.profitMargins > userMetrics.profitMargin / 100 ? (
                            <TrendingUp className="h-3 w-3 text-red-500 inline" />
                          ) : (
                            <CheckCircle className="h-3 w-3 text-emerald-500 inline" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">ROE</p>
                          <p className="font-semibold text-slate-900">
                            {formatPercent(company.fundamentals.returnOnEquity)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Crescimento</p>
                          <p className="font-semibold text-slate-900">
                            {formatPercent(company.fundamentals.revenueGrowth)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">P/L</p>
                          <p className="font-semibold text-slate-900">
                            {company.fundamentals.priceEarnings.toFixed(1)}x
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Div. Yield</p>
                          <p className="font-semibold text-slate-900">
                            {formatPercent(company.fundamentals.dividendYield)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Dados da Brapi.dev (API gratuita)</p>
              <p>Fundamentals de empresas da B3 atualizados diariamente. 
                <a 
                  href="https://brapi.dev" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline ml-1 inline-flex items-center gap-1"
                >
                  Saiba mais <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
