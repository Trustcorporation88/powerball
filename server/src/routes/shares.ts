import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard } from "../auth.js";

const shareSchema = z.object({
  token: z.string().min(1),
  createdAt: z.string(),
  projectName: z.string(),
  snapshotJson: z.string(),
});

export async function shareRoutes(app: FastifyInstance): Promise<void> {
  // Criação exige autenticação.
  app.post("/shares", { preHandler: authGuard }, async (request, reply) => {
    const parsed = shareSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: "Snapshot inválido" });
    }
    const data = parsed.data;
    await prisma.shareSnapshot.upsert({
      where: { token: data.token },
      create: data,
      update: { createdAt: data.createdAt, projectName: data.projectName, snapshotJson: data.snapshotJson },
    });
    return reply.send({ success: true, token: data.token });
  });

  // Leitura é pública (dashboard compartilhado por link).
  app.get<{ Params: { token: string } }>("/shares/:token", async (request, reply) => {
    const snapshot = await prisma.shareSnapshot.findUnique({ where: { token: request.params.token } });
    if (!snapshot) {
      return reply.code(404).send({ message: "Snapshot não encontrado" });
    }
    return reply.send({
      token: snapshot.token,
      createdAt: snapshot.createdAt,
      projectName: snapshot.projectName,
      snapshotJson: snapshot.snapshotJson,
    });
  });
}
