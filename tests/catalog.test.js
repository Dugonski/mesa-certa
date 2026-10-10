import { test } from "node:test";
import assert from "node:assert/strict";
import { kgToGrams, inCatalog } from "../packages/shared/catalog.js";
test("quantidade em kg converte exatamente para gramas e rejeita precisão inválida", () => {
  for (const [value, expected] of [
    ["0.350", 350],
    ["0,350", 350],
    ["1", 1000],
    ["0.001", 1],
    ["100", 100000],
  ])
    assert.equal(kgToGrams(value), expected);
  for (const value of ["0", "-1", "100.001", "0.0005", "NaN", ""])
    assert.equal(kgToGrams(value), null);
});
test("catálogo inclui buffet aguardando preço e oculta produtos desativados com preço", () => {
  assert.equal(
    inCatalog({ saleType: "WEIGHT", priceCents: 0, active: false }),
    true,
  );
  assert.equal(
    inCatalog({ saleType: "WEIGHT", priceCents: 5000, active: false }),
    false,
  );
  assert.equal(
    inCatalog({ saleType: "UNIT", priceCents: 500, active: true }),
    true,
  );
});
