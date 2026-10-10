import { randomUUID } from "node:crypto";
import { AppError, totalCents } from "../../domain.js";
import { makeNfceXml } from "../../fiscal/nfce.js";
import { audit } from "../audit/index.js";
export async function payTab({ tx, user, terminal, data, tab, fiscal }) {
  if (!tab.items.length)
    throw new AppError(
      "EMPTY_TAB",
      "Adicione produtos antes de registrar o pagamento.",
    );
  const payment = {
    id: randomUUID(),
    tabId: tab.id,
    method: data.method,
    amountCents: totalCents(tab.items),
    recordedBy: user.id,
    createdAt: new Date(),
  };
  await tx.payment.create({
    data: { ...payment, xml: makeNfceXml(tab, payment, fiscal) },
  });
  await tx.tab.update({
    where: { id: tab.id },
    data: { status: "PAID" },
  });
  await audit(tx, user, terminal, "PAYMENT_SIMULATED", tab.id, {
    method: data.method,
    amountCents: payment.amountCents,
  });
}
