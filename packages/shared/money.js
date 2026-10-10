// All money stays in integer cents. Weight is in integer grams.
// Round once per weighed item, half a cent upwards.
export function itemTotalCents(item) {
  return item.saleType === "WEIGHT"
    ? Math.floor((item.unitPriceCents * item.weightGrams + 500) / 1000)
    : item.quantity * item.unitPriceCents;
}
export const sumItems = (items) =>
  items.reduce((sum, item) => sum + itemTotalCents(item), 0);
