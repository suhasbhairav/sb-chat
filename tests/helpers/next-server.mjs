import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";

export async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

export async function waitForHttp(url, { timeoutMs = 30000 } = {}) {
  const startedAt = Date.now();
  let lastError;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}${lastError ? `: ${lastError.message}` : ""}`);
}

export async function startNextServer({ port, env = {} } = {}) {
  const resolvedPort = port || (await getFreePort());
  const nextBin = path.join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");

  if (!existsSync(path.join(process.cwd(), ".next"))) {
    throw new Error("Production build not found. Run npm run build before starting HTTP tests.");
  }

  const child = spawn(nextBin, ["start", "-H", "127.0.0.1", "-p", String(resolvedPort)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      BETTER_AUTH_URL: `http://127.0.0.1:${resolvedPort}`,
      NEXT_PUBLIC_APP_URL: `http://127.0.0.1:${resolvedPort}`,
      BATUK_DATA_DIR: path.join(process.cwd(), ".test-data"),
      BETTER_AUTH_DB_PATH: path.join(process.cwd(), ".test-data", "auth.sqlite"),
      BATUK_DATA_STORE_PROVIDER: "json",
      ...env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${resolvedPort}`;

  try {
    await waitForHttp(baseUrl, { timeoutMs: 30000 });
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${error.message}\nServer output:\n${output}`);
  }

  return {
    baseUrl,
    output: () => output,
    async stop() {
      if (child.exitCode !== null) return;
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 5000);
        child.once("exit", () => {
          clearTimeout(timer);
          resolve();
        });
      });
    },
  };
}
