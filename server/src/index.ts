import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env, parseCorsOrigin } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { lotteryRoutes } from "./routes/lottery.js";
import { termsRoutes } from "./routes/terms.js";
import { iniciarAgendador } from "./scheduler.js";
import { prisma } from "./prisma.js";

async function main(): Promise<void> {
  const app = Fastify({
    logger: true,
    bodyLimit: 2 * 1024 * 1024,
  });

  await app.register(cors, {
    origin: parseCorsOrigin(env.CORS_ORIGIN),
    credentials: true,
  });

  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get("/health", async () => ({ status: "ok", time: new Date().toISOString() }));

  await app.register(authRoutes);
  await app.register(lotteryRoutes);
  await app.register(termsRoutes);

  let pararAgendador: () => void = () => undefined;

  const close = async () => {
    pararAgendador();
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    pararAgendador = iniciarAgendador(app.log);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
