import { createHash, randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { authGuard, hashPassword, verifyPassword, type JwtUser } from "../auth.js";
import { env } from "../env.js";
import { emailConfigurado, enviarEmail } from "../mail.js";

const RESET_VALIDADE_MS = 60 * 60 * 1000;
const RESET_MAX_POR_HORA = 3;

const forgotSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});

const resetSchema = z.object({
  token: z.string().min(20, "Link inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

function hashDoToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

const registerSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
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

  app.post("/auth/forgot-password", async (request, reply) => {
    if (!emailConfigurado()) {
      return reply.code(503).send({
        message: "A recuperação por e-mail ainda não foi configurada neste site.",
      });
    }

    const parsed = forgotSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    // A resposta é a mesma com ou sem conta, para não revelar quem é cliente.
    const resposta = {
      message: "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.",
    };

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) return reply.send(resposta);

    const recentes = await prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESET_VALIDADE_MS) } },
    });
    if (recentes >= RESET_MAX_POR_HORA) return reply.send(resposta);

    const token = randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashDoToken(token),
        expiresAt: new Date(Date.now() + RESET_VALIDADE_MS),
      },
    });

    const link = `${env.APP_URL}/redefinir-senha?token=${token}`;
    const nome = escaparHtml(user.name.split(" ")[0] ?? "");

    try {
      await enviarEmail({
        para: user.email,
        assunto: "Powerball — criar nova senha",
        texto:
          `Olá ${user.name.split(" ")[0] ?? ""},\n\n` +
          `Recebemos um pedido para trocar a senha da sua conta no Powerball.\n` +
          `Abra o link abaixo em até 1 hora:\n\n${link}\n\n` +
          `Se não foi você, ignore este e-mail: sua senha continua a mesma.`,
        html:
          `<p>Olá ${nome},</p>` +
          `<p>Recebemos um pedido para trocar a senha da sua conta no Powerball.</p>` +
          `<p><a href="${link}" style="display:inline-block;padding:10px 18px;background:#1E3054;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold">Criar nova senha</a></p>` +
          `<p>O link vale por 1 hora. Se não foi você, ignore este e-mail: sua senha continua a mesma.</p>`,
      });
    } catch (error) {
      request.log.error(error, "[auth] falha ao enviar e-mail de redefinição");
      return reply.code(502).send({ message: "Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos." });
    }

    return reply.send(resposta);
  });

  app.post("/auth/reset-password", async (request, reply) => {
    const parsed = resetSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ message: parsed.error.issues[0]?.message ?? "Dados inválidos" });
    }

    const registro = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashDoToken(parsed.data.token) },
    });

    if (!registro || registro.usedAt || registro.expiresAt.getTime() < Date.now()) {
      return reply.code(400).send({ message: "Este link expirou ou já foi usado. Peça um novo." });
    }

    const agora = new Date();
    await prisma.$transaction([
      prisma.user.update({
        where: { id: registro.userId },
        data: { passwordHash: await hashPassword(parsed.data.password) },
      }),
      // Invalida este e qualquer outro link pendente da mesma conta.
      prisma.passwordResetToken.updateMany({
        where: { userId: registro.userId, usedAt: null },
        data: { usedAt: agora },
      }),
    ]);

    return reply.send({ message: "Senha alterada. Entre com a nova senha." });
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
