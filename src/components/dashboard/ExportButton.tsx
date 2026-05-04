import { useState } from 'react';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  data?: any[];
}

export default function ExportButton({ data }: ExportButtonProps) {
  const { transactions, currentProject } = useApp();
  const [exporting, setExporting] = useState(false);

  const dataToExport = data || transactions;

  const exportCSV = () => {
    try {
      const headers = ['Data', 'Descrição', 'Categoria', 'Grupo DRE', 'Centro de Custo', 'Conta', 'Valor', 'Tipo'];
      const rows = dataToExport.map(t => [
        t.date, t.description, t.category, t.dreGroup || '', t.costCenter, t.account,
        t.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        t.flowType === 'income' ? 'Receita' : 'Despesa',
      ]);
      
      const csv = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'export'}_dados.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('CSV exportado com sucesso');
    } catch (e: any) {
      toast.error('Erro ao exportar CSV');
    }
  };

  const exportExcel = () => {
    try {
      setExporting(true);
      const wb = XLSX.utils.book_new();

      const transHeaders = ['Data', 'Descrição', 'Categoria', 'Grupo DRE', 'Subcategoria', 'Conta', 'Centro de Custo', 'Unidade', 'Valor (R$)', 'Moeda', 'Tipo'];
      const transRows = dataToExport.map(t => [
        t.date, t.description, t.category, t.dreGroup || '', t.subcategory || '', t.account || '',
        t.costCenter, t.unit || '',
        t.value,
        t.currency || 'BRL',
        t.flowType === 'income' ? 'Receita' : 'Despesa',
      ]);
      
      const wsTrans = XLSX.utils.aoa_to_sheet([transHeaders, ...transRows]);
      
      const colWidths = transHeaders.map((_, i) => ({ wch: i === 1 ? 40 : i === 7 ? 15 : 18 }));
      wsTrans['!cols'] = colWidths;

      XLSX.utils.book_append_sheet(wb, wsTrans, 'Transações');

      const incomeTotal = dataToExport.filter(t => t.flowType === 'income').reduce((s, t) => s + t.value, 0);
      const expenseTotal = dataToExport.filter(t => t.flowType === 'expense').reduce((s, t) => s + Math.abs(t.value), 0);

      const resumoHeaders = ['Métrica', 'Valor'];
      const resumoRows = [
        ['Receita Total', incomeTotal],
        ['Despesa Total', expenseTotal],
        ['Saldo', incomeTotal - expenseTotal],
        ['Margem (%)', incomeTotal > 0 ? ((incomeTotal - expenseTotal) / incomeTotal * 100) : 0],
        ['Total de Lançamentos', dataToExport.length],
      ];

      const wsResumo = XLSX.utils.aoa_to_sheet([resumoHeaders, ...resumoRows]);
      wsResumo['!cols'] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

      XLSX.writeFile(wb, `${currentProject?.name || 'export'}_completo.xlsx`);
      toast.success('Excel exportado com sucesso');
    } catch (e: any) {
      toast.error('Erro ao exportar Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="h-4 w-4 mr-2" />
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
