import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Building2, Briefcase, Store, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const segments = [
  { id: "servicos", label: "Serviços", icon: Briefcase },
  { id: "comercio", label: "Comércio", icon: Store },
  { id: "industria", label: "Indústria", icon: Factory },
  { id: "consultoria", label: "Consultoria", icon: Building2 },
];

export default function NewProject() {
  const navigate = useNavigate();
  const { addProject, setCurrentProject } = useApp();
  const [name, setName] = useState("");
  const [segment, setSegment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment) {
      toast.error("Selecione um segmento");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const newProject = {
        id: Date.now().toString(),
        name,
        segment: segments.find(s => s.id === segment)?.label || segment,
        status: "active" as const,
        createdAt: new Date().toISOString().split("T")[0],
      };
      addProject(newProject);
      setCurrentProject(newProject);
      toast.success("Projeto criado com sucesso!");
      navigate("/import");
      setLoading(false);
    }, 600);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate("/projects")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Novo Projeto</h1>
        <p className="text-slate-500 mb-8">Configure os dados básicos do seu projeto de análise</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Nome do projeto</Label>
            <Input
              id="name"
              placeholder="Ex: Análise Financeira 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Segmento</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {segments.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSegment(s.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    segment === s.id
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <s.icon className="w-5 h-5" />
                  <span className="font-medium">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 h-11" disabled={loading}>
              {loading ? "Criando..." : "Criar Projeto e Importar Dados"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}