import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LifeBuoy } from 'lucide-react';

import { ComoUsarPanel } from '@/components/lottery/ComoUsarPanel';
import { PowerballLogo } from '@/components/lottery/PowerballLogo';
import { applyPageSeo } from '@/lib/seo';

import { Button } from '@/components/ui/button';

/**
 * Guia público. O gerador fica atrás do login; o texto de como usar o site
 * não precisa — quem ainda não criou conta também tem que entender o que a
 * ferramenta faz e o que ela não faz.
 */
export default function ComoUsar() {
  const navigate = useNavigate();

  useEffect(() => {
    applyPageSeo({
      title: 'Como usar o site — Loterias Caixa • Powerball',
      description:
        'Guia do gerador de palpites: abas, estratégias, fechamentos matemáticos e o que a ferramenta não faz. Site independente, sem vínculo com a Caixa.',
      path: '/como-usar',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Entrar no site
            </Link>
          </Button>
          <PowerballLogo altura={56} />
        </div>

        <ComoUsarPanel lottery="lotofacil" onIrPara={() => navigate('/')} />

        <p className="text-center text-xs text-muted-foreground pb-6">
          <LifeBuoy className="h-3.5 w-3.5 inline mr-1 align-text-bottom" />
          Para gerar jogos, feche este guia, entre com sua conta e aceite o termo de uso.
        </p>
      </div>
    </div>
  );
}
