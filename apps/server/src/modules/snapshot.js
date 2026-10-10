import { can } from "../../../../packages/shared/permissions.js";
import { requirePermission } from "../domain.js";
import { safeUser } from "./auth/identity.js";
import { includeTab, serialize } from "../database/queries.js";
export async function snapshot(transaction, user) {
  requirePermission(user, "tabs.read");
  return transaction(async (tx) => {
    const tabs = await tx.tab.findMany({
      where: { status: { in: ["OPEN", "PAID"] } },
      include: includeTab,
      orderBy: { openedAt: "desc" },
    });
    const products = await tx.product.findMany({
      where: can(user.role, "products.write")
        ? {}
        : {
            OR: [{ active: true }, { saleType: "WEIGHT", priceCents: 0 }],
          },
      orderBy: { name: "asc" },
    });
    const history = can(user.role, "history.read")
      ? await tx.tab.findMany({
          where: { status: "CLOSED" },
          include: includeTab,
          orderBy: { closedAt: "desc" },
          take: 100,
        })
      : [];
    const users = can(user.role, "users.write")
      ? (await tx.user.findMany({ orderBy: { name: "asc" } })).map(safeUser)
      : [];
    const auditLogs = can(user.role, "audit.read")
      ? await tx.auditLog.findMany({
          orderBy: { createdAt: "desc" },
          take: 100,
        })
      : [];
    return serialize({
      user: safeUser(user),
      tables: await tx.diningTable.findMany({
        where: { active: true },
        orderBy: { number: "asc" },
      }),
      tabs,
      products,
      history,
      users,
      auditLogs,
    });
  });
}
