import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard, hashPassword, verifyPassword, type JwtUser } from "../auth.js";

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

const profileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

function publicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.code(409).send({ message: "E-mail já cadastrado" });
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name,
        passwordHash: await hashPassword(password),
        role: "user",
      },
    });

    const payload: JwtUser = { id: user.id, email: user.email, role: user.role };
    const token = app.jwt.sign(payload);
    return reply.code(201).send({ token, user: publicUser(user) });
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return reply.code(401).send({ message: "E-mail ou senha inválidos" });
    }

    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ message: "E-mail ou senha inválidos" });
    }

    const payload: JwtUser = { id: user.id, email: user.email, role: user.role };
    const token = app.jwt.sign(payload);
    return reply.send({ token, user: publicUser(user) });
  });

  app.get("/auth/me", { preHandler: authGuard }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.id } });
    if (!user) {
      return reply.code(404).send({ message: "Usuário não encontrado" });
    }
    return reply.send({ user: publicUser(user) });
  });

  app.put("/auth/profile", { preHandler: authGuard }, async (request, reply) => {
    const parsed = profileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    if (normalizedEmail !== request.user.email) {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existing && existing.id !== request.user.id) {
        return reply.code(409).send({ message: "E-mail já cadastrado" });
      }
    }

    const user = await prisma.user.update({
      where: { id: request.user.id },
      data: { name: parsed.data.name, email: normalizedEmail },
    });

    return reply.send({ user: publicUser(user) });
  });
}
