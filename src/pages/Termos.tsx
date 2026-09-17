import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';

import {
  NOME_PLATAFORMA,
  TERMOS_SECOES,
  TERMOS_VERSAO,
  TERMOS_VIGENCIA,
} from '@/constants/termosDeUso';
import { applyPageSeo } from '@/lib/seo';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/**
 * Versão pública do termo, para quem quiser consultar o texto sem estar logado
 * e para os links de rodapé.
 */
export default function Termos() {
  useEffect(() => {
    applyPageSeo({
      title: `Termo de Uso e Isenção de Responsabilidade — ${NOME_PLATAFORMA}`,
      description:
        'Termo de uso do site de palpites: ferramenta de análise estatística sem vínculo com a Caixa Econômica Federal, que não garante prêmio, não recebe apostas e não intermedeia valores.',
      path: '/termos',
    });
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-powerball-navy" />
              Termo de Uso e Isenção de Responsabilidade
            </CardTitle>
            <CardDescription>
              {NOME_PLATAFORMA} — versão {TERMOS_VERSAO}, vigente desde {TERMOS_VIGENCIA}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {TERMOS_SECOES.map((secao) => (
              <section key={secao.titulo}>
                <h2 className="text-sm font-bold mb-2">{secao.titulo}</h2>
                {secao.paragrafos.map((paragrafo, indice) => (
                  <p key={indice} className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {paragrafo}
                  </p>
                ))}
              </section>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
