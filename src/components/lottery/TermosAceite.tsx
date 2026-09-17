import React, { useState } from 'react';
import { AlertTriangle, FileText, LogOut } from 'lucide-react';
import { toast } from 'sonner';

import {
  TERMOS_PONTOS_CRITICOS,
  TERMOS_SECOES,
  TERMOS_VERSAO,
  TERMOS_VIGENCIA,
} from '@/constants/termosDeUso';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TermosAceiteProps {
  nomeUsuario: string;
  emailUsuario: string;
  onAceitar: () => Promise<void>;
  onSair: () => void;
}

/**
 * Coleta do aceite.
 *
 * O texto completo fica visível na própria tela e os quatro pontos que mais
 * importam viram caixas separadas, marcadas uma a uma. Um único "li e concordo"
 * é fácil de contestar depois; marcar item a item deixa claro o que foi
 * apresentado ao usuário.
 */
export const TermosAceite: React.FC<TermosAceiteProps> = ({
  nomeUsuario,
  emailUsuario,
  onAceitar,
  onSair,
}) => {
  const [marcados, setMarcados] = useState<boolean[]>(() =>
    TERMOS_PONTOS_CRITICOS.map(() => false),
  );
  const [enviando, setEnviando] = useState(false);

  const todosMarcados = marcados.every(Boolean);

  const alternar = (indice: number) => {
    setMarcados((atual) => atual.map((valor, i) => (i === indice ? !valor : valor)));
  };

  const confirmar = async () => {
    if (!todosMarcados) return;

    setEnviando(true);
    try {
      await onAceitar();
    } catch {
      toast.error('Não foi possível registrar o aceite. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              Termo de Uso e Isenção de Responsabilidade
            </CardTitle>
            <CardDescription>
              Versão {TERMOS_VERSAO}, vigente desde {TERMOS_VIGENCIA}. Leia antes de continuar — o
              aceite fica registrado na conta {emailUsuario}.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg border border-amber-300 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Antes de qualquer coisa
              </p>
              <p className="text-sm text-amber-900/90 dark:text-amber-200/90 mt-2 leading-relaxed">
                Este site não prevê resultados e não aumenta a sua chance de ganhar. Loteria é jogo
                de azar, cada sorteio é independente e todas as combinações válidas têm exatamente a
                mesma probabilidade. O que a ferramenta faz é organizar, calcular e reduzir o custo
                de cobrir dezenas.
              </p>
            </div>

            <ScrollArea className="h-72 rounded-lg border border-slate-200 dark:border-slate-800 p-4">
              <div className="space-y-4 pr-3">
                {TERMOS_SECOES.map((secao) => (
                  <section key={secao.titulo}>
                    <h3 className="text-sm font-bold mb-1.5">{secao.titulo}</h3>
                    {secao.paragrafos.map((paragrafo, indice) => (
                      <p
                        key={indice}
                        className="text-xs text-muted-foreground leading-relaxed mb-1.5"
                      >
                        {paragrafo}
                      </p>
                    ))}
                  </section>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <p className="text-sm font-semibold">
                Marque cada item para confirmar que está ciente:
              </p>

              {TERMOS_PONTOS_CRITICOS.map((ponto, indice) => (
                <label
                  key={ponto}
                  className="flex gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  <Checkbox
                    checked={marcados[indice]}
                    onCheckedChange={() => alternar(indice)}
                    className="mt-0.5"
                  />
                  <span className="text-xs leading-relaxed">{ponto}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <Button
                onClick={confirmar}
                disabled={!todosMarcados || enviando}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"
              >
                {enviando ? 'Registrando...' : 'Li, estou ciente e concordo'}
              </Button>

              <Button variant="outline" onClick={onSair} disabled={enviando}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>

            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {nomeUsuario}, ao confirmar serão registrados a data e a hora do aceite, a versão
              deste texto, o endereço IP e a identificação do navegador, exclusivamente como prova
              de ciência destas condições.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
