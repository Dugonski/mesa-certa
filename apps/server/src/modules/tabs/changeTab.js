import { AppError, assertTab, totalCents, itemMeasures } from "../../domain.js";
import { audit } from "../audit/index.js";
import { findTab, findTabForChange } from "../../database/queries.js";
import { payTab } from "../payments/index.js";
export async function changeTab({ tx, user, terminal, data, action, fiscal }) {
  let result;
  const tab = await findTabForChange(tx, data.tabId);
  assertTab(tab, data.version, action === "tabs.close" ? "PAID" : "OPEN");
  // Conditional version change and all dependent writes commit together.
  const updated = await tx.tab.updateMany({
    where: { id: tab.id, version: data.version, status: tab.status },
    data: { version: { increment: 1 } },
  });
  if (updated.count !== 1)
    throw new AppError(
      "CONFLICT",
      "A ficha mudou. Atualize e tente novamente.",
    );
  if (action === "tabs.add") {
    const product = await tx.product.findUnique({
      where: { id: data.productId },
    });
    if (!product?.active || product.priceCents <= 0)
      throw new AppError(
        "NOT_FOUND",
        "Produto indisponível. Atualize a lista.",
      );
    const measures = itemMeasures(product.saleType, data);
    totalCents([
      ...tab.items,
      {
        ...measures,
        saleType: product.saleType,
        unitPriceCents: product.priceCents,
      },
    ]);
    await tx.tabItem.create({
      data: {
        tabId: tab.id,
        productId: product.id,
        productName: product.name,
        unitPriceCents: product.priceCents,
        ...measures,
        saleType: product.saleType,
        note: data.note,
        addedBy: user.id,
      },
    });
    await audit(tx, user, terminal, "ITEM_ADDED", tab.id, {
      product: product.name,
      quantity: data.quantity,
      unitPriceCents: product.priceCents,
      note: data.note,
      ...measures,
    });
  } else if (action === "tabs.update" || action === "tabs.remove") {
    const item = tab.items.find((item) => item.id === data.itemId);
    if (!item)
      throw new AppError("NOT_FOUND", "Item não encontrado nesta ficha.");
    if (action === "tabs.remove") {
      await tx.tabItem.delete({ where: { id: item.id } });
      await audit(tx, user, terminal, "ITEM_REMOVED", tab.id, {
        itemId: item.id,
        product: item.productName,
        quantity: item.quantity,
        weightGrams: item.weightGrams,
        unitPriceCents: item.unitPriceCents,
        saleType: item.saleType,
        note: item.note,
      });
    } else {
      const changes = {
        ...itemMeasures(item.saleType, data),
        note: data.note,
      };
      totalCents(
        tab.items.map((row) =>
          row.id === item.id ? { ...row, ...changes } : row,
        ),
      );
      await tx.tabItem.update({
        where: { id: item.id },
        data: changes,
      });
      await audit(tx, user, terminal, "ITEM_UPDATED", tab.id, {
        itemId: item.id,
        product: item.productName,
        before: {
          quantity: item.quantity,
          weightGrams: item.weightGrams,
          note: item.note,
        },
        after: changes,
      });
    }
  } else if (action === "tabs.pay") {
    await payTab({ tx, user, terminal, data, tab, fiscal });
  } else {
    if (!tab.payment)
      throw new AppError(
        "INVALID_STATE",
        "A ficha precisa ter um pagamento registrado.",
      );
    await tx.tab.update({
      where: { id: tab.id },
      data: { status: "CLOSED", closedAt: new Date() },
    });
    await audit(tx, user, terminal, "TAB_CLOSED", tab.id);
    if (tab.tableNumber)
      await tx.diningTable.updateMany({
        where: { number: tab.tableNumber, activeTabId: tab.id },
        data: { activeTabId: null },
      });
  }
  result = await findTab(tx, tab.id);

  return result;
}
