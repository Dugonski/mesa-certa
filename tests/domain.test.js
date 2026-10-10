import { makeNfceXml } from "../apps/server/src/fiscal/nfce.js";
import { schemas } from "../packages/shared/contracts.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  assertTab,
  totalCents,
  requirePermission,
  itemMeasures,
} from "../apps/server/src/domain.js";
import framing from "../packages/shared/framing.cjs";

test("buffet usa gramas inteiras e arredonda cada item para centavos", () => {
  assert.equal(
    totalCents([
      {
        saleType: "WEIGHT",
        weightGrams: 250,
        quantity: 1,
        unitPriceCents: 6590,
      },
    ]),
    1648,
  );
  assert.equal(
    totalCents([
      {
        saleType: "WEIGHT",
        weightGrams: 333,
        quantity: 1,
        unitPriceCents: 6590,
      },
    ]),
    2194,
  );
  assert.throws(() => itemMeasures("WEIGHT", { quantity: 1 }), {
    code: "VALIDATION",
  });
  assert.throws(
    () => itemMeasures("WEIGHT", { quantity: 2, weightGrams: 300 }),
    { code: "VALIDATION" },
  );
  assert.throws(() => itemMeasures("UNIT", { quantity: 1, weightGrams: 300 }), {
    code: "VALIDATION",
  });
  assert.throws(
    () => itemMeasures("WEIGHT", { quantity: 1, weightGrams: -1 }),
    { code: "VALIDATION" },
  );
});

test("totais são calculados em centavos sem perda de precisão", () => {
  assert.equal(
    totalCents([
      { quantity: 3, unitPriceCents: 3290 },
      { quantity: 2, unitPriceCents: 650 },
    ]),
    11170,
  );
  assert.throws(
    () => totalCents([{ quantity: 9999999, unitPriceCents: 9999999 }]),
    /limite/,
  );
});
test("permissões são verificadas no servidor", () => {
  assert.throws(() => requirePermission({ role: "ATTENDANT" }, "tabs.pay"), {
    code: "FORBIDDEN",
  });
  assert.throws(
    () => requirePermission({ role: "CASHIER" }, "products.write"),
    { code: "FORBIDDEN" },
  );
  assert.doesNotThrow(() =>
    requirePermission({ role: "ADMIN" }, "users.write"),
  );
});
test("fichas pagas e versões desatualizadas rejeitam alterações", () => {
  assert.throws(() => assertTab({ status: "PAID", version: 2 }, 2), {
    code: "INVALID_STATE",
  });
  assert.throws(() => assertTab({ status: "OPEN", version: 2 }, 1), {
    code: "CONFLICT",
  });
  assert.doesNotThrow(() =>
    assertTab({ status: "PAID", version: 2 }, 2, "PAID"),
  );
});
test("validação recusa quantidades negativas, valores fracionários e forma não suportada", () => {
  const input = {
    tabId: "0d033e41-72e2-485f-9178-16a56de2aa32",
    productId: "0d033e41-72e2-485f-9178-16a56de2aa33",
    version: 1,
  };
  assert.equal(
    schemas["tabs.add"].safeParse({ ...input, quantity: -1 }).success,
    false,
  );
  assert.equal(
    schemas["tabs.add"].safeParse({ ...input, quantity: 1.5 }).success,
    false,
  );
  assert.equal(
    schemas["tabs.pay"].safeParse({ ...input, method: "CASH" }).success,
    false,
  );
});
test("XML usa estrutura NFC-e 4.00 de pré-autorização sem assinatura ou protocolo", () => {
  const xml = makeNfceXml(
    {
      number: 1,
      label: 'Ana & João "A"',
      items: [
        {
          productName: "Café <especial>",
          unitPriceCents: 650,
          quantity: 2,
          note: "A&B",
        },
      ],
    },
    {
      createdAt: new Date("2026-01-01T12:00:00Z"),
      method: "PIX",
      amountCents: 1300,
    },
  );
  assert.match(xml, /<NFe xmlns="http:\/\/www\.portalfiscal\.inf\.br\/nfe">/);
  assert.match(xml, /<infNFe Id="NFe\d{44}" versao="4.00">/);
  assert.match(xml, /<mod>65<\/mod>/);
  assert.match(xml, /<tpAmb>2<\/tpAmb>/);
  assert.match(xml, /Ficha 1 - Ana &amp; João &quot;A&quot;/);
  assert.match(xml, /Café &lt;especial&gt;/);
  assert.match(xml, /<vNF>13.00<\/vNF>/);
  assert.match(xml, /<tPag>17<\/tPag>/);
  assert.doesNotMatch(xml, /<Signature|<protNFe|<nProt>/);
});
test("TCP aceita mensagens fragmentadas, agrupadas e Unicode dividido entre pacotes", () => {
  const received = [];
  const decoder = framing.createDecoder(
    (value) => received.push(value),
    (error) => {
      throw error;
    },
  );
  const encoded = Buffer.from(
    framing.encode({ text: "Pão 🍞" }) + framing.encode({ number: 2 }),
  );
  for (let i = 0; i < encoded.length; i++) decoder(encoded.subarray(i, i + 1));
  assert.deepEqual(received, [{ text: "Pão 🍞" }, { number: 2 }]);
});
test("TCP encerra frames inválidos e excessivos", () => {
  let failed = 0;
  framing.createDecoder(
    () => assert.fail(),
    () => failed++,
  )(Buffer.from("{invalid}\n"));
  framing.createDecoder(
    () => assert.fail(),
    () => failed++,
  )(Buffer.alloc(framing.MAX_FRAME_BYTES + 1, 65));
  assert.equal(failed, 2);
});
