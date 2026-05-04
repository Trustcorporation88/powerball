import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpCircle, Download, CheckCircle2, Table } from "lucide-react";

export function DREDataGuide() {
  const handleDownloadTemplate = () => {
    // Criar template CSV simples
    const headers = [
      "Data",
      "Categoria",
      "Subcategoria",
      "Conta",
      "Descrição",
      "Valor",
      "Tipo",
      "Grupo DRE",
      "Centro de Custo"
    ];

    const exampleRows = [
      ["01/01/2024", "Vendas", "Produtos", "Venda Direta", "Venda produto A", "1500.00", "Receita", "Receita Bruta", "Comercial"],
      ["02/01/2024", "Vendas", "Serviços", "Consultoria", "Serviço de consultoria", "3000.00", "Receita", "Receita Bruta", "Comercial"],
      ["03/01/2024", "Impostos", "ICMS", "ICMS s/ Vendas", "ICMS Janeiro", "-270.00", "Despesa", "Deduções", "Fiscal"],
      ["05/01/2024", "Custos", "Mercadorias", "CMV", "Custo mercadoria vendida", "-600.00", "Despesa", "Custo", "Produção"],
      ["10/01/2024", "Pessoal", "Salários", "Folha", "Salário Janeiro", "-4500.00", "Despesa", "Despesa Operacional", "Administrativo"],
      ["15/01/2024", "Marketing", "Anúncios", "Google Ads", "Campanha Janeiro", "-800.00", "Despesa", "Despesa Operacional", "Marketing"],
      ["20/01/2024", "Financeiro", "Juros", "Juros Bancários", "Juros empréstimo", "-150.00", "Despesa", "Resultado Financeiro", "Financeiro"],
    ];

    const csvContent = [
      headers.join(","),
      ...exampleRows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-dre-trustcorp.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HelpCircle className="w-4 h-4" />
          Como preparar minha planilha?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Table className="w-6 h-6 text-emerald-600" />
            Guia: Como preparar dados para o DRE
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Estrutura mínima */}
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-emerald-900 text-lg">📋 Colunas necessárias na planilha</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">Data</p>
                    <p className="text-emerald-700">Ex: 01/01/2024, 15/03/2024</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">Categoria</p>
                    <p className="text-emerald-700">Ex: Vendas, Custos, Pessoal</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">Valor</p>
                    <p className="text-emerald-700">Receitas: positivo • Despesas: negativo</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">Tipo</p>
                    <p className="text-emerald-700">Receita ou Despesa</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-emerald-900">Grupo DRE (recomendado)</p>
                    <p className="text-emerald-700">Define a linha do DRE automaticamente</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grupos DRE */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-bold text-slate-900 text-lg">🏷️ Grupos DRE disponíveis</h3>
              <p className="text-sm text-slate-600">
                Use estes valores exatos na coluna <strong>"Grupo DRE"</strong> para classificação automática:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                  <p className="font-semibold text-green-900 mb-2">📈 Receitas</p>
                  <ul className="space-y-1 text-sm text-green-800">
                    <li>• <code className="bg-white px-1 rounded">Receita Bruta</code></li>
                    <li className="text-xs text-green-600 ml-4">Vendas, serviços, produtos</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3 bg-orange-50 border-orange-200">
                  <p className="font-semibold text-orange-900 mb-2">📉 Deduções</p>
                  <ul className="space-y-1 text-sm text-orange-800">
                    <li>• <code className="bg-white px-1 rounded">Deduções</code></li>
                    <li className="text-xs text-orange-600 ml-4">Impostos sobre vendas, devoluções</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3 bg-red-50 border-red-200">
                  <p className="font-semibold text-red-900 mb-2">🏭 Custos</p>
                  <ul className="space-y-1 text-sm text-red-800">
                    <li>• <code className="bg-white px-1 rounded">Custo</code></li>
                    <li>• <code className="bg-white px-1 rounded">CMV</code></li>
                    <li className="text-xs text-red-600 ml-4">Custo de mercadorias/serviços vendidos</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3 bg-purple-50 border-purple-200">
                  <p className="font-semibold text-purple-900 mb-2">💼 Despesas Operacionais</p>
                  <ul className="space-y-1 text-sm text-purple-800">
                    <li>• <code className="bg-white px-1 rounded">Despesa Operacional</code></li>
                    <li>• <code className="bg-white px-1 rounded">Despesas</code></li>
                    <li className="text-xs text-purple-600 ml-4">Salários, marketing, aluguel</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                  <p className="font-semibold text-blue-900 mb-2">💰 Resultado Financeiro</p>
                  <ul className="space-y-1 text-sm text-blue-800">
                    <li>• <code className="bg-white px-1 rounded">Resultado Financeiro</code></li>
                    <li>• <code className="bg-white px-1 rounded">Receita Financeira</code></li>
                    <li>• <code className="bg-white px-1 rounded">Despesa Financeira</code></li>
                    <li className="text-xs text-blue-600 ml-4">Juros, rendimentos, variação cambial</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-3 bg-slate-50 border-slate-200">
                  <p className="font-semibold text-slate-900 mb-2">🎯 Outros</p>
                  <ul className="space-y-1 text-sm text-slate-800">
                    <li>• <code className="bg-white px-1 rounded">Outras Receitas</code></li>
                    <li>• <code className="bg-white px-1 rounded">Outras Despesas</code></li>
                    <li className="text-xs text-slate-600 ml-4">Não operacionais, eventuais</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exemplo prático */}
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-amber-900 text-lg">💡 Exemplo prático</h3>
              <div className="bg-white rounded-lg p-4 border border-amber-200 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b border-amber-300">
                    <tr className="text-left">
                      <th className="pb-2 pr-3">Data</th>
                      <th className="pb-2 pr-3">Categoria</th>
                      <th className="pb-2 pr-3">Descrição</th>
                      <th className="pb-2 pr-3 text-right">Valor</th>
                      <th className="pb-2 pr-3">Tipo</th>
                      <th className="pb-2">Grupo DRE</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <tr className="border-b border-amber-100">
                      <td className="py-2 pr-3">01/01/24</td>
                      <td className="pr-3">Vendas</td>
                      <td className="pr-3">Venda produto A</td>
                      <td className="pr-3 text-right font-mono text-green-700">1.500,00</td>
                      <td className="pr-3">Receita</td>
                      <td className="font-medium">Receita Bruta</td>
                    </tr>
                    <tr className="border-b border-amber-100">
                      <td className="py-2 pr-3">03/01/24</td>
                      <td className="pr-3">Impostos</td>
                      <td className="pr-3">ICMS Janeiro</td>
                      <td className="pr-3 text-right font-mono text-red-700">-270,00</td>
                      <td className="pr-3">Despesa</td>
                      <td className="font-medium">Deduções</td>
                    </tr>
                    <tr className="border-b border-amber-100">
                      <td className="py-2 pr-3">05/01/24</td>
                      <td className="pr-3">Custos</td>
                      <td className="pr-3">CMV produto A</td>
                      <td className="pr-3 text-right font-mono text-red-700">-600,00</td>
                      <td className="pr-3">Despesa</td>
                      <td className="font-medium">Custo</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-3">10/01/24</td>
                      <td className="pr-3">Pessoal</td>
                      <td className="pr-3">Salário Janeiro</td>
                      <td className="pr-3 text-right font-mono text-red-700">-4.500,00</td>
                      <td className="pr-3">Despesa</td>
                      <td className="font-medium">Despesa Operacional</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Dicas importantes */}
          <Card>
            <CardContent className="p-5 space-y-3">
              <h3 className="font-bold text-slate-900 text-lg">⚠️ Atenção aos detalhes</h3>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Receitas:</strong> valores <strong>positivos</strong> (ex: 1500.00)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Despesas:</strong> valores <strong>negativos</strong> (ex: -600.00)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Grupo DRE:</strong> use os nomes exatos da lista acima (case-insensitive)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-600 font-bold shrink-0">!</span>
                  <span>Se não tiver coluna "Grupo DRE", o sistema vai <strong>inferir automaticamente</strong> (menos preciso)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold shrink-0">✓</span>
                  <span><strong>Data:</strong> qualquer formato reconhecível (DD/MM/YYYY, YYYY-MM-DD, etc.)</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Download template */}
          <div className="flex justify-center pt-4">
            <Button onClick={handleDownloadTemplate} size="lg" className="gap-2">
              <Download className="w-5 h-5" />
              Baixar template de exemplo (CSV)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
