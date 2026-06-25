import bcrypt from "bcryptjs";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface JwtUser {
  id: string;
  email: string;
  role: string;
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JwtUser;
    user: JwtUser;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * preHandler que exige um JWT válido. Em caso de falha responde 401.
 */
export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    await reply.code(401).send({ message: "Não autenticado" });
  }
}
