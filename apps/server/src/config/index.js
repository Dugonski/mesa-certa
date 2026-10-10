import { z } from "zod";
import { fiscalConfigFromEnv } from "../fiscal/nfce.js";

const environment = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("mysql://")),
  SERVER_HOST: z.string().trim().min(1).default("127.0.0.1"),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(5050),
});

export function loadConfig(env = process.env) {
  const parsed = environment.safeParse(env);
  if (!parsed.success) {
    const fields = [
      ...new Set(parsed.error.issues.map((issue) => issue.path.join("."))),
    ];
    throw new Error(
      `Configuração inválida: ${fields.join(", ")}. Confira o .env.`,
    );
  }
  return {
    databaseUrl: parsed.data.DATABASE_URL,
    host: parsed.data.SERVER_HOST,
    port: parsed.data.SERVER_PORT,
    fiscal: fiscalConfigFromEnv(env),
  };
}
