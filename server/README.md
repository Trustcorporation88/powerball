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

## Deploy no Railway

1. Serviço próprio, **Root Directory** = `server`.
2. Preencha as variáveis acima. `DATABASE_URL` é a URI real do Supabase, não o placeholder.
3. **Networking → Generate Domain**, depois **Custom Domain** `api.powerballbr.com.br`.
4. No serviço do **frontend** (`powerball`), `VITE_API_URL` = a URL pública desta API.

Healthcheck: `GET /health`.

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`
- `GET/POST /lottery/games`, `DELETE /lottery/games/:id`
- `GET /terms/acceptances`, `POST /terms/accept`
- `GET /health`
