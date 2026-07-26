import assert from "node:assert/strict";
import { startNextServer } from "../helpers/next-server.mjs";

const totalRequests = Number(process.env.BATUK_LOAD_REQUESTS || 60);
const concurrency = Number(process.env.BATUK_LOAD_CONCURRENCY || 12);
const maxAverageMs = Number(process.env.BATUK_LOAD_MAX_AVG_MS || 1200);
const server = await startNextServer();

async function requestHome() {
  const startedAt = performance.now();
  const response = await fetch(server.baseUrl);
  await response.arrayBuffer();
  return {
    status: response.status,
    durationMs: performance.now() - startedAt,
  };
}

try {
  const results = [];
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (nextIndex < totalRequests) {
        nextIndex += 1;
        results.push(await requestHome());
      }
    }),
  );

  const failures = results.filter((result) => result.status !== 200);
  const averageMs = results.reduce((sum, result) => sum + result.durationMs, 0) / results.length;
  const p95Ms = results.map((result) => result.durationMs).sort((a, b) => a - b)[Math.floor(results.length * 0.95) - 1] || 0;

  assert.equal(failures.length, 0);
  assert.ok(averageMs <= maxAverageMs, `Average latency ${averageMs.toFixed(1)}ms exceeded ${maxAverageMs}ms`);

  console.log(`Load smoke passed: ${results.length} requests, concurrency ${concurrency}, avg ${averageMs.toFixed(1)}ms, p95 ${p95Ms.toFixed(1)}ms`);
} finally {
  await server.stop();
}
