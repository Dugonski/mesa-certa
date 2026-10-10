import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Only prepares local files. Execute the generated SQL using an authenticated
// administrator connection in MySQL Workbench; no root password is needed here.
const directory = new URL("../artifacts/", import.meta.url);
const sqlPath = new URL("preparar-mysql.sql", directory);
const envPath = new URL("../.env", import.meta.url);
const username = `restaurante_${randomBytes(3).toString("hex")}`;
const password = randomBytes(24).toString("hex");
const sql = `-- Execute este arquivo completo na conexão local do MySQL Workbench.
-- Não altera o usuário root nem apaga dados existentes.
-- Este arquivo contém uma credencial: não o compartilhe.
CREATE DATABASE IF NOT EXISTS restaurante CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER '${username}'@'localhost' IDENTIFIED BY '${password}';
CREATE USER '${username}'@'127.0.0.1' IDENTIFIED BY '${password}';
GRANT ALL PRIVILEGES ON restaurante.* TO '${username}'@'localhost';
GRANT ALL PRIVILEGES ON restaurante.* TO '${username}'@'127.0.0.1';
SELECT 'Acesso da aplicação preparado.' AS resultado;
`;
const env = await readFile(envPath, "utf8");
const connection = `DATABASE_URL="mysql://${username}:${password}@127.0.0.1:3306/restaurante"`;
const next = /^DATABASE_URL=.*$/m.test(env)
  ? env.replace(/^DATABASE_URL=.*$/m, connection)
  : `${env}\n${connection}\n`;
await mkdir(directory, { recursive: true });
await writeFile(sqlPath, sql, { encoding: "utf8", flag: "wx" });
await writeFile(envPath, next, "utf8");
console.log(
  "SQL preparado em artifacts/preparar-mysql.sql e .env atualizado. Nenhuma alteração no MySQL foi executada.",
);
