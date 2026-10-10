import net from "node:net";
import { ZodError } from "zod";
import { envelope } from "../../../../packages/shared/contracts.js";
import framing from "../../../../packages/shared/framing.cjs";
import { AppError } from "../domain.js";

export function createTcpServer(service) {
  const clients = new Set();
  function send(socket, message) {
    if (socket.destroyed) return;
    if (socket.writableLength > framing.MAX_FRAME_BYTES * 2)
      return socket.destroy();
    try {
      socket.write(framing.encode(message));
    } catch {
      socket.destroy();
    }
  }
  const server = net.createServer((socket) => {
    clients.add(socket);
    socket.setKeepAlive(true, 30_000);
    socket.on("error", () => {});
    socket.on("close", () => clients.delete(socket));
    let queued = 0;
    let chain = Promise.resolve();
    socket.on(
      "data",
      framing.createDecoder(
        (message) => {
          if (++queued > 50) return socket.destroy();
          chain = chain.then(async () => {
            let request;
            try {
              request = envelope.parse(message);
              const result = await service.execute(
                request,
                socket.remoteAddress,
              );
              if (request.action === "login")
                socket.sessionToken = result.token;
              if (request.action === "logout") socket.sessionToken = null;
              send(socket, { id: request.id, ok: true, result });
              if (service.isMutation(request.action)) {
                // Only an invalidation signal is broadcast; data requires a fresh authorized read.
                for (const client of clients)
                  if (client.sessionToken) send(client, { event: "changed" });
              }
            } catch (error) {
              const expected =
                error instanceof AppError || error instanceof ZodError;
              if (!expected)
                console.error("Falha na operação:", error.code ?? error.name);
              send(socket, {
                id: request?.id ?? message?.id,
                ok: false,
                error: {
                  code:
                    error instanceof ZodError
                      ? "VALIDATION"
                      : expected
                        ? error.code
                        : "INTERNAL",
                  message:
                    error instanceof ZodError
                      ? "Confira os campos informados."
                      : expected
                        ? error.message
                        : "Não foi possível concluir. Verifique o servidor e tente novamente.",
                },
              });
            } finally {
              queued--;
            }
          });
        },
        () => socket.destroy(),
      ),
    );
  });
  server.maxConnections = 100;
  server.disconnectClients = () => {
    for (const client of clients) client.destroy();
  };
  return server;
}
