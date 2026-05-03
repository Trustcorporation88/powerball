import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Transaction } from "@/contexts/AppContext";
import { toast } from "sonner";

interface ExportButtonProps {
  transactions: Transaction[];
  filename?: string;
}

export const ExportButton = ({ transactions, filename = "dashboard" }: ExportButtonProps) => {
  const exportCSV = () => {
    const headers = ["Data", "Descrição", "Categoria", "Subcategoria", "Centro de Custo", "Conta", "Unidade", "Valor", "Moeda", "Tipo"];
    const rows = transactions.map((t) => [
      t.date,
      t.description,
      t.category,
      t.subcategory,
      t.costCenter,
      t.account,
      t.unit,
      t.value.toString().replace(".", ","),
      t.currency,
      t.flowType === "income" ? "Receita" : "Despesa",
    ]);
    
    const csvContent = "\uFEFF" + [headers, ...rows].map((r) => r.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    
    toast.success(`${transactions.length} registros exportados para CSV`);
  };

  const exportExcel = () => {
    // Simulação de exportação Excel (na prática usaria SheetJS, mas CSV abre no Excel)
    exportCSV();
    toast.success("Arquivo pronto para Excel (CSV com separador ;)");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCSV}>
          <FileText className="w-4 h-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};