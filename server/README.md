# Powerball — API

Backend do site de palpites das Loterias Caixa. **Fastify + Prisma + PostgreSQL**,
para deploy no **Railway** (serviço separado do frontend).

Quando o frontend tem `VITE_API_URL` apontando para esta API, login, aceite do
termo e carteira ficam no Postgres (Supabase). Sem `VITE_API_URL`, o site usa
só o armazenamento local do navegador.

Esta API **não** é o DataFin / Análise Planilha. Não há rotas de DRE, projetos
ou planilhas.

## Variáveis

| Variável        | Descrição |
| --------------- | --------- |
| `DATABASE_URL`  | Connection string do Supabase |
| `JWT_SECRET`    | Segredo para assinar os tokens. No Railway: `${{ secret(44, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789") }}` |
| `PORT`          | Injetada pelo Railway |
| `CORS_ORIGIN`   | `https://play.xbrex.com.br,https://powerballbr.com.br,https://www.powerballbr.com.br` |
| `APP_URL`       | Endereço do site para o link de nova senha quando o pedido não vem de um endereço do `CORS_ORIGIN`. Padrão `https://powerballbr.com.br` |
| `RESEND_API_KEY`| Chave da [Resend](https://resend.com). Sem ela, "Esqueci minha senha" avisa que não está configurado |
| `MAIL_FROM`     | Remetente, num domínio verificado na Resend. Padrão `Powerball <nao-responda@powerballbr.com.br>` |
| `ALERT_WEBHOOK_URL` | Opcional. Webhook do Discord ou do Slack avisado quando os resultados param de chegar |
| `SYNC_INTERVAL_MINUTES` | Intervalo da sincronização automática. Padrão `60`; `0` desliga |

## Sincronização e alerta

A API busca as seis modalidades a cada `SYNC_INTERVAL_MINUTES`, primeiro na
Caixa e depois no espelho público, e registra cada tentativa em
`LotterySyncLog` (30 dias). Se nenhuma fonte responder por 24 h, ou se a data
do próximo sorteio passar sem resultado, a modalidade entra em alerta: aparece
em `/transparencia`, num aviso na página de palpites e no `ALERT_WEBHOOK_URL`.

## Deploy no Railway

1. Serviço próprio, **Root Directory** = `server`.
2. Preencha as variáveis acima. `DATABASE_URL` é a URI real do Supabase, não o placeholder.
3. **Networking → Generate Domain**, depois **Custom Domain** `api.powerballbr.com.br`.
4. No serviço do **frontend** (`powerball`), `VITE_API_URL` = a URL pública desta API.

Healthcheck: `GET /health`.

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`
- `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET /lottery/:modalidade/history?limit=&offset=`, `GET /lottery/:modalidade/latest`, `GET /lottery/:modalidade/:concurso`
- `GET /lottery/status` — situação das fontes por modalidade
- `GET /lottery/transparencia/:modalidade` — placar real das estratégias
- `GET/PUT /lottery/wallet` — carteira (com login)
- `GET /terms/acceptances`, `POST /terms/accept`
- `GET /health`
