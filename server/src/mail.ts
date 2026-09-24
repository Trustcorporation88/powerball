import { env } from "./env.js";

export function emailConfigurado(): boolean {
  return env.RESEND_API_KEY.length > 0;
}

interface Mensagem {
  para: string;
  assunto: string;
  html: string;
  texto: string;
}

/** Envia pela API HTTP da Resend; não precisa de SMTP nem de biblioteca extra. */
export async function enviarEmail(mensagem: Mensagem): Promise<void> {
  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [mensagem.para],
      subject: mensagem.assunto,
      html: mensagem.html,
      text: mensagem.texto,
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`Resend respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
}
