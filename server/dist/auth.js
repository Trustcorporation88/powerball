import bcrypt from "bcryptjs";
export async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}
export async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}
/**
 * preHandler que exige um JWT válido. Em caso de falha responde 401.
 */
export async function authGuard(request, reply) {
    try {
        await request.jwtVerify();
    }
    catch {
        await reply.code(401).send({ message: "Não autenticado" });
    }
}
//# sourceMappingURL=auth.js.map