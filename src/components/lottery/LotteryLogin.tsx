import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Lock, ShieldCheck, LifeBuoy } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { solicitarRecuperacaoSenha } from '@/services/auth';
import { AVISO_CURTO } from '@/constants/termosDeUso';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PowerballLogo } from '@/components/lottery/PowerballLogo';

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

  const [recuperando, setRecuperando] = useState(false);
  const [enviandoLink, setEnviandoLink] = useState(false);
  const [avisoRecuperacao, setAvisoRecuperacao] = useState('');

  const pedirLink = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    setEnviandoLink(true);
    const resultado = await solicitarRecuperacaoSenha(String(dados.get('email') ?? ''));
    setEnviandoLink(false);
    setAvisoRecuperacao(resultado.message ?? '');
    if (!resultado.success) toast.error(resultado.message ?? 'Não foi possível enviar o link');
  };

  const entrar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const emailEntrada = String(dados.get('email') ?? email).trim().toLowerCase();
    const senhaEntrada = String(dados.get('password') ?? senha);
    setEnviando(true);
    const resultado = await login(emailEntrada, senhaEntrada);
    setEnviando(false);

    if (!resultado.success) {
      toast.error(resultado.message ?? 'Não foi possível entrar');
    }
  };

  const criarConta = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const emailEntrada = String(dados.get('email') ?? email).trim().toLowerCase();
    const senhaEntrada = String(dados.get('password') ?? senha);
    const nomeEntrada = String(dados.get('name') ?? nome).trim();
    const confirmacaoEntrada = String(dados.get('confirmacao') ?? confirmacao);

    if (senhaEntrada !== confirmacaoEntrada) {
      toast.error('As senhas não conferem');
      return;
    }

    setEnviando(true);
    const resultado = await register(nomeEntrada, emailEntrada, senhaEntrada);
    setEnviando(false);

    if (!resultado.success) {
      toast.error(resultado.message ?? 'Não foi possível criar a conta');
    }
  };

  const campoSenha = (id: string, autoComplete: string) => (
    <div className="relative">
      <Input
        id={id}
        name="password"
        type={mostrarSenha ? 'text' : 'password'}
        placeholder="Mínimo de 6 caracteres"
        value={senha}
        onChange={(evento) => setSenha(evento.target.value)}
        required
        minLength={6}
        autoComplete={autoComplete}
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-powerball-navy via-powerball-navy-dark to-powerball-navy p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center space-y-2">
          <PowerballLogo altura={132} className="mx-auto" />
          <h1 className="text-xl font-extrabold tracking-tight uppercase text-white">
            Loterias Caixa • Powerball
          </h1>
          <p className="text-sm font-semibold text-powerball-gold">Palpites Inteligentes</p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-powerball-navy" />
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
                      name="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="senha-entrar">Senha</Label>
                      <button
                        type="button"
                        onClick={() => setRecuperando(true)}
                        className="text-xs font-semibold text-powerball-navy hover:underline"
                      >
                        Esqueci minha senha
                      </button>
                    </div>
                    {campoSenha('senha-entrar', 'current-password')}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-powerball-navy to-powerball-navy-light hover:opacity-90"
                    disabled={enviando}
                  >
                    {enviando ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>

                {recuperando && (
                  <form
                    onSubmit={pedirLink}
                    className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5" />
                      Receber link para criar nova senha
                    </p>
                    <Input
                      name="email"
                      type="email"
                      placeholder="E-mail da sua conta"
                      defaultValue={email}
                      required
                      autoComplete="email"
                      aria-label="E-mail da conta"
                    />
                    {avisoRecuperacao && (
                      <p className="text-xs text-muted-foreground">{avisoRecuperacao}</p>
                    )}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={enviandoLink}>
                        {enviandoLink ? 'Enviando...' : 'Enviar link'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setRecuperando(false);
                          setAvisoRecuperacao('');
                        }}
                      >
                        Fechar
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>

              <TabsContent value="criar">
                <form onSubmit={criarConta} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      name="name"
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
                      name="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(evento) => setEmail(evento.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="senha-criar">Senha</Label>
                    {campoSenha('senha-criar', 'new-password')}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmacao">Repita a senha</Label>
                    <Input
                      id="confirmacao"
                      type={mostrarSenha ? 'text' : 'password'}
                      name="confirmacao"
                      value={confirmacao}
                      onChange={(evento) => setConfirmacao(evento.target.value)}
                      required
                      minLength={6}
                      autoComplete="new-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-powerball-navy to-powerball-navy-light hover:opacity-90"
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

        <p className="text-center">
          <Link
            to="/como-usar"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-powerball-gold hover:text-white"
          >
            <LifeBuoy className="h-4 w-4" />
            Como usar o site
          </Link>
        </p>

        <div className="rounded-lg border border-white/15 bg-white/5 p-3">
          <p className="text-[11px] leading-relaxed text-slate-300 flex gap-2">
            <ShieldCheck className="h-4 w-4 shrink-0 text-powerball-gold mt-0.5" />
            <span>{AVISO_CURTO}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
