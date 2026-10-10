import commands from "../../../../packages/shared/commands.cjs";
import { openTab } from "../modules/tabs/openTab.js";
import { changeTab } from "../modules/tabs/changeTab.js";
import { configureTables } from "../modules/tables/configureTables.js";
import { saveProduct } from "../modules/products/saveProduct.js";
import { createUser } from "../modules/users/createUser.js";
export const mutationPermissions = commands.mutationPermissions;
export const handlers = {
  "tabs.open": openTab,
  "tabs.add": changeTab,
  "tabs.update": changeTab,
  "tabs.remove": changeTab,
  "tabs.pay": changeTab,
  "tabs.close": changeTab,
  "tables.configure": configureTables,
  "products.save": saveProduct,
  "users.create": createUser,
};
