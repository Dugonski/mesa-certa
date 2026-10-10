import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../apps/server/src/config/index.js";
test("configuração rejeita porta e URL inválidas sem expor credenciais", () => {
  const databaseUrl = "mysql://user:secret-password@localhost:3306/test";
  assert.equal(loadConfig({ DATABASE_URL: databaseUrl }).port, 5050);
  for (const env of [
    { DATABASE_URL: databaseUrl, SERVER_PORT: "70000" },
    { DATABASE_URL: "postgres://user:secret-password@localhost/test" },
  ]) {
    assert.throws(
      () => loadConfig(env),
      (error) => {
        assert.doesNotMatch(error.message, /secret-password/);
        return /Configuração inválida/.test(error.message);
      },
    );
  }
});
