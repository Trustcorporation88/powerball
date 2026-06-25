import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Plus, FolderOpen, MoreVertical, Trash2, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { parseExcelFile } from "@/utils/excelParser";

export default function Projects() {
  const navigate = useNavigate();
  const { projects, setCurrentProject, removeProject, addProject, setCurrentFile } = useApp();

  const handleView = async (project: { id: string; name: string; segment: string; status: "active" | "processing" | "error"; createdAt: string; lastProcessed?: string }) => {
    await setCurrentProject(project);
    navigate("/dashboard");
  };

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("Deseja realmente excluir este projeto?")) {
      return;
    }

    await removeProject(projectId);
    toast.success("Projeto removido com sucesso");
  };

  const handleLoadDemo = async () => {
    try {
      const loadingToast = toast.loading('Carregando projeto demo...');
      
      // Buscar planilha demo
      const response = await fetch('/dados_referencia.xlsx');
      const blob = await response.blob();
      const file = new File([blob], 'dados_referencia.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      // Parse do arquivo
      const parsedData = await parseExcelFile(file);
      const firstSheet = parsedData.sheets[0];

      if (!firstSheet) {
        toast.dismiss(loadingToast);
        toast.error('Planilha demo não contém abas válidas');
        return;
      }

      // Criar projeto demo
      const demoProject = {
        id: `demo2-${Date.now()}`,
        name: 'Projeto Demo2 - Dados Referência',
        segment: 'Demonstração',
        status: 'active' as const,
        createdAt: new Date().toISOString(),
        lastProcessed: new Date().toISOString(),
      };

      await addProject(demoProject);
      await setCurrentProject(demoProject);
      await setCurrentFile({
        name: parsedData.fileName,
        sheets: parsedData.sheets,
        selectedSheet: firstSheet.name,
        selectedSheets: [firstSheet.name],
        importMode: 'single',
        headers: firstSheet.headers,
        preview: firstSheet.data.slice(0, 20),
        allData: firstSheet.data,
      });

      toast.dismiss(loadingToast);
      toast.success('Projeto demo criado com sucesso!');
      navigate('/mapping');
    } catch (error) {
      toast.error('Erro ao carregar projeto demo');
      console.error(error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projetos</h1>
          <p className="text-slate-500 mt-1">Gerencie suas análises financeiras</p>
        </div>
        <Button onClick={() => navigate("/projects/new")} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => (
          <Card key={project.id} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-emerald-100 rounded-lg">
                  <FolderOpen className="w-6 h-6 text-emerald-600" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 hover:bg-slate-100 rounded-md">
                      <MoreVertical className="w-4 h-4 text-slate-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleView(project)}>
                      <Eye className="w-4 h-4 mr-2" /> Ver dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(project.id)} className="text-rose-600">
                      <Trash2 className="w-4 h-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">{project.name}</h3>
              <p className="text-sm text-slate-500 mb-3">{project.segment}</p>
              <div className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  project.status === "active"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}>
                  {project.status === "active" ? "Ativo" : "Processando"}
                </span>
                <span className="text-xs text-slate-400">
                  {project.lastProcessed ? `Processado em ${project.lastProcessed}` : "Não processado"}
                </span>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => handleView(project)}
              >
                Abrir Dashboard
              </Button>
            </CardContent>
          </Card>
        ))}

        <button
          onClick={handleLoadDemo}
          className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-100 transition-colors min-h-[220px]"
        >
          <Sparkles className="w-8 h-8" />
          <span className="font-medium">Carregar Projeto Demo</span>
          <span className="text-xs text-emerald-500">Teste todos os serviços</span>
        </button>

        <button
          onClick={() => navigate("/projects/new")}
          className="border-2 border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors min-h-[220px]"
        >
          <Plus className="w-8 h-8" />
          <span className="font-medium">Criar Novo Projeto</span>
        </button>
      </div>
    </div>
  );
}
