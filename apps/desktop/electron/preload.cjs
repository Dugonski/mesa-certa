const { contextBridge, ipcRenderer } = require("electron");
async function call(channel, ...args) {
  const response = await ipcRenderer.invoke(channel, ...args);
  if (!response.ok)
    throw Object.assign(new Error(response.error.message), {
      code: response.error.code,
    });
  return response.result;
}
contextBridge.exposeInMainWorld("restaurant", {
  login: (data) => call("server:login", data),
  request: (action, data) => call("server:request", action, data),
  logout: () => call("server:logout"),
  saveXml: (tabId) => call("xml:save", tabId),
  onEvent: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on("server:event", listener);
    return () => ipcRenderer.removeListener("server:event", listener);
  },
});
