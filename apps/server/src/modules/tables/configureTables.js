import { AppError } from "../../domain.js";
import { audit } from "../audit/index.js";
export async function configureTables({ tx, user, terminal, data }) {
  let result;
  const occupied = await tx.diningTable.findFirst({
    where: { number: { gt: data.count }, activeTabId: { not: null } },
  });
  if (occupied)
    throw new AppError(
      "CONFLICT",
      `Encerre a mesa ${occupied.number} antes de reduzir a quantidade.`,
    );
  await tx.diningTable.createMany({
    data: Array.from({ length: data.count }, (_, i) => ({
      number: i + 1,
    })),
    skipDuplicates: true,
  });
  await tx.diningTable.updateMany({
    where: { number: { lte: data.count } },
    data: { active: true },
  });
  await tx.diningTable.updateMany({
    where: { number: { gt: data.count } },
    data: { active: false },
  });
  await audit(tx, user, terminal, "TABLES_CONFIGURED", "dining-room", {
    count: data.count,
  });
  result = { count: data.count };

  return result;
}
