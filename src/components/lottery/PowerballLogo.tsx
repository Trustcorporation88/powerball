import React from 'react';

interface PowerballLogoProps {
  /** Altura em pixels. A largura acompanha a proporção do arquivo. */
  altura?: number;
  className?: string;
}

/**
 * Logotipo da marca.
 *
 * O arquivo tem fundo transparente, então funciona tanto sobre o branco das
 * telas claras quanto sobre o azul do escudo nas áreas escuras.
 */
export const PowerballLogo: React.FC<PowerballLogoProps> = ({ altura = 48, className }) => (
  <img
    src="/logo-powerball.png"
    alt="Loterias Caixa • Powerball"
    height={altura}
    style={{ height: altura }}
    className={`w-auto select-none ${className ?? ''}`}
    draggable={false}
  />
);
