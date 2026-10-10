export const permissions = {
  ADMIN: [
    "tabs.read",
    "tabs.open",
    "tabs.add",
    "tabs.edit",
    "tables.write",
    "tabs.pay",
    "tabs.close",
    "history.read",
    "products.write",
    "users.write",
    "audit.read",
  ],
  ATTENDANT: ["tabs.read", "tabs.open", "tabs.add", "tabs.edit"],
  CASHIER: [
    "tabs.read",
    "tabs.open",
    "tabs.add",
    "tabs.edit",
    "tabs.pay",
    "tabs.close",
    "history.read",
  ],
};
export const can = (role, permission) =>
  permissions[role]?.includes(permission) ?? false;
export const roleLabels = {
  ADMIN: "Administrador",
  ATTENDANT: "Atendente",
  CASHIER: "Caixa",
};
