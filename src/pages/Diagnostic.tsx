import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

export default function DiagnosticPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const runDiagnostics = async () => {
    setTesting(true);
    const results: any = {};

    // 1. Check DeepSeek API Key
    const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    results.deepseekKey = {
      exists: Boolean(deepseekKey),
      value: deepseekKey ? `${deepseekKey.slice(0, 10)}...` : "❌ NÃO CONFIGURADA",
    };

    // 2. Test DeepSeek API
    if (deepseekKey) {
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deepseekKey}`,
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'user', content: 'Teste: responda apenas "OK"' },
            ],
            max_tokens: 10,
          }),
        });

        results.deepseekAPI = {
          status: response.status,
          ok: response.ok,
          message: response.ok ? "✅ API funcionando" : `❌ Erro ${response.status}`,
        };

        if (response.ok) {
          const data = await response.json();
          results.deepseekResponse = data.choices?.[0]?.message?.content || "Sem resposta";
        }
      } catch (error: any) {
        results.deepseekAPI = {
          ok: false,
          message: `❌ ${error.message}`,
        };
      }
    }

    // 3. Test ReceitaWS
    try {
      const response = await fetch('https://www.receitaws.com.br/v1/cnpj/00000000000191');
      results.receitaws = {
        status: response.status,
        ok: response.ok,
        message: response.ok ? "✅ API acessível" : `❌ Erro ${response.status}`,
      };

      if (response.ok) {
        const data = await response.json();
        results.receitawsData = data.status === 'OK' ? "✅ Retornou dados" : `⚠️ ${data.message}`;
      }
    } catch (error: any) {
      results.receitaws = {
        ok: false,
        message: `❌ CORS ou network: ${error.message}`,
      };
    }

    // 4. Test Brapi
    try {
      const response = await fetch('https://brapi.dev/api/quote/PETR4?fundamental=true');
      results.brapi = {
        status: response.status,
        ok: response.ok,
        message: response.ok ? "✅ API funcionando" : `❌ Erro ${response.status}`,
      };
    } catch (error: any) {
      results.brapi = {
        ok: false,
        message: `❌ ${error.message}`,
      };
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🔍 Diagnóstico do Sistema</h1>
        <p className="text-muted-foreground mt-2">
          Verifica se todas as APIs externas estão configuradas e funcionando
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executar Testes</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runDiagnostics} disabled={testing}>
            {testing ? "Testando..." : "🚀 Executar Diagnóstico"}
          </Button>
        </CardContent>
      </Card>

      {testResults && (
        <div className="space-y-4">
          {/* DeepSeek API Key */}
          <Card className={testResults.deepseekKey.exists ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {testResults.deepseekKey.exists ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <CardTitle>DeepSeek API Key</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <code className="text-sm">{testResults.deepseekKey.value}</code>
            </CardContent>
          </Card>

          {/* DeepSeek API */}
          {testResults.deepseekAPI && (
            <Card className={testResults.deepseekAPI.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  {testResults.deepseekAPI.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <CardTitle>DeepSeek API Connection</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p><strong>Status:</strong> {testResults.deepseekAPI.status}</p>
                <p><strong>Mensagem:</strong> {testResults.deepseekAPI.message}</p>
                {testResults.deepseekResponse && (
                  <p><strong>Resposta:</strong> {testResults.deepseekResponse}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* ReceitaWS */}
          <Card className={testResults.receitaws?.ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {testResults.receitaws?.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                )}
                <CardTitle>ReceitaWS API</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p><strong>Mensagem:</strong> {testResults.receitaws?.message}</p>
              {testResults.receitawsData && (
                <p><strong>Dados:</strong> {testResults.receitawsData}</p>
              )}
              {!testResults.receitaws?.ok && (
                <p className="text-sm text-amber-700">
                  ⚠️ CORS pode bloquear ReceitaWS no navegador. Use proxy ou backend.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Brapi */}
          <Card className={testResults.brapi?.ok ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            <CardHeader>
              <div className="flex items-center gap-2">
                {testResults.brapi?.ok ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <CardTitle>Brapi.dev API (B3)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p><strong>Mensagem:</strong> {testResults.brapi?.message}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-5">
          <p className="text-sm text-blue-900 font-semibold mb-2">💡 Como adicionar API Key no Vercel:</p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Acesse <a href="https://vercel.com/trustcorporation88/analise-planilha/settings/environment-variables" target="_blank" className="underline">Vercel → Settings → Environment Variables</a></li>
            <li>Clique em <strong>"Add New"</strong></li>
            <li>Nome: <code className="bg-white px-1 rounded">VITE_DEEPSEEK_API_KEY</code></li>
            <li>Value: <code className="bg-white px-1 rounded">sk-a66b4f6e9ca8472aa288745860242f3b</code></li>
            <li>Environment: <strong>Production, Preview, Development</strong> (todas)</li>
            <li>Clique <strong>"Save"</strong></li>
            <li>Redeploy o projeto</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
