import { audit } from "../audit/index.js";
import { safeUser } from "../auth/identity.js";
export async function createUser({ tx, user, terminal, data, passwordHash }) {
  let result;
  result = safeUser(
    await tx.user.create({
      data: {
        name: data.name,
        username: data.username,
        role: data.role,
        passwordHash,
      },
    }),
  );
  await audit(tx, user, terminal, "USER_CREATED", result.id, {
    username: result.username,
    role: result.role,
  });

  return result;
}
