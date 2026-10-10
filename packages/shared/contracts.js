import { z } from "zod";
const uuid = z.string().uuid();
const version = z.number().int().min(0);
export const envelope = z.object({
  id: uuid,
  action: z.string().max(50),
  token: z.string().max(128).optional(),
  commandId: uuid.optional(),
  data: z.unknown().optional(),
});
export const schemas = {
  login: z.object({
    username: z.string().trim().min(1).max(60),
    password: z.string().min(1).max(128),
    terminal: z.string().trim().min(1).max(80),
  }),
  "tabs.open": z.object({ tableNumber: z.number().int().min(1).max(1000) }),
  "tables.configure": z.object({ count: z.number().int().min(1).max(1000) }),
  "tabs.add": z.object({
    tabId: uuid,
    version,
    productId: uuid,
    quantity: z.number().int().min(1).max(99),
    weightGrams: z.number().int().min(1).max(100000).nullable().optional(),
    note: z.string().trim().max(240).default(""),
  }),
  "tabs.pay": z.object({
    tabId: uuid,
    version,
    method: z.enum(["PIX", "CARD"]),
  }),
  "tabs.update": z.object({
    tabId: uuid,
    version,
    itemId: uuid,
    quantity: z.number().int().min(1).max(99),
    weightGrams: z.number().int().min(1).max(100000).nullable().optional(),
    note: z.string().trim().max(240).default(""),
  }),
  "tabs.remove": z.object({ tabId: uuid, version, itemId: uuid }),
  "tabs.close": z.object({ tabId: uuid, version }),
  "tabs.xml": z.object({ tabId: uuid }),
  "products.save": z.object({
    id: uuid.optional(),
    name: z.string().trim().min(1).max(100),
    category: z.string().trim().min(1).max(60),
    priceCents: z.number().int().min(1).max(1_000_000),
    saleType: z.enum(["UNIT", "WEIGHT"]).default("UNIT"),
    active: z.boolean(),
  }),
  "users.create": z.object({
    name: z.string().trim().min(2).max(100),
    username: z
      .string()
      .trim()
      .regex(/^[a-zA-Z0-9._-]{3,60}$/),
    password: z.string().min(8).max(72),
    role: z.enum(["ADMIN", "ATTENDANT", "CASHIER"]),
  }),
};
