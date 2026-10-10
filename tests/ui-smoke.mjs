import { makeNfceXml } from "../apps/server/src/fiscal/nfce.js";
// Visual smoke test with an explicit in-memory fixture server, never production data.
// Real MySQL persistence and concurrent transactions are tested in tests/integration.
import { _electron as electron, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createTcpServer } from "../apps/server/src/tcp.js";
import { AppError } from "../apps/server/src/domain.js";
import { sumItems } from "../packages/shared/money.js";
const user = {
  id: randomUUID(),
  name: "Administrador",
  username: "admin",
  role: "ADMIN",
  active: true,
};
const products = [
  ["Buffet regular", "Buffet", 0],
  ["Buffet especial carnes", "Buffet", 0],
  ["Suco de laranja", "Bebidas", 950],
  ["Água mineral", "Bebidas", 500],
  ["Refrigerante lata", "Bebidas", 650],
  ["Café expresso", "Bebidas", 600],
].map(([name, category, priceCents]) => ({
  id: randomUUID(),
  name,
  category,
  priceCents,
  active: priceCents > 0,
  saleType: category === "Buffet" ? "WEIGHT" : "UNIT",
}));
const tabs = [
  {
    id: randomUUID(),
    number: 1,
    tableNumber: 1,
    label: "Mesa 01 · Ana",
    status: "OPEN",
    version: 0,
    openedAt: new Date().toISOString(),
    items: [],
  },
  {
    id: randomUUID(),
    number: 2,
    tableNumber: 2,
    label: "Mesa 02 · Carlos",
    status: "OPEN",
    version: 0,
    openedAt: new Date().toISOString(),
    items: [],
  },
  {
    id: randomUUID(),
    number: 3,
    tableNumber: 3,
    label: "Mesa 03",
    status: "PAID",
    version: 0,
    openedAt: new Date().toISOString(),
    items: [
      {
        id: randomUUID(),
        productName: products[2].name,
        unitPriceCents: products[2].priceCents,
        quantity: 1,
        note: "",
      },
    ],
    payment: {
      method: "CARD",
      amountCents: products[2].priceCents,
      createdAt: new Date().toISOString(),
    },
  },
];
let tableCount = 30;
const service = {
  isMutation: (action) =>
    [
      "tabs.open",
      "tabs.add",
      "tabs.update",
      "tabs.remove",
      "tables.configure",
      "products.save",
      "tabs.pay",
      "tabs.close",
    ].includes(action),
  async execute({ action, data }) {
    if (action === "login") {
      if (data.password !== "fixture-only")
        throw new AppError("INVALID_LOGIN", "Usuário ou senha incorretos.");
      user.role =
        data.username === "caixa"
          ? "CASHIER"
          : data.username === "atendente"
            ? "ATTENDANT"
            : "ADMIN";
      return { token: "fixture", user };
    }
    if (action === "snapshot")
      return {
        user,
        products,
        tables: Array.from({ length: tableCount }, (_, i) => ({
          number: i + 1,
          activeTabId:
            tabs.find((t) => t.tableNumber === i + 1 && t.status !== "CLOSED")
              ?.id ?? null,
        })),
        tabs: tabs.filter((t) => t.status !== "CLOSED"),
        history: tabs.filter((t) => t.status === "CLOSED"),
        users: [user],
        auditLogs: [],
      };
    if (action === "tabs.open") {
      const tab = {
        id: randomUUID(),
        number: tabs.length + 1,
        label: `Mesa ${String(data.tableNumber).padStart(2, "0")}`,
        tableNumber: data.tableNumber,
        status: "OPEN",
        version: 0,
        openedAt: new Date().toISOString(),
        items: [],
      };
      tabs.push(tab);
      return tab;
    }
    if (action === "tables.configure") {
      tableCount = data.count;
      return { count: tableCount };
    }
    if (action === "products.save") {
      const product = products.find((p) => p.id === data.id);
      Object.assign(product, data);
      return product;
    }
    const tab = tabs.find((t) => t.id === data?.tabId);
    if (action === "tabs.add") {
      const product = products.find((p) => p.id === data.productId);
      tab.items.push({
        id: randomUUID(),
        productName: product.name,
        unitPriceCents: product.priceCents,
        quantity: data.quantity,
        saleType: product.saleType,
        weightGrams: data.weightGrams ?? null,
        note: data.note,
      });
      tab.version++;
      return tab;
    }
    if (action === "tabs.update") {
      Object.assign(
        tab.items.find((item) => item.id === data.itemId),
        {
          quantity: data.quantity,
          weightGrams: data.weightGrams,
          note: data.note,
        },
      );
      tab.version++;
      return tab;
    }
    if (action === "tabs.remove") {
      tab.items = tab.items.filter((item) => item.id !== data.itemId);
      tab.version++;
      return tab;
    }
    if (action === "tabs.pay") {
      tab.payment = {
        method: data.method,
        amountCents: sumItems(tab.items),
        createdAt: new Date().toISOString(),
      };
      tab.status = "PAID";
      tab.version++;
      return tab;
    }
    if (action === "tabs.close") {
      tab.status = "CLOSED";
      tab.closedAt = new Date().toISOString();
      tab.version++;
      return tab;
    }
    if (action === "tabs.xml")
      return {
        filename: "fixture.xml",
        xml: makeNfceXml(tab, {
          ...tab.payment,
          createdAt: new Date(tab.payment.createdAt),
        }),
      };
    return {};
  },
};
const server = createTcpServer(service);
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
await mkdir("artifacts", { recursive: true });
let app;
try {
  app = await electron.launch({
    ...(process.env.RESTAURANT_TEST_EXE
      ? { executablePath: process.env.RESTAURANT_TEST_EXE }
      : {}),
    args: [
      ...(process.env.RESTAURANT_TEST_EXE ? [] : ["."]),
      `--user-data-dir=${path.resolve("artifacts/ui-test-profile")}`,
    ],
    env: { ...process.env, ELECTRON_DEV: "0" },
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await expect(
    page.getByRole("heading", { name: "Entrar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("MesaCerta", { exact: true })).toBeVisible();
  await page.screenshot({ path: "artifacts/login.png" });
  await page.getByLabel("Usuário", { exact: true }).fill("admin");
  await page.getByLabel("Senha", { exact: true }).fill("fixture-only");
  await page.getByLabel("Identificação do terminal").fill("Terminal de teste");
  await page.getByRole("button", { name: /Servidor/ }).click();
  await page
    .getByLabel("Porta", { exact: true })
    .fill(String(server.address().port));
  await page.getByRole("button", { name: "Entrar no sistema" }).click();
  await expect(
    page.getByRole("heading", { name: "Mesas", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/fichas.png" });
  await expect(page.locator(".table-tile")).toHaveCount(30);
  await page.getByRole("button", { name: "Gerenciar mesas" }).click();
  await page.getByLabel("Quantidade de mesas").fill("31");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.locator(".table-tile")).toHaveCount(31);
  await page
    .getByRole("button", { name: "Mesa 5 · Livre", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Mesa 05", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Buffet regular/ }).click();
  await expect(page.getByText("Nenhum item lançado.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adicionar", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Definir preço", exact: true })
    .click();
  await page.getByLabel("Preço por kg (R$)").fill("65.90");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar produto", exact: true })
    .click();
  await page.getByLabel("Quantidade (kg)", { exact: true }).fill("0.350");
  await page.getByLabel("Observação", { exact: true }).fill("Teste buffet");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByText("0,350 kg", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Quantidade (kg)", { exact: true })).toHaveValue(
    "",
  );
  await page
    .getByRole("button", { name: "Editar Buffet regular", exact: true })
    .click();
  await page.getByRole("dialog").getByLabel("Quantidade (kg)").fill("0.500");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar", exact: true })
    .click();
  await expect(page.getByText("0,500 kg", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Água mineral/ }).click();
  await page.getByLabel("Quantidade", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page
    .getByRole("button", { name: "Remover Água mineral", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Remover", exact: true })
    .click();
  await expect(page.locator(".order-table tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: /^Buffet regular/ }).click();
  await expect(page.getByLabel("Observação", { exact: true })).toHaveValue("");
  await app.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0].setSize(1280, 800);
  });
  await expect(
    page.getByRole("button", { name: "Ir ao caixa", exact: true }),
  ).toBeInViewport();
  if (
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
  )
    throw new Error("Interface com rolagem horizontal.");
  await page.screenshot({ path: "artifacts/pedido.png" });
  await expect(
    page.getByRole("button", { name: "Pagar", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Ir ao caixa", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Pagamento · Mesa 05", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Adicionar", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Editar Buffet regular", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "artifacts/caixa.png" });
  await page.getByRole("button", { name: "Pagar", exact: true }).click();
  await page.getByLabel("Pix", { exact: true }).check();
  await page.getByRole("button", { name: "Registrar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Salvar XML", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/pagamento.png" });
  await page.getByRole("button", { name: "Encerrar ficha" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Encerrar ficha" })
    .click();
  await expect(page.getByText("Encerrada", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mesas", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Mesa 5 · Livre", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Histórico", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mesa 05", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Produtos", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Buffet regular", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo produto" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Usuários", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "admin", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Novo usuário", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Senha inicial"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: "Atividades", exact: true }).click();
  await expect(
    page.getByRole("columnheader", { name: "Terminal", exact: true }),
  ).toBeVisible();
  for (const username of ["caixa", "atendente"]) {
    await page.getByRole("button", { name: "Sair", exact: true }).click();
    await page.getByLabel("Usuário", { exact: true }).fill(username);
    await page.getByLabel("Senha", { exact: true }).fill("fixture-only");
    await page.getByRole("button", { name: "Entrar no sistema" }).click();
    await expect(
      page.getByRole("button", { name: "Gerenciar mesas" }),
    ).toHaveCount(0);
    await page
      .getByRole("button", { name: "Mesa 1 · Ocupada", exact: true })
      .click();
    await page.getByRole("button", { name: /Água mineral/ }).click();
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Editar Água mineral", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Pagar", exact: true }),
    ).toHaveCount(0);
    if (username === "caixa") {
      await page
        .getByRole("button", { name: "Ir ao caixa", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Pagar", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Adicionar", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Voltar ao pedido", exact: true })
        .click();
    } else
      await expect(
        page.getByRole("button", { name: "Caixa", exact: true }),
      ).toHaveCount(0);
    await page.getByRole("button", { name: /^Buffet especial carnes/ }).click();
    await expect(
      page.getByText("Solicite a configuração ao administrador."),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Adicionar", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Remover Água mineral", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remover", exact: true })
      .click();
    await expect(page.getByText("Nenhum item lançado.")).toBeVisible();
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "UI smoke: mesas, buffet por peso, botão Adicionar, edição, remoção, pagamento e permissões dos três perfis passaram. Fixture TCP; sem MySQL.",
  );
} finally {
  if (app) await app.close();
  server.disconnectClients();
  await new Promise((resolve) => server.close(resolve));
}
