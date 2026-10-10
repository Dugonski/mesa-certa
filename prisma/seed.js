import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const db = new PrismaClient();
const users = [
  {
    username: "admin",
    name: "Administrador",
    role: "ADMIN",
    password: process.env.SEED_ADMIN_PASSWORD,
  },
  {
    username: "atendente",
    name: "Atendente",
    role: "ATTENDANT",
    password: process.env.SEED_ATTENDANT_PASSWORD,
  },
  {
    username: "caixa",
    name: "Caixa",
    role: "CASHIER",
    password: process.env.SEED_CASHIER_PASSWORD,
  },
];
try {
  for (const user of users) {
    if (await db.user.findUnique({ where: { username: user.username } }))
      continue;
    if (!user.password || user.password.length < 8 || user.password.length > 72)
      throw new Error(
        `Defina a senha de ${user.username} no .env (8 a 72 caracteres).`,
      );
  }
  await db.$transaction(
    async (tx) => {
      for (const { password, ...user } of users) {
        if (!(await tx.user.findUnique({ where: { username: user.username } })))
          await tx.user.create({
            data: { ...user, passwordHash: await bcrypt.hash(password, 12) },
          });
      }
      for (const product of [
        { name: "Suco de laranja", category: "Bebidas", priceCents: 950 },
        { name: "Água mineral", category: "Bebidas", priceCents: 500 },
        { name: "Refrigerante lata", category: "Bebidas", priceCents: 650 },
        { name: "Café expresso", category: "Bebidas", priceCents: 600 },
      ]) {
        if (!(await tx.product.findFirst({ where: { name: product.name } })))
          await tx.product.create({ data: product });
      }
    },
    { timeout: 20000 },
  );
  console.log(
    "Usuários e produtos de demonstração preparados. Registros existentes foram preservados.",
  );
} finally {
  await db.$disconnect();
}
