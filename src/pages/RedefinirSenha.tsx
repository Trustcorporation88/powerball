import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';

import { redefinirSenha } from '@/services/auth';
import { applyPageSeo } from '@/lib/seo';
import { PowerballLogo } from '@/components/lottery/PowerballLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/** Destino do link enviado por e-mail em "Esqueci minha senha". */
export default function RedefinirSenha() {
  const [parametros] = useSearchParams();
  const navigate = useNavigate();
  const token = parametros.get('token') ?? '';

  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    applyPageSeo({
      title: 'Criar nova senha | Powerball',
      description: 'Defina uma nova senha para a sua conta do Powerball.',
      path: '/redefinir-senha',
    });
  }, []);

  const enviar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const senha = String(dados.get('password') ?? '');
    const confirmacao = String(dados.get('confirmacao') ?? '');

    if (senha !== confirmacao) {
      toast.error('As senhas não conferem');
      return;
    }

    setEnviando(true);
    const resultado = await redefinirSenha(token, senha);
    setEnviando(false);

    if (!resultado.success) {
      toast.error(resultado.message ?? 'Não foi possível trocar a senha');
      return;
    }

    setConcluido(true);
    toast.success(resultado.message ?? 'Senha alterada');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-powerball-navy via-powerball-navy-dark to-powerball-navy p-4">
      <div className="w-full max-w-md space-y-4">
        <PowerballLogo altura={100} className="mx-auto" />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-powerball-navy" />
              Criar nova senha
            </CardTitle>
            <CardDescription>
              {token
                ? 'O link vale por 1 hora e só pode ser usado uma vez.'
                : 'Link incompleto. Abra o link exatamente como chegou no e-mail ou peça um novo.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {concluido ? (
              <Button className="w-full" onClick={() => navigate('/')}>
                Entrar com a nova senha
              </Button>
            ) : token ? (
              <form onSubmit={enviar} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nova-senha">Nova senha</Label>
                  <Input
                    id="nova-senha"
                    name="password"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nova-senha-confirmacao">Repita a nova senha</Label>
                  <Input
                    id="nova-senha-confirmacao"
                    name="confirmacao"
                    type="password"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={enviando}>
                  {enviando ? 'Salvando...' : 'Salvar nova senha'}
                </Button>
              </form>
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link to="/">Voltar para o login</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
