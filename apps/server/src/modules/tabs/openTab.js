import { AppError } from "../../domain.js";
import { audit } from "../audit/index.js";
export async function openTab({ tx, user, terminal, data, passwordHash }) {
  let result;
  const table = await tx.diningTable.findUnique({
    where: { number: data.tableNumber },
  });
  if (!table?.active)
    throw new AppError("NOT_FOUND", "Mesa não cadastrada ou desativada.");
  if (table.activeTabId)
    throw new AppError(
      "CONFLICT",
      "Esta mesa já foi aberta. Selecione-a novamente.",
    );
  result = await tx.tab.create({
    data: {
      label: `Mesa ${String(table.number).padStart(2, "0")}`,
      tableNumber: table.number,
      openedBy: user.id,
    },
  });
  const reserved = await tx.diningTable.updateMany({
    where: { number: table.number, active: true, activeTabId: null },
    data: { activeTabId: result.id },
  });
  if (reserved.count !== 1)
    throw new AppError(
      "CONFLICT",
      "Esta mesa já foi aberta. Selecione-a novamente.",
    );
  await audit(tx, user, terminal, "TAB_OPENED", result.id, {
    label: result.label,
    number: result.number,
  });

  return result;
}
