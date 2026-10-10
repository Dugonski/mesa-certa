const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { randomUUID } = require("node:crypto");
const { TcpClient } = require("./client.cjs");
let window;
const client = new TcpClient((event) => {
  if (window && !window.isDestroyed())
    window.webContents.send("server:event", event);
});
const { desktopActions } = require("../../../packages/shared/commands.cjs");
const allowed = new Set(desktopActions);
function guard(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame
  )
    throw new Error("Origem inválida.");
}
const wrap =
  (fn) =>
  async (event, ...args) => {
    try {
      guard(event);
      return { ok: true, result: await fn(...args) };
    } catch (error) {
      return {
        ok: false,
        error: { message: error.message, code: error.code ?? "CONNECTION" },
      };
    }
  };
ipcMain.handle(
  "server:login",
  wrap(async (input) => {
    if (
      !input ||
      typeof input.host !== "string" ||
      !/^[a-zA-Z0-9.:-]{1,253}$/.test(input.host) ||
      !Number.isInteger(input.port) ||
      input.port < 1 ||
      input.port > 65535
    )
      throw new Error("Endereço ou porta inválidos.");
    await client.connect(input.host, input.port);
    const { token, user } = await client.request("login", {
      username: input.username,
      password: input.password,
      terminal: input.terminal,
    });
    client.token = token;
    return user;
  }),
);
ipcMain.handle(
  "server:request",
  wrap(async (action, data) => {
    if (!allowed.has(action)) throw new Error("Operação inválida.");
    return client.request(action, data, randomUUID());
  }),
);
ipcMain.handle(
  "server:logout",
  wrap(async () => {
    try {
      if (client.token) await client.request("logout");
    } finally {
      client.disconnect();
    }
  }),
);
ipcMain.handle(
  "xml:save",
  wrap(async (tabId) => {
    const { xml, filename } = await client.request("tabs.xml", { tabId });
    const selected = await dialog.showSaveDialog(window, {
      title: "Salvar XML da venda",
      defaultPath: path.join(app.getPath("downloads"), filename),
      filters: [{ name: "XML NFC-e", extensions: ["xml"] }],
    });
    if (selected.canceled) return { canceled: true };
    await fs.writeFile(selected.filePath, xml, "utf8");
    return { canceled: false };
  }),
);
app.whenReady().then(() => {
  window = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1050,
    minHeight: 720,
    backgroundColor: "#f5f7fb",
    title: "MesaCerta",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  if (!app.isPackaged && process.env.ELECTRON_DEV === "1")
    window.loadURL("http://127.0.0.1:5173");
  else window.loadFile(path.join(__dirname, "../dist/index.html"));
});
app.on("window-all-closed", () => {
  client.disconnect();
  app.quit();
});
