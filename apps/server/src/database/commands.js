import { z } from "zod";
import bcrypt from "bcryptjs";
import { hash } from "../modules/auth/identity.js";
import { AppError } from "../domain.js";
import { serialize } from "./queries.js";
export async function executeCommand({
  db,
  transaction,
  request,
  user,
  terminal,
  data,
  action,
  fiscal,
  handler,
}) {
  const commandId = z.string().uuid().parse(request.commandId);
  const fingerprint = hash(JSON.stringify({ action, data }));
  // Password hashing happens outside the database transaction.
  const passwordHash =
    action === "users.create"
      ? await bcrypt.hash(data.password, 12)
      : undefined;
  try {
    return await transaction(async (tx) => {
      const previous = await tx.commandReceipt.findUnique({
        where: { id: commandId },
      });
      if (previous) {
        if (previous.userId !== user.id || previous.fingerprint !== fingerprint)
          throw new AppError(
            "CONFLICT",
            "Identificador da operação já utilizado.",
          );
        return previous.result;
      }
      let result = await handler({
        tx,
        user,
        terminal,
        data,
        action,
        passwordHash,
        fiscal,
      });
      result = serialize(result);
      await tx.commandReceipt.create({
        data: { id: commandId, userId: user.id, fingerprint, result },
      });
      return result;
    });
  } catch (error) {
    if (error.code === "P2002") {
      const receipt = await db.commandReceipt.findUnique({
        where: { id: commandId },
      });
      if (receipt?.userId === user.id && receipt.fingerprint === fingerprint)
        return receipt.result;
      throw new AppError(
        "CONFLICT",
        "Já existe um registro com esses dados. Atualize e tente novamente.",
      );
    }
    if (error.code === "P2025")
      throw new AppError("NOT_FOUND", "Registro não encontrado.");
    if (error.code === "P2034")
      throw new AppError(
        "CONFLICT",
        "Outra operação alterou os dados. Confira a ficha e tente novamente.",
      );
    throw error;
  }
}
