import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Plus, FolderOpen, FileCheck, AlertCircle, Clock, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  const navigate = useNavigate();
  const { projects } = useApp();

  const stats = [
    { label: "Total de Projetos", value: projects.length.toString(), icon: FolderOpen, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Processados", value: projects.filter(p => p.status === "active").length.toString(), icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Taxa de Sucesso", value: "96%", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "Último Processamento", value: "Hoje", icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
          <p className="text-slate-500 mt-1">Acompanhe seus projetos e análises</p>
        </div>
        <Button onClick={() => navigate("/projects/new")} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-slate-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Projetos Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2" />
                  <p>Nenhum projeto ainda. Crie seu primeiro projeto!</p>
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate("/projects")}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FolderOpen className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{project.name}</p>
                        <p className="text-sm text-slate-500">{project.segment} • Criado em {project.createdAt}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        project.status === "active"
                          ? "bg-emerald-100 text-emerald-700"
                          : project.status === "processing"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {project.status === "active" ? "Ativo" : project.status === "processing" ? "Processando" : "Erro"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">Mapeamento pendente</p>
                  <p className="text-xs text-amber-600 mt-0.5">O projeto "Fluxo de Caixa Cliente A" aguarda confirmação de colunas.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <FileCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">Processamento concluído</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Dashboard de "Análise Q1 2024" está pronto.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}