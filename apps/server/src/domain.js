import { can } from "../../../packages/shared/permissions.js";
import { sumItems } from "../../../packages/shared/money.js";

export class AppError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
export function requirePermission(user, permission) {
  if (!can(user.role, permission))
    throw new AppError(
      "FORBIDDEN",
      "Seu perfil não tem permissão para esta operação.",
    );
}
export function totalCents(items) {
  const total = sumItems(items);
  if (!Number.isSafeInteger(total) || total > 2_000_000_000)
    throw new AppError("LIMIT", "O valor da ficha excede o limite permitido.");
  return total;
}
export function assertTab(tab, version, status = "OPEN") {
  if (!tab) throw new AppError("NOT_FOUND", "Ficha não encontrada.");
  if (tab.version !== version)
    throw new AppError(
      "CONFLICT",
      "A ficha foi atualizada em outro terminal. Confira os itens e tente novamente.",
    );
  if (tab.status !== status)
    throw new AppError(
      "INVALID_STATE",
      "Esta operação não está disponível no estado atual da ficha.",
    );
}
export function itemMeasures(saleType, data) {
  if (saleType === "WEIGHT") {
    if (
      !Number.isInteger(data.weightGrams) ||
      data.weightGrams < 1 ||
      data.weightGrams > 100000 ||
      data.quantity !== 1
    )
      throw new AppError(
        "VALIDATION",
        "Informe o peso do buffet. Cada lançamento corresponde a uma pesagem.",
      );
    return { quantity: 1, weightGrams: data.weightGrams };
  }
  if (data.weightGrams != null)
    throw new AppError(
      "VALIDATION",
      "Bebidas são vendidas por quantidade, não por peso.",
    );
  return { quantity: data.quantity, weightGrams: null };
}
