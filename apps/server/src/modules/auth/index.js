import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { AppError } from "../../domain.js";
import { hash, safeUser } from "./identity.js";
import { audit } from "../audit/index.js";
export function createAuth(db, transaction) {
  const attempts = new Map();
  async function authenticate(token) {
    if (typeof token !== "string")
      throw new AppError("UNAUTHORIZED", "Entre novamente para continuar.");
    const session = await db.session.findUnique({
      where: { tokenHash: hash(token) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date() || !session.user.active)
      throw new AppError(
        "UNAUTHORIZED",
        "Sua sessão expirou. Entre novamente.",
      );
    return session;
  }

  async function login(data, peer) {
    const now = Date.now();
    for (const [key, entry] of attempts)
      if (entry.until < now) attempts.delete(key);
    const entry = attempts.get(peer) ?? { count: 0, until: now + 60_000 };
    if (entry.count >= 10)
      throw new AppError("RATE_LIMIT", "Muitas tentativas. Aguarde um minuto.");
    entry.count++;
    attempts.set(peer, entry);
    const user = await db.user.findUnique({
      where: { username: data.username },
    });
    if (
      !user?.active ||
      !(await bcrypt.compare(data.password, user.passwordHash))
    )
      throw new AppError("INVALID_LOGIN", "Usuário ou senha incorretos.");
    attempts.delete(peer);
    const newToken = randomBytes(32).toString("hex");
    await transaction(async (tx) => {
      await tx.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      await tx.session.create({
        data: {
          tokenHash: hash(newToken),
          userId: user.id,
          terminal: data.terminal,
          expiresAt: new Date(now + 12 * 60 * 60 * 1000),
        },
      });
      await audit(tx, user, data.terminal, "LOGIN", user.id);
    });
    return { token: newToken, user: safeUser(user) };
  }
  async function logout(session) {
    const { user, terminal } = session;
    await transaction(async (tx) => {
      await tx.session.deleteMany({ where: { id: session.id } });
      await audit(tx, user, terminal, "LOGOUT", user.id);
    });
    return { ok: true };
  }
  return { authenticate, login, logout };
}
