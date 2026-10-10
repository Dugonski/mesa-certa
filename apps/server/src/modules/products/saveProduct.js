import { audit } from "../audit/index.js";
export async function saveProduct({ tx, user, terminal, data, passwordHash }) {
  let result;
  const { id, ...fields } = data;
  result = id
    ? await tx.product.update({ where: { id }, data: fields })
    : await tx.product.create({ data: fields });
  await audit(
    tx,
    user,
    terminal,
    id ? "PRODUCT_UPDATED" : "PRODUCT_CREATED",
    result.id,
    fields,
  );

  return result;
}
