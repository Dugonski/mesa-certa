// Offline maintenance only. Backup is flushed and re-read before any deletion.
import net from "node:net";
import path from "node:path";
import { mkdir, open, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { loadConfig } from "../apps/server/src/config/index.js";
import { createDatabase } from "../apps/server/src/database/client.js";

if (!process.argv.includes("--confirm-reset-fichas")) {
  throw new Error(
    "Requer --confirm-reset-fichas. Pare o servidor antes de executar.",
  );
}
const config = loadConfig();
const probe = net.createServer();
await new Promise((resolve, reject) => {
  probe.once("error", () =>
    reject(new Error("Pare o servidor TCP antes da limpeza.")),
  );
  // Hold the application port for the entire maintenance window.
  probe.listen(config.port, config.host, resolve);
});
const db = createDatabase(config.databaseUrl);
const digest = (text) => createHash("sha256").update(text).digest("hex");
const backupDir = path.resolve("backups");
const backupPath = path.join(
  backupDir,
  `fichas-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
);
const writeVerified = async (file, text) => {
  const handle = await open(file, "wx");
  try {
    await handle.writeFile(text, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  assert.equal(
    digest(await readFile(file, "utf8")),
    digest(text),
    "Falha ao verificar o backup",
  );
};
try {
  await mkdir(backupDir, { recursive: true });
  const report = await db.$transaction(
    async (tx) => {
      const tabs = await tx.tab.findMany();
      const items = await tx.tabItem.findMany();
      const payments = await tx.payment.findMany();
      const tables = await tx.diningTable.findMany({
        orderBy: { number: "asc" },
      });
      const audit = await tx.auditLog.findMany();
      const receipts = await tx.commandReceipt.findMany();
      const ids = new Set(tabs.map((tab) => tab.id));
      const relatedAudit = audit.filter(
        (log) =>
          ids.has(log.entityId) ||
          [
            "TAB_OPENED",
            "ITEM_ADDED",
            "ITEM_UPDATED",
            "ITEM_REMOVED",
            "PAYMENT_SIMULATED",
            "TAB_CLOSED",
          ].includes(log.action),
      );
      const relatedReceipts = receipts.filter(
        (row) =>
          ids.has(row.result?.id) ||
          ids.has(row.result?.tabId) ||
          (row.result?.number != null &&
            ["OPEN", "PAID", "CLOSED"].includes(row.result?.status)),
      );
      // Digests verify preservation without copying account credentials to the backup.
      const usersHash = digest(
        JSON.stringify(await tx.user.findMany({ orderBy: { id: "asc" } })),
      );
      const productsHash = digest(
        JSON.stringify(await tx.product.findMany({ orderBy: { id: "asc" } })),
      );
      const backup = {
        format: "mesacerta-orders-backup-v1",
        createdAt: new Date(),
        database: new URL(config.databaseUrl).pathname.slice(1),
        tabs,
        items,
        payments,
        tables,
        audit: relatedAudit,
        receipts: relatedReceipts,
      };
      const text = JSON.stringify(backup, null, 2);
      await writeVerified(backupPath, text);
      await writeVerified(backupPath + ".sha256", digest(text) + "\n");
      await tx.diningTable.updateMany({ data: { activeTabId: null } });
      await tx.auditLog.deleteMany({
        where: { id: { in: relatedAudit.map((r) => r.id) } },
      });
      await tx.commandReceipt.deleteMany({
        where: { id: { in: relatedReceipts.map((r) => r.id) } },
      });
      await tx.payment.deleteMany();
      await tx.tabItem.deleteMany();
      await tx.tab.deleteMany();
      assert.equal(await tx.tab.count(), 0);
      assert.equal(await tx.tabItem.count(), 0);
      assert.equal(await tx.payment.count(), 0);
      assert.equal(
        await tx.diningTable.count({ where: { activeTabId: { not: null } } }),
        0,
      );
      assert.equal(
        await tx.auditLog.count(),
        audit.length - relatedAudit.length,
      );
      assert.equal(
        await tx.commandReceipt.count(),
        receipts.length - relatedReceipts.length,
      );
      assert.deepEqual(
        await tx.diningTable.findMany({ orderBy: { number: "asc" } }),
        tables.map((t) => ({ ...t, activeTabId: null })),
      );
      assert.equal(
        digest(
          JSON.stringify(await tx.user.findMany({ orderBy: { id: "asc" } })),
        ),
        usersHash,
      );
      assert.equal(
        digest(
          JSON.stringify(await tx.product.findMany({ orderBy: { id: "asc" } })),
        ),
        productsHash,
      );
      return {
        removed: {
          tabs: tabs.length,
          items: items.length,
          payments: payments.length,
          audit: relatedAudit.length,
          receipts: relatedReceipts.length,
        },
        freeTables: tables.filter((t) => t.active).length,
        backup: backupPath,
      };
    },
    { isolationLevel: "Serializable", maxWait: 5000, timeout: 60000 },
  );
  // MySQL ALTER TABLE implicitly commits: run only after the data transaction,
  // while the TCP port is still reserved and no application clients can write.
  await db.$executeRawUnsafe("ALTER TABLE `Tab` AUTO_INCREMENT = 1");
  const counters =
    await db.$queryRaw`SELECT AUTO_INCREMENT AS nextNumber FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='Tab'`;
  assert.equal(Number(counters[0].nextNumber), 1);
  console.log(JSON.stringify({ ...report, nextTabNumber: 1 }, null, 2));
} finally {
  await db.$disconnect();
  await new Promise((resolve) => probe.close(resolve));
}
