import React, { useRef, useState } from 'react';
import { Camera, FileText, Loader2, ScanSearch, Wallet } from 'lucide-react';
import { toast } from 'sonner';

import { GeneratedGame, LotteryDraw, LotteryType } from '@/types/lottery';
import { LOTTERY_CONFIGS } from '@/constants/lotteryConstants';
import { getDrawByConcurso } from '@/services/lotteryApiService';
import { checkTicketAgainstDraw, TicketCheckResult } from '@/services/lotteryGameManager';
import { valorDaFaixa } from '@/services/lotteryConferencia';
import { bilhetesImportados, JogoLido, lerJogosDoTexto } from '@/services/lotteryImportacao';
import { lerTextoDaImagem } from '@/services/lotteryOcr';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ConferirJogosDialogProps {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  lottery: LotteryType;
  /** Concursos já carregados da modalidade, do mais novo para o mais antigo. */
  draws: LotteryDraw[];
  onGuardar: (games: GeneratedGame[]) => void;
}

interface Conferencia {
  concurso: number;
  draw: LotteryDraw | null;
  linhas: Array<{ jogo: JogoLido; resultado?: TicketCheckResult; valorPremio?: number }>;
  ignorados: string[];
}

const formatarReais = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const dezena = (n: number) => String(n).padStart(2, '0');

export const ConferirJogosDialog: React.FC<ConferirJogosDialogProps> = ({
  open,
  onOpenChange,
  lottery,
  draws,
  onGuardar,
}) => {
  const config = LOTTERY_CONFIGS[lottery];
  const arquivoRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState('');
  const [concurso, setConcurso] = useState('');
  const [lendoFoto, setLendoFoto] = useState<number | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [conferencia, setConferencia] = useState<Conferencia | null>(null);

  const ultimoSorteado = draws[0]?.concurso;

  const limpar = () => {
    setTexto('');
    setConcurso('');
    setConferencia(null);
  };

  const receberArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    setConferencia(null);

    if (!arquivo.type.startsWith('image/')) {
      const conteudo = await arquivo.text();
      setTexto(conteudo);
      toast.success('Arquivo carregado. Confira o texto e clique em Conferir.');
      return;
    }

    setLendoFoto(0);
    try {
      const lido = await lerTextoDaImagem(arquivo, setLendoFoto);
      setTexto(lido);
      const { jogos } = lerJogosDoTexto(lido, lottery);
      if (jogos.length === 0) {
        toast.warning('Não encontrei jogos na foto. Tente uma foto mais nítida e reta, ou digite os números.');
      } else {
        toast.success(`${jogos.length} jogo(s) lidos da foto. Corrija o texto se algum número saiu errado.`);
      }
    } catch {
      toast.error('Não foi possível ler a foto. Verifique a conexão e tente de novo.');
    } finally {
      setLendoFoto(null);
    }
  };

  const conferir = async () => {
    const leitura = lerJogosDoTexto(texto, lottery);
    if (leitura.jogos.length === 0) {
      toast.error(
        `Nenhum jogo de ${config.name} encontrado. Cada jogo precisa de ${config.minSelection} a ${config.maxSelection} dezenas de 1 a ${config.totalNumbers}.`,
      );
      return;
    }

    const numero = Number(concurso || leitura.concursoDetectado || ultimoSorteado);
    if (!Number.isInteger(numero) || numero <= 0) {
      toast.error('Informe o número do concurso.');
      return;
    }
    if (!concurso) setConcurso(String(numero));

    setConferindo(true);
    try {
      const draw =
        draws.find((item) => item.concurso === numero) ??
        (ultimoSorteado && numero <= ultimoSorteado ? await getDrawByConcurso(lottery, numero) : null);

      const linhas = leitura.jogos.map((jogo) => {
        if (!draw) return { jogo };
        const resultado = checkTicketAgainstDraw(jogo.numbers, draw, jogo.extra);
        return {
          jogo,
          resultado,
          valorPremio: resultado.isWinner ? valorDaFaixa(lottery, draw, resultado.prizeLabel) : undefined,
        };
      });
      linhas.sort((a, b) => (b.resultado?.hits ?? 0) - (a.resultado?.hits ?? 0));
      setConferencia({ concurso: numero, draw, linhas, ignorados: leitura.ignorados });
    } finally {
      setConferindo(false);
    }
  };

  const guardar = () => {
    if (!conferencia) return;
    onGuardar(
      bilhetesImportados(
        conferencia.linhas.map((linha) => linha.jogo),
        lottery,
        conferencia.concurso,
      ),
    );
    toast.success(
      `${conferencia.linhas.length} jogo(s) guardados na Carteira para o concurso ${conferencia.concurso}.`,
    );
    limpar();
    onOpenChange(false);
  };

  const premiados = conferencia?.linhas.filter((linha) => linha.resultado?.isWinner) ?? [];
  const totalPremios = premiados.reduce((soma, linha) => soma + (linha.valorPremio ?? 0), 0);
  const melhor = conferencia?.linhas[0]?.resultado?.hits;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanSearch className="h-5 w-5" />
            Conferir meus jogos — {config.name}
          </DialogTitle>
          <DialogDescription>
            Cole os jogos (do WhatsApp, de uma planilha ou digitados, um por linha), envie um
            arquivo TXT/CSV ou uma foto do bilhete. O site lê as dezenas e mostra os acertos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              ref={arquivoRef}
              type="file"
              accept="image/*,.txt,.csv,text/plain,text/csv"
              className="hidden"
              onChange={(evento) => {
                void receberArquivo(evento.target.files?.[0]);
                evento.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={lendoFoto !== null}
              onClick={() => arquivoRef.current?.click()}
            >
              {lendoFoto !== null ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5 mr-1" />
              )}
              {lendoFoto !== null ? `Lendo a foto… ${lendoFoto}%` : 'Foto do bilhete ou arquivo'}
            </Button>
            {texto && (
              <Button type="button" variant="ghost" size="sm" onClick={limpar}>
                Limpar
              </Button>
            )}
          </div>

          <Textarea
            value={texto}
            onChange={(evento) => {
              setTexto(evento.target.value);
              setConferencia(null);
            }}
            rows={7}
            className="font-mono text-xs"
            placeholder={
              lottery === 'lotofacil'
                ? '01 02 03 04 05 06 07 08 09 10 11 12 13 14 15\n02 04 06 08 10 12 14 16 18 20 21 22 23 24 25'
                : 'Um jogo por linha, por exemplo:\n05 12 33 41 47 58'
            }
          />
          {config.extraField && (
            <p className="text-[11px] text-muted-foreground">
              {config.extraField.key === 'trevos'
                ? 'Para os trevos, escreva numa linha logo abaixo do jogo: "Trevos: 2 e 5".'
                : 'Para o Mês da Sorte, escreva o mês numa linha logo abaixo do jogo.'}
            </p>
          )}

          <form
            className="flex flex-wrap items-center gap-2 text-sm"
            onSubmit={(evento) => {
              evento.preventDefault();
              void conferir();
            }}
          >
            <span className="text-muted-foreground">Concurso</span>
            <input
              type="number"
              min={1}
              value={concurso}
              placeholder={String(ultimoSorteado ?? '')}
              onChange={(evento) => {
                setConcurso(evento.target.value);
                setConferencia(null);
              }}
              className="w-28 h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-transparent px-2"
              aria-label="Concurso a conferir"
            />
            <Button type="submit" disabled={conferindo || !texto.trim()}>
              {conferindo ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
              Conferir
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Em branco: o concurso escrito no bilhete ou o último sorteado ({ultimoSorteado ?? '—'}).
            </span>
          </form>

          {conferencia && (
            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              {conferencia.draw ? (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Resultado do concurso {conferencia.concurso} ({conferencia.draw.data})
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {conferencia.draw.dezenas.map(dezena).join(' ')}
                  </p>
                  {conferencia.draw.dezenasSegundoSorteio?.length ? (
                    <p className="font-mono text-xs">
                      2º sorteio: {conferencia.draw.dezenasSegundoSorteio.map(dezena).join(' ')}
                    </p>
                  ) : null}
                  {conferencia.draw.mesSorte && (
                    <p className="text-xs">Mês da Sorte: {conferencia.draw.mesSorte}</p>
                  )}
                  {conferencia.draw.trevos?.length ? (
                    <p className="text-xs">Trevos: {conferencia.draw.trevos.join(' e ')}</p>
                  ) : null}
                  <p className="text-sm pt-1">
                    <strong>{conferencia.linhas.length}</strong> jogo(s) • melhor resultado{' '}
                    <strong>{melhor} acertos</strong> •{' '}
                    {premiados.length > 0 ? (
                      <span className="text-emerald-600 font-semibold">
                        {premiados.length} premiado(s)
                        {totalPremios > 0 ? `, ${formatarReais(totalPremios)}` : ''}
                      </span>
                    ) : (
                      'nenhum premiado'
                    )}
                  </p>
                </div>
              ) : (
                <p className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 text-xs">
                  O concurso {conferencia.concurso} ainda não foi sorteado (último: {ultimoSorteado ?? '—'}).
                  Guarde os {conferencia.linhas.length} jogo(s) na Carteira e o site confere sozinho
                  quando o resultado sair.
                </p>
              )}

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {conferencia.linhas.map(({ jogo, resultado, valorPremio }, idx) => (
                  <div key={idx} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {jogo.numbers.map((n) => {
                        const acertou = resultado?.hitNumbers.includes(n);
                        return (
                          <span
                            key={n}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                              acertou ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                            }`}
                            style={acertou ? { backgroundColor: config.color } : undefined}
                          >
                            {dezena(n)}
                          </span>
                        );
                      })}
                      {jogo.extra?.mesSorte && (
                        <span className="text-[11px] text-muted-foreground self-center">{jogo.extra.mesSorte}</span>
                      )}
                      {jogo.extra?.trevos && (
                        <span className="text-[11px] text-muted-foreground self-center">
                          Trevos {jogo.extra.trevos.join(' e ')}
                        </span>
                      )}
                    </div>
                    {resultado && (
                      <div className="text-right text-xs shrink-0">
                        <p className="font-bold">{resultado.hits} acertos</p>
                        {resultado.isWinner && (
                          <p className="text-emerald-600 font-semibold">
                            {resultado.prizeLabel}
                            {valorPremio ? ` ${formatarReais(valorPremio)}` : ''}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {conferencia.ignorados.length > 0 && (
                <p className="text-[11px] text-amber-700 dark:text-amber-400">
                  Não virou jogo (quantidade de dezenas fora de {config.minSelection} a{' '}
                  {config.maxSelection}): {conferencia.ignorados.join(' | ')}
                </p>
              )}

              <Button onClick={guardar} className="w-full">
                <Wallet className="h-4 w-4 mr-1" />
                Guardar {conferencia.linhas.length} jogo(s) na Carteira (concurso {conferencia.concurso})
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
