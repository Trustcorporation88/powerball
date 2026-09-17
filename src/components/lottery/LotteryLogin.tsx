import React, { useState } from 'react';
import { Clover, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { AVISO_CURTO } from '@/constants/termosDeUso';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Porta de entrada do site de palpites.
 *
 * O acesso é por conta porque o aceite do termo de uso precisa ficar vinculado
 * a alguém — um aviso que o visitante só fecha não prova nada depois.
 */
export const LotteryLogin: React.FC = () => {
  const { login, register } = useAuth();

  const [aba, setAba] = useState<'entrar' | 'criar'>('entrar');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nome, setNome] = useState('');
  const [confirmacao, setConfirmacao] = useState('');

  const entrar = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setEnviando(true);
    const resultado = await login(email, senha);
    setEnviando(false);

    if (!resultado.success) {
      toast.error(resultado.message ?? 'Não foi possível entrar');
    }
  };

  const criarConta = async (evento: React.FormEvent) => {
    evento.preventDefault();

    if (senha !== confirmacao) {
      toast.error('As senhas não conferem');
      return;
    }

    setEnviando(true);
    const resultado = await register(nome, email, senha);
    setEnviando(false);

    if (!resultado.success) {
      toast.error(resultado.message ?? 'Não foi possível criar a conta');
    }
  };

  const campoSenha = (
    <div className="relative">
      <Input
        id="senha"
        type={mostrarSenha ? 'text' : 'password'}
        placeholder="Mínimo de 6 caracteres"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        required
        minLength={6}
        autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
      />
      <button
        type="button"
        onClick={() => setMostrarSenha((atual) => !atual)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-purple-50 to-slate-100 dark:from-slate-950 dark:via-purple-950/30 dark:to-slate-950 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 shadow-lg">
            <Clover className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Loterias Caixa • Powerball</h1>
          <p className="text-sm font-semibold text-muted-foreground">Palpites Inteligentes</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-purple-600" />
              Acesso restrito
            </CardTitle>
            <CardDescription>
              Entre com sua conta para usar o gerador, os fechamentos e a carteira.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={aba} onValueChange={(valor) => setAba(valor as 'entrar' | 'criar')}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="entrar">
                <form onSubmit={entrar} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    {campoSenha}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"
                    disabled={enviando}
                  >
                    {enviando ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="criar">
                <form onSubmit={criarConta} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      placeholder="Como quer ser chamado"
                      value={nome}
                      onChange={(evento) => setNome(evento.target.value)}
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email-criar">E-mail</Label>
                    <Input
                      id="email-criar"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="senha">Senha</Label>
                    {campoSenha}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmacao">Repita a senha</Label>
                    <Input
                      id="confirmacao"
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Repita a senha"
                      value={confirmacao}
                      onChange={(evento) => setConfirmacao(evento.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"
                    disabled={enviando}
                  >
                    {enviando ? 'Criando conta...' : 'Criar conta'}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Ao criar a conta você ainda precisará ler e aceitar o termo de uso antes de
                    acessar as ferramentas.
                  </p>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 p-3">
          <p className="text-[11px] leading-relaxed text-muted-foreground flex gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
            <span>{AVISO_CURTO}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
