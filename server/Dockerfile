FROM node:20-slim AS base

# Prisma precisa de openssl em runtime.
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

# Instala dependências com lockfile (cache de camadas).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Gera o Prisma Client.
COPY prisma ./prisma
RUN pnpm prisma generate

# Compila o TypeScript.
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 8080

# Sincroniza o schema com o banco e sobe o servidor.
CMD ["pnpm", "start"]
