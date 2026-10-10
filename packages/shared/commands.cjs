// Transport names and authorization contract shared by Electron and server.
const mutationPermissions = {
  "tabs.update": "tabs.edit",
  "tabs.remove": "tabs.edit",
  "tables.configure": "tables.write",
  "tabs.open": "tabs.open",
  "tabs.add": "tabs.add",
  "tabs.pay": "tabs.pay",
  "tabs.close": "tabs.close",
  "products.save": "products.write",
  "users.create": "users.write",
};
const desktopActions = ["snapshot", ...Object.keys(mutationPermissions)];
module.exports = { mutationPermissions, desktopActions };
