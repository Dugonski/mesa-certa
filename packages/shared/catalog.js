export const needsPrice = (product) =>
  product.saleType === "WEIGHT" && product.priceCents === 0;
export const inCatalog = (product) => product.active || needsPrice(product);
export function kgToGrams(value) {
  const text = String(value).trim().replace(",", ".");
  if (!/^(?:\d+|\d*\.\d{1,3})$/.test(text)) return null;
  const [whole = "0", decimals = ""] = text.split(".");
  const grams = Number(whole) * 1000 + Number(decimals.padEnd(3, "0"));
  return Number.isSafeInteger(grams) && grams >= 1 && grams <= 100000
    ? grams
    : null;
}
export const formatKg = (grams) =>
  (grams / 1000).toLocaleString("pt-BR", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  });
