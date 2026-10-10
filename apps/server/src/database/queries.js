export const serialize = (value) => JSON.parse(JSON.stringify(value));
export const includeTab = {
  items: { orderBy: { createdAt: "asc" } },
  payment: {
    select: { id: true, method: true, amountCents: true, createdAt: true },
  },
};

export const findTab = (tx, id) =>
  tx.tab.findUnique({ where: { id }, include: includeTab });
export const findTabForChange = (tx, id) =>
  tx.tab.findUnique({
    where: { id },
    include: { items: { orderBy: { createdAt: "asc" } }, payment: true },
  });
