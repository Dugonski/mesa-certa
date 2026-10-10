import { createDatabase } from "./database/client.js";
import { loadConfig } from "./config/index.js";
import { createService } from "./service.js";
import { createTcpServer } from "./transport/tcp.js";
const config = loadConfig();
const db = createDatabase(config.databaseUrl);
await db.$connect();
const server = createTcpServer(createService(db, { fiscal: config.fiscal }));
server.on("error", (error) => {
  console.error("Servidor TCP:", error.message);
  process.exitCode = 1;
});
server.listen(config.port, config.host, () => {
  console.log(`Servidor TCP pronto em ${config.host}:${config.port}`);
});
async function shutdown() {
  server.disconnectClients();
  server.close();
  await db.$disconnect();
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
