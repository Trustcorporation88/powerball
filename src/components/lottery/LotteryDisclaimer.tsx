import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface LotteryDisclaimerProps {
  variant?: 'compact' | 'full';
}

/**
 * Componente de disclaimer legal e educacional sobre loterias.
 * Exibe avisos importantes sobre a natureza aleatória dos jogos.
 */
export const LotteryDisclaimer: React.FC<LotteryDisclaimerProps> = ({
  variant = 'compact',
}) => {
  if (variant === 'compact') {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-200 text-sm">
          Jogue com responsabilidade
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-xs">
          Loterias são jogos de azar. Cada sorteio é um evento independente e
          aleatório. Padrões históricos não garantem resultados futuros.
          Aposte apenas o que pode perder. +18
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Aviso Legal Importante
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm mt-2">
          Este sistema gera sugestões de números com base em análises
          estatísticas de sorteios passados. Isso <strong>NÃO</strong> aumenta
          suas chances de ganhar. Cada combinação válida tem exatamente a mesma
          probabilidade de ser sorteada.
        </AlertDescription>
      </Alert>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="methodology" className="border-slate-200 dark:border-slate-700">
          <AccordionTrigger className="text-sm hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <span>Sobre a metodologia</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
            <p>
              <strong>Fontes de dados:</strong> Os dados históricos são obtidos
              da API pública da Caixa Econômica Federal e de arquivos públicos
              de resultados.
            </p>
            <p>
              <strong>Estratégias de geração:</strong> As estratégias oferecidas
              (frequentes, atrasadas, afinidade, etc.) são baseadas em padrões
              observados em sorteios passados. Matematicamente, cada sorteio é
              independente - o resultado de sorteios anteriores não influencia
              sorteios futuros.
            </p>
            <p>
              <strong>Faixas "ideais":</strong> Valores como "soma ideal" ou
              "quantidade ideal de pares" representam onde a maioria dos
              sorteios históricos se concentrou. Isso é uma curiosidade
              estatística, não uma vantagem competitiva.
            </p>
            <p>
              <strong>Score dos jogos:</strong> O score atribuído a cada jogo
              mede o quanto ele se aproxima dos padrões históricos observados.
              Um score alto NÃO significa maior chance de ganhar.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="probability" className="border-slate-200 dark:border-slate-700">
          <AccordionTrigger className="text-sm hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <span>Probabilidades reais</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
            <p>
              <strong>Mega-Sena (6 números):</strong> 1 chance em 50.063.860
              de acertar a sena.
            </p>
            <p>
              <strong>Lotofácil (15 números):</strong> 1 chance em 3.268.760
              de acertar os 15 pontos.
            </p>
            <p>
              Essas probabilidades são as mesmas para QUALQUER combinação
              válida, seja ela gerada por este sistema, escolhida pelo
              apostador, ou sorteada aleatoriamente.
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="responsible" className="border-slate-200 dark:border-slate-700">
          <AccordionTrigger className="text-sm hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-slate-500" />
              <span>Jogo responsável</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-slate-600 dark:text-slate-400 space-y-3">
            <ul className="list-disc list-inside space-y-2">
              <li>Aposte apenas valores que você pode perder sem impacto financeiro</li>
              <li>Estabeleça um limite mensal para apostas e respeite-o</li>
              <li>Loterias são entretenimento, não investimento</li>
              <li>Se o jogo deixar de ser diversão, procure ajuda</li>
              <li>Proibido para menores de 18 anos</li>
            </ul>
            <p className="mt-3">
              <strong>Ajuda:</strong> CAPS (Centro de Atenção Psicossocial) -
              Ligue 188 (CVV) para apoio emocional.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
