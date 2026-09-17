import React from 'react';
import {
  Sparkles,
  Layers,
  BarChart3,
  FlaskConical,
  Users,
  BookmarkCheck,
  ShieldCheck,
  Target,
  Wallet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

import { LotteryTab, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { compararChance, formatarChance } from '@/services/lotteryResponsible';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ComoUsarPanelProps {
  lottery: LotteryType;
  onIrPara: (tab: LotteryTab) => void;
}

const PASSOS = [
  {
    icone: Target,
    titulo: 'Escolha a modalidade',
    texto:
      'Os botões no topo da página trocam entre Lotofácil, Mega-Sena, Quina, Dupla Sena, Dia de Sorte e +Milionária. Tudo abaixo se adapta: preços, estatísticas, fechamentos e conferência.',
  },
  {
    icone: Sparkles,
    titulo: 'Monte os bilhetes',
    texto:
      'Use o Gerador para criar jogos avulsos com a estratégia que preferir, ou os Fechamentos quando quiser cobrir um grupo maior de dezenas com garantia matemática e custo controlado.',
  },
  {
    icone: Wallet,
    titulo: 'Guarde na Carteira',
    texto:
      'Salvar não custa nada e é o que faz a conferência automática funcionar depois. Marque como "apostado" só o que você realmente jogou na lotérica ou no app da Caixa.',
  },
  {
    icone: CheckCircle2,
    titulo: 'Confira o resultado',
    texto:
      'Assim que o concurso sai, a Carteira compara seus jogos com o sorteio oficial e mostra acertos e faixa premiada. Você não precisa conferir dezena por dezena.',
  },
];

const ABAS: Array<{
  id: LotteryTab;
  icone: typeof Sparkles;
  cor: string;
  nome: string;
  texto: string;
}> = [
  {
    id: 'gerador',
    icone: Sparkles,
    cor: 'text-purple-600',
    nome: 'Gerador',
    texto:
      'Cria bilhetes a partir de uma estratégia. Dá para fixar dezenas que você sempre joga, excluir as que não quer ver e escolher quantos jogos gerar. Cada bilhete sai com nota e custo oficial.',
  },
  {
    id: 'fechamentos',
    icone: Layers,
    cor: 'text-emerald-600',
    nome: 'Fechamentos',
    texto:
      'Você escolhe um grupo maior de dezenas e recebe poucos bilhetes que cobrem esse grupo com garantia verificada. É a parte do site com efeito prático mais concreto sobre o custo.',
  },
  {
    id: 'estatisticas',
    icone: BarChart3,
    cor: 'text-blue-600',
    nome: 'Estatísticas',
    texto:
      'Mapa de calor de frequência e atraso, média de pares e ímpares, soma média e os pares de dezenas que mais saem juntos. Serve para embasar a escolha manual do grupo no fechamento.',
  },
  {
    id: 'backtest',
    icone: FlaskConical,
    cor: 'text-indigo-600',
    nome: 'Prova Real',
    texto:
      'Roda cada estratégia contra concursos que já aconteceram, sem deixar o motor ver o resultado antes de apostar, e compara com um sorteio aleatório de verdade. Abra antes de confiar em qualquer estratégia.',
  },
  {
    id: 'bolao',
    icone: Users,
    cor: 'text-cyan-600',
    nome: 'Bolão',
    texto:
      'Organiza cotistas, rateio proporcional, taxa de administração e controle de quem já pagou. A conferência é coletiva e sai um resumo pronto para colar no WhatsApp.',
  },
  {
    id: 'carteira',
    icone: BookmarkCheck,
    cor: 'text-amber-600',
    nome: 'Carteira',
    texto:
      'Guarda os jogos salvos, confere contra o resultado oficial e exporta em texto ou CSV. É onde também fica o limite de gasto mensal.',
  },
];

const ESTRATEGIAS = [
  {
    nome: 'Motor Heurístico (IA)',
    texto: 'Gera vários candidatos e fica com os que tiram a melhor nota nos cinco critérios.',
  },
  {
    nome: 'Equilibrado',
    texto: 'Mistura dezenas frequentes, atrasadas e medianas em vez de apostar só em um extremo.',
  },
  { nome: 'Dezenas Quentes', texto: 'Prioriza o que mais saiu na janela histórica analisada.' },
  { nome: 'Dezenas Atrasadas', texto: 'Prioriza o que está há mais concursos sem sair.' },
  {
    nome: 'Afinidade Histórica',
    texto: 'Parte de duplas de dezenas que costumam aparecer juntas e completa o bilhete a partir delas.',
  },
  {
    nome: 'Moldura e Miolo',
    texto: 'Distribui as dezenas entre borda e centro do volante na proporção que o volante sugere.',
  },
  {
    nome: 'Paridade e Soma',
    texto: 'Mira a faixa de pares e a soma total onde a maioria dos sorteios históricos caiu.',
  },
  {
    nome: 'Anti-Popular',
    texto:
      'Evita padrões que muita gente joga: sequências, datas de aniversário e colunas inteiras do volante.',
  },
  {
    nome: 'Surpresinha Filtrada',
    texto: 'Sorteio aleatório de verdade, respeitando apenas as dezenas que você fixou ou excluiu.',
  },
];

const CRITERIOS_SCORE = [
  { nome: 'Paridade', pontos: 25, texto: 'proporção de pares e ímpares dentro da faixa histórica' },
  { nome: 'Soma', pontos: 25, texto: 'soma das dezenas dentro da faixa típica da modalidade' },
  { nome: 'Espalhamento', pontos: 20, texto: 'quantas linhas do volante o bilhete cobre' },
  { nome: 'Sequências', pontos: 15, texto: 'penaliza blocos longos de números seguidos' },
  { nome: 'Moldura ou primos', pontos: 15, texto: 'distribuição na borda do volante ou densidade de primos' },
];

/**
 * Guia de uso do site.
 *
 * Existe porque o app acumulou funcionalidade suficiente para não ser óbvio à
 * primeira vista, e porque metade do valor aqui é entender o que as ferramentas
 * NÃO fazem. Cada estratégia e cada garantia é descrita pelo que realmente
 * entrega, sem promessa de previsão.
 */
export const ComoUsarPanel: React.FC<ComoUsarPanelProps> = ({ lottery, onIrPara }) => {
  const config = LOTTERY_CONFIGS[lottery];

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5 text-white">
          <h2 className="text-xl font-bold">Como usar o site</h2>
          <p className="text-sm text-purple-100 mt-1">
            Quatro passos para sair daqui com seus jogos montados, salvos e conferindo sozinhos.
          </p>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {PASSOS.map((passo, idx) => {
              const Icone = passo.icone;
              return (
                <div
                  key={passo.titulo}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/60 dark:bg-slate-900/40"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <Icone className="h-4 w-4 text-purple-600" />
                    <span className="font-semibold text-sm">{passo.titulo}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{passo.texto}</p>
                </div>
              );
            })}
          </div>

          <Button
            className="mt-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90"
            onClick={() => onIrPara('gerador')}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Começar pelo Gerador
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">O que faz cada aba</CardTitle>
          <CardDescription>Clique em qualquer uma para abrir direto.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {ABAS.map((aba) => {
            const Icone = aba.icone;
            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => onIrPara(aba.id)}
                className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 p-4 transition-colors hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/20"
              >
                <div className="flex items-start gap-3">
                  <Icone className={`h-5 w-5 shrink-0 mt-0.5 ${aba.cor}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{aba.nome}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-1">{aba.texto}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            O que nenhuma ferramenta daqui faz
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            Cada sorteio é independente do anterior. Nenhuma estatística, estratégia ou nota deste
            site aumenta a sua chance de acertar — todas as combinações válidas têm exatamente a
            mesma probabilidade, e dezena atrasada não tem nada "guardado" para sair.
          </p>
          <p>
            Na {config.name}, a faixa principal sai{' '}
            <strong className="text-foreground">{formatarChance(lottery)}</strong>.{' '}
            {compararChance(lottery, 1)}
          </p>
          <p>
            O que o site faz de verdade é reduzir o custo de cobrir muitas dezenas (Fechamentos),
            evitar padrões muito jogados para você não dividir o prêmio se ganhar (Anti-Popular),
            manter o gasto sob controle (limite mensal) e tirar de você o trabalho de conferir. É
            organização e economia, não previsão.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">As estratégias do Gerador</CardTitle>
          <CardDescription>
            Todas montam bilhetes válidos. A Prova Real mostra o quanto cada uma entrega de fato.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {ESTRATEGIAS.map((estrategia) => (
            <div
              key={estrategia.nome}
              className="rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2"
            >
              <span className="text-sm font-semibold">{estrategia.nome}</span>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                {estrategia.texto}
              </p>
            </div>
          ))}

          <Button variant="outline" size="sm" className="mt-2" onClick={() => onIrPara('backtest')}>
            <FlaskConical className="h-4 w-4 mr-2 text-indigo-600" />
            Comparar as estratégias na Prova Real
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Como ler a nota de 0 a 100</CardTitle>
          <CardDescription>
            A nota mede o quanto o bilhete se parece com os sorteios típicos da modalidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            {CRITERIOS_SCORE.map((criterio) => (
              <div
                key={criterio.nome}
                className="flex items-center gap-3 rounded-md border border-slate-200 dark:border-slate-800 px-3 py-2"
              >
                <Badge variant="secondary" className="font-mono text-xs shrink-0">
                  {criterio.pontos} pts
                </Badge>
                <div className="text-xs">
                  <span className="font-semibold">{criterio.nome}</span>
                  <span className="text-muted-foreground"> — {criterio.texto}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Acima de 88 o bilhete aparece como Excelente, acima de 75 como Muito Bom e acima de 60
            como Bom. Vale repetir: nota alta não é chance maior de ganhar. Um bilhete de 100 pontos
            e um de 30 têm a mesma probabilidade de sair. A nota só indica que o primeiro tem a cara
            dos resultados que costumam aparecer.
          </p>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            O que "garantia" significa nos Fechamentos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3 leading-relaxed">
          <p>
            A garantia é <strong className="text-foreground">condicional</strong>, e a condição é
            você acertar o grupo. Um fechamento de 10 dezenas na Mega-Sena com garantia de quadra
            quer dizer: <em>se</em> quatro das seis dezenas sorteadas estiverem entre as suas dez,
            então pelo menos um dos bilhetes fecha a quadra. Se apenas três caírem no seu grupo,
            nenhuma garantia se aplica.
          </p>
          <p>
            O que o fechamento economiza é o custo de cobrir o grupo: em vez de jogar todas as
            combinações possíveis das suas dezenas, você joga um subconjunto escolhido por
            combinatória. Todos os planos do site são gerados e verificados por força bruta, e o app
            revalida a garantia antes de exibir — o texto de cada plano descreve exatamente o que a
            matemática entrega.
          </p>
          <Button variant="outline" size="sm" onClick={() => onIrPara('fechamentos')}>
            <Layers className="h-4 w-4 mr-2 text-emerald-600" />
            Ver os fechamentos disponíveis
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200 dark:border-slate-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dúvidas frequentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="apostar">
              <AccordionTrigger className="text-sm text-left">
                Dá para apostar pelo site?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Não, e nem poderia. Aposta só é válida na lotérica credenciada ou no app oficial das
                Loterias Caixa. Aqui você monta os jogos, exporta ou copia as dezenas, e faz a
                aposta oficial por lá. Depois marque o jogo como apostado na Carteira.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="login">
              <AccordionTrigger className="text-sm text-left">
                Por que preciso de conta para entrar?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Porque o aceite do termo de uso fica registrado na sua conta, com data, hora e a
                versão do texto que você leu. É o que garante que ninguém use a ferramenta sem estar
                ciente de que ela não prevê resultados nem garante prêmio. A conta também é o que
                permite a carteira acompanhar você entre o celular e o computador.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dados">
              <AccordionTrigger className="text-sm text-left">
                De onde vêm os resultados?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Da API oficial das Loterias Caixa, com um espelho público e um histórico embarcado
                no próprio site como reserva. São cerca de cinco mil concursos disponíveis para as
                estatísticas, então o site continua funcionando mesmo se a fonte oficial ficar fora
                do ar.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dados-salvos">
              <AccordionTrigger className="text-sm text-left">
                Meus jogos salvos ficam guardados onde?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                No seu próprio navegador, por padrão. Limpar os dados do navegador apaga a carteira,
                então use a exportação em CSV se quiser uma cópia. Com login e servidor configurados,
                a carteira também sincroniza entre os seus aparelhos.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="celular">
              <AccordionTrigger className="text-sm text-left">
                Consigo instalar no celular?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Sim. O aviso de instalação aparece logo acima das abas e coloca um ícone na tela
                inicial, com funcionamento offline. Na mesma faixa dá para ativar o aviso de novo
                resultado, que avisa quando sai concurso mais novo do que o último que você viu.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="preco">
              <AccordionTrigger className="text-sm text-left">
                Os preços mostrados são os oficiais?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                São a tabela oficial da Caixa, e o custo de cada bilhete já considera quantas dezenas
                você marcou. A aposta simples da {config.name} custa{' '}
                R$ {config.basePrice.toFixed(2).replace('.', ',')}, e marcar dezenas a mais encarece
                rápido, porque o preço acompanha o número de combinações.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="quanto-jogar">
              <AccordionTrigger className="text-sm text-left">
                Quanto devo apostar?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                Só o que você não faz falta perder, porque o resultado mais provável de qualquer
                aposta é não ganhar. Defina um limite mensal na Carteira e o site avisa antes de você
                passar do teto, mostrando também quanto aquele ritmo custaria em um ano.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
};
