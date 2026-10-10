import { schemas } from "../../../packages/shared/contracts.js";
import { AppError, requirePermission } from "./domain.js";
import { fiscalConfigFromEnv } from "./fiscal/nfce.js";
import { createTransaction } from "./database/transaction.js";
import { executeCommand } from "./database/commands.js";
import { createAuth } from "./modules/auth/index.js";
import { snapshot } from "./modules/snapshot.js";
import { exportXml } from "./modules/payments/exportXml.js";
import { handlers, mutationPermissions } from "./transport/router.js";

export function createService(db, { fiscal = fiscalConfigFromEnv() } = {}) {
  const transaction = createTransaction(db);
  const auth = createAuth(db, transaction);
  return {
    authenticate: auth.authenticate,
    isMutation: (action) => Object.hasOwn(handlers, action),
    async execute(request, peer = "local") {
      const { action, token } = request;
      const data = Object.hasOwn(schemas, action)
        ? schemas[action].parse(request.data ?? {})
        : {};
      if (action === "login") return auth.login(data, peer);
      const session = await auth.authenticate(token);
      const { user, terminal } = session;
      if (action === "logout") return auth.logout(session);
      if (action === "snapshot") return snapshot(transaction, user);
      if (action === "tabs.xml") return exportXml(db, user, data);
      if (!Object.hasOwn(handlers, action))
        throw new AppError("UNKNOWN_ACTION", "Operação desconhecida.");
      requirePermission(user, mutationPermissions[action]);
      return executeCommand({
        db,
        transaction,
        request,
        user,
        terminal,
        data,
        action,
        fiscal,
        handler: handlers[action],
      });
    },
  };
}
