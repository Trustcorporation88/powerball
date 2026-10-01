/**
 * Leitura da foto do bilhete no próprio navegador. A imagem não sai do
 * aparelho; só o motor de OCR e o dicionário de português são baixados na
 * primeira vez.
 */

const LARGURA_MINIMA = 1600;

/** Escala de cinza com contraste reforçado e ampliação: o recibo térmico sai claro e pequeno nas fotos. */
async function prepararImagem(arquivo: File): Promise<HTMLCanvasElement | File> {
  try {
    const bitmap = await createImageBitmap(arquivo);
    const escala = Math.max(1, LARGURA_MINIMA / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * escala);
    canvas.height = Math.round(bitmap.height * escala);
    const ctx = canvas.getContext('2d');
    if (!ctx) return arquivo;
    ctx.filter = 'grayscale(1) contrast(1.6)';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas;
  } catch {
    return arquivo;
  }
}

export async function lerTextoDaImagem(
  arquivo: File,
  aoProgredir?: (percentual: number) => void,
): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('por', 1, {
    logger: (mensagem) => {
      if (mensagem.status === 'recognizing text') aoProgredir?.(Math.round(mensagem.progress * 100));
    },
  });
  try {
    const imagem = await prepararImagem(arquivo);
    const { data } = await worker.recognize(imagem);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
