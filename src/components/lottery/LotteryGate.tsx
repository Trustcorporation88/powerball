import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/contexts/AuthContext';
import { registrarAceite, verificarAceiteVigente } from '@/services/lotteryTerms';

import { LotteryLogin } from '@/components/lottery/LotteryLogin';
import { TermosAceite } from '@/components/lottery/TermosAceite';

/**
 * Controla o acesso às ferramentas de palpite: sem conta não entra, e sem
 * aceitar a versão vigente do termo de uso não passa da tela de aceite.
 *
 * As páginas públicas de resultado ficam fora daqui de propósito — elas só
 * reproduzem números de concursos já sorteados, não sugerem aposta nenhuma, e
 * precisam continuar indexáveis.
 */
export const LotteryGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, logout } = useAuth();
  const [verificando, setVerificando] = useState(true);
  const [aceitou, setAceitou] = useState(false);

  useEffect(() => {
    let cancelado = false;

    const verificar = async () => {
      if (!user) {
        if (!cancelado) {
          setAceitou(false);
          setVerificando(false);
        }
        return;
      }

      setVerificando(true);
      const registro = await verificarAceiteVigente(user.email);

      if (!cancelado) {
        setAceitou(Boolean(registro));
        setVerificando(false);
      }
    };

    void verificar();

    return () => {
      cancelado = true;
    };
  }, [user]);

  const aceitar = useCallback(async () => {
    if (!user) return;
    await registrarAceite(user.email);
    setAceitou(true);
  }, [user]);

  if (loading || verificando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  }

  if (!user) {
    return <LotteryLogin />;
  }

  if (!aceitou) {
    return (
      <TermosAceite
        nomeUsuario={user.name}
        emailUsuario={user.email}
        onAceitar={aceitar}
        onSair={logout}
      />
    );
  }

  return <>{children}</>;
};
