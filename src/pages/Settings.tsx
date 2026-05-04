import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Bell, Shield } from "lucide-react";
import { toast } from "sonner";
import { getUserPreferences, saveUserPreferences, type UserPreferences } from "@/services/settings";

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [preferences, setPreferences] = useState<UserPreferences>({
    processingAlerts: true,
    weeklyReports: false,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setName(user.name);
    setEmail(user.email);
    setPreferences(getUserPreferences(user.email));
  }, [user]);

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
