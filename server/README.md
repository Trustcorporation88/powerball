# DataFin — Backend (API)

API REST do DataFin / Análise Planilha. **Fastify + Prisma + PostgreSQL**, pronta para deploy no **Railway**.

Quando o frontend tem `VITE_API_URL` apontando para esta API, os dados (projetos,
transações, mapeamentos, usuários, etc.) passam a ficar centralizados no Postgres
em vez do IndexedDB do navegador. Sem `VITE_API_URL`, o frontend continua 100% local.

## Stack

- **Fastify 5** — servidor HTTP
- **Prisma 6** — ORM + schema/sync
- **PostgreSQL** — banco de dados
- **@fastify/jwt** + **bcryptjs** — autenticação (JWT + hash de senha)
- **zod** — validação de payloads

## Variáveis de ambiente

Veja `.env.example`. As principais:

| Variável        | Descrição                                                        |
| --------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`  | String de conexão Postgres. No Railway: `${{ Postgres.DATABASE_URL }}` |
| `JWT_SECRET`    | Segredo para assinar os tokens (string longa e aleatória)         |
| `PORT`          | Porta (o Railway injeta automaticamente)                          |
| `CORS_ORIGIN`   | Origens permitidas, separadas por vírgula. Ex.: a URL do Vercel   |

## Rodando localmente

```bash
cd server
pnpm install
cp .env.example .env   # edite DATABASE_URL e JWT_SECRET
pnpm prisma db push    # cria as tabelas
pnpm dev               # sobe em http://localhost:8080
```

## Deploy no Railway

### Opção A: PostgreSQL do próprio Railway
1. **Crie um banco**: no seu projeto do Railway, *New → Database → PostgreSQL*.
2. **Crie o serviço da API**: *New → GitHub Repo* apontando para este repositório.
   - Em **Settings → Root Directory**, coloque `server`.
   - O Railway detecta o `Dockerfile` (ou use o `railway.json` incluso).
3. **Variáveis** (Settings → Variables do serviço da API):
   - `DATABASE_URL` = `${{ Postgres.DATABASE_URL }}` (referência ao banco)
   - `JWT_SECRET` = uma string longa e aleatória
   - `CORS_ORIGIN` = as URLs do site, separadas por vírgula, ex.: `https://play.xbrex.com.br,https://powerballbr.com.br,https://www.powerballbr.com.br`
4. **Gere um domínio** público (Settings → Networking → Generate Domain).

### Opção B: PostgreSQL hospedado no Supabase
Você também pode usar o banco gerenciado do **Supabase** conectado à API no **Railway**:
1. No Supabase, crie um projeto e copie a connection string em **Project Settings → Database → Connection string → URI** (modo `Transaction` na porta 6543 ou `Session` na porta 5432).
2. No Railway, defina `DATABASE_URL` com a URL do Supabase (ex.: `postgresql://postgres.[ref]:[senha]@aws-0-[regiao].pooler.supabase.com:6543/postgres?pgbouncer=true`).
3. O comando de start executa `prisma db push` automaticamente na inicialização, criando todas as tabelas no Supabase sem necessidade de configuração manual adicional.

---

5. No serviço do **frontend** (`powerball`), defina `VITE_API_URL` com a URL pública gerada no Railway (ex.: `https://sweet-vision-production.up.railway.app`) e faça redeploy.

> Domínio próprio (`powerballbr.com.br`): adicione-o em **Settings → Networking → Custom Domain** no serviço do site. A API recebe o seu em `api.powerballbr.com.br`. Os dois precisam estar em `CORS_ORIGIN`.

O comando de start roda `prisma db push` automaticamente, sincronizando o schema
com o banco a cada deploy. Healthcheck disponível em `GET /health`.

## Endpoints

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`
- `GET/POST /projects`, `DELETE /projects/:id`
- `GET/PUT /projects/:id/file`
- `GET/PUT /projects/:id/mappings`
- `GET/PUT /projects/:id/transactions`
- `GET/PUT /projects/:id/dre-rules`
- `GET/PUT /projects/:id/layout`
- `POST /shares` (auth) e `GET /shares/:token` (público)
- `GET /health`

Todas as rotas de dados exigem `Authorization: Bearer <token>` e são isoladas por usuário.
