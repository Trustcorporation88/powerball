import { useCallback } from "react";
import { Presentation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KpiData } from "@/hooks/useDashboardData";
import { toast } from "sonner";

interface CategoryRow {
  name: string;
  value: number;
  percentage: number;
}

interface PowerPointExportProps {
  projectName: string;
  kpis: KpiData;
  categoryData: CategoryRow[];
  chartRefs?: React.RefObject<HTMLDivElement>[];
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCurrencyXml(v: number): string {
  return escapeXml(
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
  );
}

function generatePptxXml(
  projectName: string,
  kpis: KpiData,
  categoryData: CategoryRow[]
): string {
  const slideWidth = 9144000;
  const slideHeight = 6858000;

  const titleSlide = `
    <p:sld>
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="1" name="Title"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm>
                <a:off x="914400" y="1828800"/>
                <a:ext cx="7315200" cy="914400"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:p>
                <a:r>
                  <a:rPr sz="4400" b="1" lang="pt-BR"/>
                  <a:t>${escapeXml(projectName)} - Dashboard Financeiro</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="2" name="Date"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm>
                <a:off x="914400" y="2971800"/>
                <a:ext cx="7315200" cy="457200"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:p>
                <a:r>
                  <a:rPr sz="1800" lang="pt-BR"/>
                  <a:t>Exportado em: ${escapeXml(new Date().toLocaleDateString("pt-BR"))}</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
          <p:pic>
            <p:nvPicPr>
              <p:cNvPr id="3" name="Logo"/>
              <p:cNvPicPr/>
              <p:nvPr/>
            </p:nvPicPr>
            <p:blipFill>
              <a:blip/>
              <a:stretch><a:fillRect/></a:stretch>
            </p:blipFill>
            <p:spPr>
              <a:xfrm>
                <a:off x="6858000" y="457200"/>
                <a:ext cx="1828800" cy="457200"/>
              </a:xfrm>
              <a:prstGeom prst="rect"/>
            </p:spPr>
          </p:pic>
        </p:spTree>
      </p:cSld>
    </p:sld>
  `;

  const kpiRows = [
    ["Receita Total", formatCurrencyXml(kpis.income)],
    ["Despesa Total", formatCurrencyXml(kpis.expense)],
    ["Saldo Líquido", formatCurrencyXml(kpis.balance)],
    ["Margem Operacional", escapeXml(`${kpis.margin.toFixed(1)}%`)],
    ["Nº de Lançamentos", escapeXml(String(kpis.transactionCount))],
  ];

  const kpiXml = kpiRows
    .map(
      ([label, val], i) => `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${10 + i}" name="KPI${i}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="914400" y="${1371600 + i * 914400}"/>
          <a:ext cx="2743200" cy="685800"/>
        </a:xfrm>
        <a:prstGeom prst="rect"/>
        <a:solidFill><a:srgbClr val="F0FDF4"/></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr lIns="91440" tIns="45720" rIns="91440" bIns="45720"/>
        <a:p>
          <a:r>
            <a:rPr sz="1200" lang="pt-BR">
              <a:solidFill><a:srgbClr val="64748B"/></a:solidFill>
            </a:rPr>
            <a:t>${label}</a:t>
          </a:r>
        </a:p>
        <a:p>
          <a:r>
            <a:rPr sz="2400" b="1" lang="pt-BR">
              <a:solidFill><a:srgbClr val="0F172A"/></a:solidFill>
            </a:rPr>
            <a:t>${val}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>
  `
    )
    .join("\n");

  const kpisSlide = `
    <p:sld>
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="1" name="KPITitle"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm>
                <a:off x="914400" y="274400"/>
                <a:ext cx="7315200" cy="685800"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:p>
                <a:r>
                  <a:rPr sz="3200" b="1" lang="pt-BR"/>
                  <a:t>Resumo de KPIs</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
          ${kpiXml}
        </p:spTree>
      </p:cSld>
    </p:sld>
  `;

  const catHeaders = ["Categoria", "Valor (R$)", "% do Total"];
  const headerXml = catHeaders
    .map(
      (h, i) => `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${100 + i}" name="H${i}"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="${914400 + i * 2438400}" y="1371600"/>
          <a:ext cx="2438400" cy="457200"/>
        </a:xfrm>
        <a:prstGeom prst="rect"/>
        <a:solidFill><a:srgbClr val="059669"/></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr lIns="91440" tIns="22860" rIns="91440" bIns="22860"/>
        <a:p>
          <a:r>
            <a:rPr sz="1400" b="1" lang="pt-BR">
              <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
            </a:rPr>
            <a:t>${h}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>
  `
    )
    .join("\n");

  const catRowXml = categoryData
    .slice(0, 10)
    .map(
      (row, i) => `
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${200 + i * 3}" name="C${i}0"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="914400" y="${1828800 + i * 457200}"/>
          <a:ext cx="2438400" cy="457200"/>
        </a:xfrm>
        <a:prstGeom prst="rect"/>
        <a:solidFill><a:srgbClr val="${i % 2 === 0 ? "F8FAFC" : "FFFFFF"}"/></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr lIns="91440" tIns="22860" rIns="91440" bIns="22860"/>
        <a:p>
          <a:r>
            <a:rPr sz="1200" lang="pt-BR"/>
            <a:t>${escapeXml(row.name)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${200 + i * 3 + 1}" name="C${i}1"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="${3352800}" y="${1828800 + i * 457200}"/>
          <a:ext cx="2438400" cy="457200"/>
        </a:xfrm>
        <a:prstGeom prst="rect"/>
        <a:solidFill><a:srgbClr val="${i % 2 === 0 ? "F8FAFC" : "FFFFFF"}"/></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr lIns="91440" tIns="22860" rIns="91440" bIns="22860"/>
        <a:p>
          <a:r>
            <a:rPr sz="1200" lang="pt-BR"/>
            <a:t>${formatCurrencyXml(row.value)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>
    <p:sp>
      <p:nvSpPr>
        <p:cNvPr id="${200 + i * 3 + 2}" name="C${i}2"/>
        <p:cNvSpPr txBox="1"/>
        <p:nvPr/>
      </p:nvSpPr>
      <p:spPr>
        <a:xfrm>
          <a:off x="${5791200}" y="${1828800 + i * 457200}"/>
          <a:ext cx="2438400" cy="457200"/>
        </a:xfrm>
        <a:prstGeom prst="rect"/>
        <a:solidFill><a:srgbClr val="${i % 2 === 0 ? "F8FAFC" : "FFFFFF"}"/></a:solidFill>
      </p:spPr>
      <p:txBody>
        <a:bodyPr lIns="91440" tIns="22860" rIns="91440" bIns="22860"/>
        <a:p>
          <a:r>
            <a:rPr sz="1200" lang="pt-BR"/>
            <a:t>${escapeXml(`${row.percentage.toFixed(1)}%`)}</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    </p:sp>
  `
    )
    .join("\n");

  const catSlide = `
    <p:sld>
      <p:cSld>
        <p:spTree>
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="1" name="CatTitle"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm>
                <a:off x="914400" y="274400"/>
                <a:ext cx="7315200" cy="685800"/>
              </a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr/>
              <a:p>
                <a:r>
                  <a:rPr sz="3200" b="1" lang="pt-BR"/>
                  <a:t>Despesas por Categoria</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
          ${headerXml}
          ${catRowXml}
        </p:spTree>
      </p:cSld>
    </p:sld>
  `;

  const slides = [titleSlide, kpisSlide, catSlide].join("");

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldIdLst>
    <p:sldId id="256" r:id="rId1"/>
    <p:sldId id="257" r:id="rId2"/>
    <p:sldId id="258" r:id="rId3"/>
  </p:sldIdLst>
  <p:sldSz cx="${slideWidth}" cy="${slideHeight}" type="screen4x3"/>
  <p:notesSz cx="${slideWidth}" cy="${slideHeight / 4}"/>
</p:presentation>`;

  return xml + "\n<!-- SLIDES -->\n" + slides;
}

export default function PowerPointExport({
  projectName,
  kpis,
  categoryData,
  chartRefs,
}: PowerPointExportProps) {
  const exportPptx = useCallback(() => {
    try {
      const slidesXml = generatePptxXml(projectName, kpis, categoryData);
      const blob = new Blob([slidesXml], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectName.replace(/\s+/g, "_")}_dashboard.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Apresentação exportada com sucesso");
    } catch (e: any) {
      toast.error("Erro ao exportar apresentação");
    }
  }, [projectName, kpis, categoryData]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          <Presentation className="w-4 h-4 mr-2" />
          PowerPoint
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPptx}>
          <Presentation className="w-4 h-4 mr-2 text-orange-500" />
          Exportar .pptx
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
