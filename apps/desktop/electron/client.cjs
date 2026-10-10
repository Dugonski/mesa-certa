const net = require("node:net");
const { randomUUID } = require("node:crypto");
const {
  createDecoder,
  encode,
} = require("../../../packages/shared/framing.cjs");

class TcpClient {
  constructor(onEvent) {
    this.pending = new Map();
    this.onEvent = onEvent;
    this.token = null;
  }
  connect(host, port) {
    this.disconnect();
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host, port });
      this.socket = socket;
      const timeout = setTimeout(() => {
        reject(
          new Error(
            "Tempo de conexão esgotado. Confira o endereço do servidor.",
          ),
        );
        socket.destroy();
      }, 6000);
      socket.setKeepAlive(true, 15000);
      socket.on("connect", () => {
        clearTimeout(timeout);
        resolve();
      });
      socket.on("error", () => {
        clearTimeout(timeout);
        reject(
          new Error(
            "Servidor indisponível. Confira o endereço e se ele está em execução.",
          ),
        );
      });
      socket.on("close", () => {
        clearTimeout(timeout);
        if (this.socket !== socket) return;
        this.socket = null;
        this.token = null;
        for (const { reject, timer } of this.pending.values()) {
          clearTimeout(timer);
          reject(
            new Error(
              "Conexão perdida. Entre novamente e confira a ficha antes de repetir uma operação.",
            ),
          );
        }
        this.pending.clear();
        this.onEvent({ event: "disconnected" });
      });
      socket.on(
        "data",
        createDecoder(
          (message) => {
            if (message.event) return this.onEvent(message);
            const pending = this.pending.get(message.id);
            if (!pending) return;
            clearTimeout(pending.timer);
            this.pending.delete(message.id);
            if (message.ok) pending.resolve(message.result);
            else
              pending.reject(
                Object.assign(new Error(message.error.message), {
                  code: message.error.code,
                }),
              );
          },
          () => socket.destroy(),
        ),
      );
    });
  }
  request(action, data = {}, commandId) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed)
        return reject(new Error("Sem conexão com o servidor."));
      const id = randomUUID();
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          Object.assign(
            new Error(
              "Servidor sem resposta. Consulte a ficha antes de repetir a operação.",
            ),
            { code: "TIMEOUT" },
          ),
        );
      }, 20000);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.write(
        encode({
          id,
          action,
          data,
          ...(this.token ? { token: this.token } : {}),
          ...(commandId ? { commandId } : {}),
        }),
      );
    });
  }
  disconnect() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    this.token = null;
    for (const { reject, timer } of this.pending.values()) {
      clearTimeout(timer);
      reject(new Error("Conexão encerrada."));
    }
    this.pending.clear();
  }
}
module.exports = { TcpClient };
