import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

function run(label: string, command: string, args: string[]) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });

  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[${label}] exited with code ${code}`);
      process.exit(code);
    }
  });

  return child;
}

const socket = run("socket", "npx", ["tsx", "socket-server.ts"]);
const next = run("next", "npx", ["next", "dev", "--hostname", "0.0.0.0"]);

function shutdown() {
  socket.kill();
  next.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
