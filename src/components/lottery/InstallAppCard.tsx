import React, { useEffect, useState } from 'react';
import { BellRing, Download, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

import {
  ativarNotificacoes,
  desativarNotificacoes,
  notificacoesAtivadas,
  notificacoesDisponiveis,
  verificarNovosResultados,
} from '@/services/lotteryNotifications';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

/** Evento de instalação do Chrome, ainda fora do lib.dom padrão. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Convite para instalar o app e ligar os avisos de resultado.
 *
 * Some assim que o app já está instalado (display-mode: standalone) para não
 * ocupar espaço de quem já aceitou.
 */
export const InstallAppCard: React.FC = () => {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [avisos, setAvisos] = useState(false);

  useEffect(() => {
    setInstalado(window.matchMedia('(display-mode: standalone)').matches);
    setAvisos(notificacoesAtivadas());

    const aoPoderInstalar = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const aoInstalar = () => {
      setInstalado(true);
      setPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', aoPoderInstalar);
    window.addEventListener('appinstalled', aoInstalar);

    return () => {
      window.removeEventListener('beforeinstallprompt', aoPoderInstalar);
      window.removeEventListener('appinstalled', aoInstalar);
    };
  }, []);

  const instalar = async () => {
    if (!promptEvent) return;

    await promptEvent.prompt();
    const escolha = await promptEvent.userChoice;

    if (escolha.outcome === 'accepted') {
      toast.success('App instalado! Ele aparece na tela inicial do seu celular.');
    }
    setPromptEvent(null);
  };

  const alternarAvisos = async () => {
    if (avisos) {
      desativarNotificacoes();
      setAvisos(false);
      toast.success('Avisos desligados.');
      return;
    }

    const ativado = await ativarNotificacoes();
    setAvisos(ativado);

    if (ativado) {
      toast.success('Pronto. Ao abrir o app avisamos quando sair resultado novo.');
      void verificarNovosResultados();
    } else {
      toast.error('Seu navegador bloqueou os avisos.');
    }
  };

  const podeInstalar = Boolean(promptEvent) && !instalado;
  const podeAvisar = notificacoesDisponiveis();

  if (!podeInstalar && !podeAvisar) return null;

  return (
    <Card className="border-slate-200 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-powerball-navy/10 dark:bg-powerball-navy/40 text-powerball-navy dark:text-powerball-gold shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">
              {instalado ? 'App instalado neste aparelho' : 'Instale no celular'}
            </p>
            <p className="text-xs text-muted-foreground">
              Funciona offline com o histórico completo e avisa quando sair resultado novo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {podeAvisar && (
            <Button
              variant={avisos ? 'default' : 'outline'}
              size="sm"
              onClick={alternarAvisos}
              className={avisos ? 'bg-amber-500 hover:bg-amber-600 text-amber-950 font-bold' : ''}
            >
              <BellRing className="h-3.5 w-3.5 mr-1.5" />
              {avisos ? 'Avisos ligados' : 'Avisar resultados'}
            </Button>
          )}

          {podeInstalar && (
            <Button
              size="sm"
              onClick={instalar}
              className="bg-powerball-navy hover:bg-powerball-navy-dark text-white font-bold"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Instalar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
