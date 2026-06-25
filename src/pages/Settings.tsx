import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getUserPreferences, saveUserPreferences, type UserPreferences } from "@/services/settings";
import {
  clearDeepSeekApiKey,
  getDeepSeekApiKey,
  hasUserDefinedKey,
  isAIEnabled,
  setDeepSeekApiKey,
} from "@/services/aiConfig";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [preferences, setPreferences] = useState<UserPreferences>({
    processingAlerts: true,
    weeklyReports: false,
  });
  const [saving, setSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [aiActive, setAiActive] = useState(isAIEnabled());
  const [usingUserKey, setUsingUserKey] = useState(hasUserDefinedKey());

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(user.name);
    setEmail(user.email);
    setPreferences(getUserPreferences(user.email));
  }, [user]);

  useEffect(() => {
    if (hasUserDefinedKey()) {
      setApiKey(getDeepSeekApiKey());
    }
  }, []);

  const handleSaveApiKey = () => {
    setDeepSeekApiKey(apiKey);
    setAiActive(isAIEnabled());
    setUsingUserKey(hasUserDefinedKey());
    toast.success(
      apiKey.trim()
        ? "Chave da IA salva. Auditoria, Assistente Excel e consultas em linguagem natural ativados."
        : "Chave removida. A IA voltará ao modo local (heurístico).",
    );
  };

  const handleClearApiKey = () => {
    clearDeepSeekApiKey();
    setApiKey("");
    setAiActive(isAIEnabled());
    setUsingUserKey(hasUserDefinedKey());
    toast.info("Chave da IA removida.");
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaving(true);
    const result = await updateProfile({ name, email });

    if (!result.success || !result.user) {
      toast.error(result.message ?? "Não foi possível salvar o perfil");
      setSaving(false);
      return;
    }

    saveUserPreferences(result.user.email, preferences);
    toast.success("Configurações salvas com sucesso");
    setSaving(false);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 mt-1">Gerencie suas preferências e dados da conta</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-emerald-600" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5" />
            </div>
          </div>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving || !user}>
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-600" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Alertas de processamento</p>
              <p className="text-sm text-slate-500">Receba notificações quando um arquivo for processado</p>
            </div>
            <Switch
              checked={preferences.processingAlerts}
              onCheckedChange={(checked) => setPreferences((previous) => ({ ...previous, processingAlerts: checked }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">Relatórios semanais</p>
              <p className="text-sm text-slate-500">Resumo semanal dos seus dashboards</p>
            </div>
            <Switch
              checked={preferences.weeklyReports}
              onCheckedChange={(checked) => setPreferences((previous) => ({ ...previous, weeklyReports: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Integração de IA (DeepSeek)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {aiActive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                IA ativa{usingUserKey ? " (chave do usuário)" : " (variável de ambiente)"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" />
                Modo local (sem IA externa)
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">
            Cole sua chave da API DeepSeek para ativar auditoria inteligente do DRE, o Assistente
            Excel e as consultas em linguagem natural. A chave fica salva apenas neste navegador.
          </p>
          <div>
            <Label htmlFor="ai-key">Chave da API DeepSeek</Label>
            <Input
              id="ai-key"
              type="password"
              autoComplete="off"
              placeholder="sk-..."
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              className="mt-1.5"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveApiKey}>
              Salvar Chave
            </Button>
            {usingUserKey && (
              <Button variant="outline" onClick={handleClearApiKey}>
                Remover Chave
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => toast.info("Em desenvolvimento")}>
            Alterar Senha
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
