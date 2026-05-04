import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { ArrowLeft, Building2, Briefcase, Store, Factory, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CNPJValidator } from "@/components/CNPJValidator";
import type { CNPJData } from "@/services/receitaws";

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
  const [showCNPJValidator, setShowCNPJValidator] = useState(false);
  const [cnpjData, setCnpjData] = useState<CNPJData | null>(null);

  const handleCNPJValidated = (data: CNPJData) => {
    setName(data.nome_fantasia || data.razao_social);
    const atividade = data.atividade_principal?.[0]?.text || '';
    setCnpjData(data);
    setShowCNPJValidator(false);
    toast.success(`CNPJ ${data.cnpj} validado com sucesso!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segment) {
      toast.error("Selecione um segmento");
      return;
    }

    setLoading(true);
    const newProject = {
      id: Date.now().toString(),
      name,
      segment: segments.find(s => s.id === segment)?.label || segment,
      status: "active" as const,
      createdAt: new Date().toISOString().split("T")[0],
    };

    await addProject(newProject);
    await setCurrentProject(newProject);
    toast.success("Projeto criado com sucesso!");
    navigate("/import");
    setLoading(false);
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
            <div className="flex items-center justify-between mb-1.5">
              <Label htmlFor="name">Nome do projeto</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCNPJValidator(true)}
                className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <ShieldCheck className="w-3 h-3 mr-1" />
                Validar CNPJ
              </Button>
            </div>
            <Input
              id="name"
              placeholder="Ex: Análise Financeira 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-0"
            />
            {cnpjData && (
              <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-700">
                <p className="font-semibold">✓ CNPJ Validado: {cnpjData.cnpj}</p>
                <p>{cnpjData.razao_social}</p>
              </div>
            )}
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

      <CNPJValidator
        open={showCNPJValidator}
        onClose={() => setShowCNPJValidator(false)}
        onValidated={handleCNPJValidated}
      />
    </div>
  );
}
