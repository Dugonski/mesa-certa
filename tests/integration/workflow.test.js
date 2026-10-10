import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createService } from "../../apps/server/src/service.js";
import { createTcpServer } from "../../apps/server/src/tcp.js";
import clientModule from "../../apps/desktop/electron/client.cjs";

test("MySQL + dois terminais TCP: permissões, concorrência, pagamento, XML e histórico", async () => {
  const db = new PrismaClient();
  const suffix = randomUUID().slice(0, 8);
  const userIds = [],
    tabIds = [],
    productIds = [];
  const clients = [];
  const server = createTcpServer(createService(db));
  try {
    const password = randomUUID();
    for (const role of ["ADMIN", "ATTENDANT", "CASHIER"]) {
      const user = await db.user.create({
        data: {
          username: `test-${role}-${suffix}`,
          name: `Teste ${suffix}`,
          role,
          passwordHash: await bcrypt.hash(password, 4),
        },
      });
      userIds.push(user.id);
    }
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    let notifications = 0;
    for (const role of ["ADMIN", "ATTENDANT", "CASHIER"]) {
      const client = new clientModule.TcpClient((event) => {
        if (event.event === "changed") notifications++;
      });
      clients.push(client);
      await client.connect("127.0.0.1", server.address().port);
      const login = await client.request("login", {
        username: `test-${role}-${suffix}`,
        password,
        terminal: `Teste-${role}`,
      });
      client.token = login.token;
    }
    const [admin, attendant, cashier] = clients;
    const initialCount = (await admin.request("snapshot")).tables.length;
    if (initialCount < 1000) {
      try {
        await admin.request(
          "tables.configure",
          { count: initialCount + 1 },
          randomUUID(),
        );
        assert.equal(
          (await admin.request("snapshot")).tables.length,
          initialCount + 1,
        );
      } finally {
        await admin.request(
          "tables.configure",
          { count: initialCount },
          randomUUID(),
        );
      }
      assert.equal(
        (await admin.request("snapshot")).tables.length,
        initialCount,
      );
    }
    const product = await admin.request(
      "products.save",
      {
        name: `Produto teste ${suffix}`,
        category: "Teste",
        priceCents: 1234,
        active: true,
      },
      randomUUID(),
    );
    productIds.push(product.id);
    const free = await db.diningTable.findFirst({
      where: { active: true, activeTabId: null },
      orderBy: { number: "desc" },
    });
    assert.ok(free, "Precisa de uma mesa livre para o teste de integração.");
    await assert.rejects(
      cashier.request("tables.configure", { count: 30 }, randomUUID()),
      { code: "FORBIDDEN" },
    );
    const opening = await Promise.allSettled([
      attendant.request(
        "tabs.open",
        { tableNumber: free.number },
        randomUUID(),
      ),
      cashier.request("tabs.open", { tableNumber: free.number }, randomUUID()),
    ]);
    for (const result of opening)
      if (result.status === "fulfilled") tabIds.push(result.value.id);
    assert.equal(
      opening.filter((result) => result.status === "fulfilled").length,
      1,
      "Uma mesa só pode ter uma ficha ativa.",
    );
    assert.equal(
      opening.find((result) => result.status === "rejected").reason.code,
      "CONFLICT",
    );
    const tab = opening.find((result) => result.status === "fulfilled").value;
    if (free.number > 1)
      await assert.rejects(
        admin.request(
          "tables.configure",
          { count: free.number - 1 },
          randomUUID(),
        ),
        { code: "CONFLICT" },
      );
    await assert.rejects(
      attendant.request(
        "tables.configure",
        { count: free.number },
        randomUUID(),
      ),
      { code: "FORBIDDEN" },
    );
    assert.equal(tab.tableNumber, free.number);
    assert.equal(
      (await cashier.request("snapshot")).tables.find(
        (table) => table.number === free.number,
      ).activeTabId,
      tab.id,
    );
    assert.ok(
      (await cashier.request("snapshot")).tabs.some((t) => t.id === tab.id),
    );
    await assert.rejects(
      attendant.request(
        "tabs.pay",
        { tabId: tab.id, version: 0, method: "PIX" },
        randomUUID(),
      ),
      { code: "FORBIDDEN" },
    );
    await assert.rejects(
      cashier.request(
        "products.save",
        {
          name: "Não permitido",
          category: "Bebidas",
          priceCents: 100,
          active: true,
        },
        randomUUID(),
      ),
      { code: "FORBIDDEN" },
    );
    const payload = {
      tabId: tab.id,
      version: 0,
      productId: product.id,
      quantity: 2,
      note: "Sem açúcar & gelo",
    };
    const commandId = randomUUID();
    const first = await cashier.request("tabs.add", payload, commandId);
    const replay = await cashier.request("tabs.add", payload, commandId);
    assert.equal(replay.version, first.version);
    assert.equal(replay.items.length, 1);
    // Concurrent changes from different sockets: exactly one can commit this version.
    const race = await Promise.allSettled([
      attendant.request(
        "tabs.add",
        { ...payload, version: first.version },
        randomUUID(),
      ),
      admin.request(
        "tabs.add",
        { ...payload, version: first.version },
        randomUUID(),
      ),
    ]);
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(
      race.find((r) => r.status === "rejected").reason.code,
      "CONFLICT",
    );
    let latest = (await cashier.request("snapshot")).tabs.find(
      (t) => t.id === tab.id,
    );
    assert.equal(latest.items.length, 2);
    const draft = await db.product.create({
      data: {
        name: `Buffet teste ${suffix}`,
        category: "Buffet",
        saleType: "WEIGHT",
        priceCents: 0,
        active: false,
      },
    });
    productIds.push(draft.id);
    for (const client of [attendant, cashier]) {
      assert.ok(
        (await client.request("snapshot")).products.some(
          (p) => p.id === draft.id,
        ),
      );
      await assert.rejects(
        client.request(
          "tabs.add",
          {
            tabId: tab.id,
            version: latest.version,
            productId: draft.id,
            quantity: 1,
            weightGrams: 350,
          },
          randomUUID(),
        ),
      );
    }
    const weighted = await admin.request(
      "products.save",
      {
        id: draft.id,
        name: `Buffet teste ${suffix}`,
        category: "Buffet",
        saleType: "WEIGHT",
        priceCents: 6590,
        active: true,
      },
      randomUUID(),
    );
    await assert.rejects(
      cashier.request(
        "tabs.add",
        {
          tabId: tab.id,
          version: latest.version,
          productId: weighted.id,
          quantity: 1,
        },
        randomUUID(),
      ),
      { code: "VALIDATION" },
    );
    latest = await cashier.request(
      "tabs.add",
      {
        tabId: tab.id,
        version: latest.version,
        productId: weighted.id,
        quantity: 1,
        weightGrams: 250,
      },
      randomUUID(),
    );
    const weightedItem = latest.items.find(
      (item) => item.productId === weighted.id,
    );
    latest = await attendant.request(
      "tabs.update",
      {
        tabId: tab.id,
        version: latest.version,
        itemId: weightedItem.id,
        quantity: 1,
        weightGrams: 333,
        note: "Peso corrigido",
      },
      randomUUID(),
    );
    latest = await cashier.request(
      "tabs.update",
      {
        tabId: tab.id,
        version: latest.version,
        itemId: latest.items[0].id,
        quantity: 3,
        note: "Sem açúcar & gelo",
      },
      randomUUID(),
    );
    const removedItem = latest.items[1];
    const staleVersion = latest.version;
    const removalId = randomUUID();
    const removal = {
      tabId: tab.id,
      version: latest.version,
      itemId: removedItem.id,
    };
    latest = await attendant.request("tabs.remove", removal, removalId);
    const repeated = await attendant.request("tabs.remove", removal, removalId);
    assert.equal(repeated.version, latest.version);
    assert.equal(latest.items.length, 2);
    await assert.rejects(
      cashier.request(
        "tabs.remove",
        { ...removal, itemId: weightedItem.id, version: staleVersion },
        randomUUID(),
      ),
      { code: "CONFLICT" },
    );
    await admin.request(
      "products.save",
      {
        id: product.id,
        name: product.name,
        category: "Teste",
        priceCents: 9999,
        active: true,
      },
      randomUUID(),
    );
    const paid = await cashier.request(
      "tabs.pay",
      { tabId: tab.id, version: latest.version, method: "PIX" },
      randomUUID(),
    );
    assert.equal(paid.payment.amountCents, 5896);
    const xml = await cashier.request("tabs.xml", { tabId: tab.id });
    assert.match(xml.xml, /<vNF>58.96<\/vNF>/);
    assert.match(xml.xml, /<qCom>0.3330<\/qCom>/);
    assert.match(xml.xml, /<vUnCom>65.9000000000<\/vUnCom>/);
    assert.match(xml.xml, /<mod>65<\/mod>/);
    assert.match(xml.xml, /<tpAmb>2<\/tpAmb>/);
    assert.match(xml.xml, /Sem açúcar &amp; gelo/);
    await assert.rejects(
      admin.request(
        "tabs.add",
        { ...payload, version: paid.version },
        randomUUID(),
      ),
      { code: "INVALID_STATE" },
    );
    await assert.rejects(
      attendant.request(
        "tabs.remove",
        { tabId: tab.id, version: paid.version, itemId: weightedItem.id },
        randomUUID(),
      ),
      { code: "INVALID_STATE" },
    );
    await assert.rejects(
      cashier.request(
        "tabs.update",
        {
          tabId: tab.id,
          version: paid.version,
          itemId: weightedItem.id,
          quantity: 1,
          weightGrams: 100,
        },
        randomUUID(),
      ),
      { code: "INVALID_STATE" },
    );
    const closed = await cashier.request(
      "tabs.close",
      { tabId: tab.id, version: paid.version },
      randomUUID(),
    );
    assert.equal(closed.status, "CLOSED");
    assert.equal(
      (await db.diningTable.findUnique({ where: { number: free.number } }))
        .activeTabId,
      null,
    );
    const next = await attendant.request(
      "tabs.open",
      { tableNumber: free.number },
      randomUUID(),
    );
    tabIds.push(next.id);
    assert.notEqual(
      next.id,
      tab.id,
      "Novo atendimento preserva a ficha anterior.",
    );
    assert.ok(
      (await cashier.request("snapshot")).history.some((t) => t.id === tab.id),
    );
    assert.ok(notifications > 0);
    assert.ok((await db.auditLog.count({ where: { entityId: tab.id } })) >= 5);
  } finally {
    for (const client of clients) client.disconnect();
    server.disconnectClients();
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    // Clean up only records created by this test, never the user's data.
    await db.commandReceipt.deleteMany({ where: { userId: { in: userIds } } });
    await db.auditLog.deleteMany({ where: { userId: { in: userIds } } });
    await db.payment.deleteMany({ where: { tabId: { in: tabIds } } });
    await db.tabItem.deleteMany({ where: { tabId: { in: tabIds } } });
    await db.tab.deleteMany({ where: { id: { in: tabIds } } });
    await db.product.deleteMany({ where: { id: { in: productIds } } });
    await db.session.deleteMany({ where: { userId: { in: userIds } } });
    await db.user.deleteMany({ where: { id: { in: userIds } } });
    await db.$disconnect();
  }
});
