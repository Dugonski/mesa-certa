import { sumItems } from "../../../../packages/shared/money.js";
export const money = (value) =>
  (value / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const total = (tab) => sumItems(tab.items);
export const date = (value) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
export const actionLabels = {
  LOGIN: "Entrada no sistema",
  LOGOUT: "Saída do sistema",
  TAB_OPENED: "Ficha aberta",
  ITEM_ADDED: "Produto lançado",
  ITEM_UPDATED: "Item editado",
  ITEM_REMOVED: "Item removido",
  PAYMENT_SIMULATED: "Pagamento registrado",
  TAB_CLOSED: "Ficha encerrada",
  PRODUCT_CREATED: "Produto cadastrado",
  PRODUCT_UPDATED: "Produto atualizado",
  USER_CREATED: "Usuário cadastrado",
  TABLES_CONFIGURED: "Quantidade de mesas alterada",
};
