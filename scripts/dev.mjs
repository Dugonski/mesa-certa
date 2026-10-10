import { spawn } from "node:child_process";
import net from "node:net";
import electron from "electron";
const children = [];
function run(command, args, options = {}) {
  const child = spawn(command, args, { stdio: "inherit", ...options });
  children.push(child);
  child.on("error", (error) => {
    console.error(error.message);
    stop();
  });
  return child;
}
function stop() {
  for (const child of children) child.kill();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
run(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "--config",
  "apps/desktop/vite.config.js",
]);
let ready = false;
for (let i = 0; i < 60; i++) {
  ready = await new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port: 5173 });
    socket.on("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
  if (ready) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}
if (!ready) {
  stop();
  throw new Error("A interface não iniciou.");
}
const child = run(electron, ["."], {
  env: { ...process.env, ELECTRON_DEV: "1" },
});
child.on("exit", stop);
