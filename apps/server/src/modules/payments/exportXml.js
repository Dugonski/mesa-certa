import { AppError, requirePermission } from "../../domain.js";
export async function exportXml(db, user, data) {
  requirePermission(user, "tabs.pay");
  const tab = await db.tab.findUnique({
    where: { id: data.tabId },
    include: { payment: true },
  });
  if (!tab?.payment)
    throw new AppError("NOT_FOUND", "Esta ficha ainda não possui um XML.");
  return {
    xml: tab.payment.xml,
    filename: `venda-demo-${tab.number}.xml`,
  };
}
