import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InMemoryRequestQueue, isRateLimitError, modelQueueOptionsFromEnv, rateLimitDelayMs } from "../../lib/request-queue.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

describe("request queue", () => {
  it("serves queued requests in order and removes them after completion", async () => {
    const queue = new InMemoryRequestQueue("unit", { concurrency: 1 });
    const releaseFirst = deferred();
    const order = [];
    const queuedSnapshots = [];

    const first = queue.enqueue(async () => {
      order.push("first:start");
      await releaseFirst.promise;
      order.push("first:end");
      return "first";
    });
    const second = queue.enqueue(async () => {
      order.push("second:start");
      return "second";
    }, {
      onQueued: (snapshot) => queuedSnapshots.push(snapshot),
    });

    assert.equal(first.snapshot().status, "active");
    assert.equal(second.snapshot().status, "queued");
    assert.equal(second.snapshot().position, 1);
    assert.equal(queuedSnapshots[0].pendingCount, 1);

    releaseFirst.resolve();

    assert.equal(await first.promise, "first");
    assert.equal(await second.promise, "second");
    assert.deepEqual(order, ["first:start", "first:end", "second:start"]);
    assert.equal(queue.snapshot().activeCount, 0);
    assert.equal(queue.snapshot().pendingCount, 0);
    assert.equal(queue.snapshot().completed, 2);
  });

  it("frees a queue slot when a request fails", async () => {
    const queue = new InMemoryRequestQueue("failure", { concurrency: 1 });
    const error = new Error("provider failed");
    const first = queue.enqueue(async () => {
      throw error;
    });
    const second = queue.enqueue(async () => "served");

    await assert.rejects(first.promise, /provider failed/);
    assert.equal(await second.promise, "served");
    assert.equal(queue.snapshot().activeCount, 0);
    assert.equal(queue.snapshot().pendingCount, 0);
    assert.equal(queue.snapshot().failed, 1);
    assert.equal(queue.snapshot().completed, 1);
  });

  it("normalizes model queue environment options", () => {
    const options = modelQueueOptionsFromEnv({
      BATUK_MODEL_QUEUE_CONCURRENCY: "12",
      BATUK_MODEL_QUEUE_RATE_LIMIT_RETRIES: "0",
      BATUK_MODEL_QUEUE_RATE_LIMIT_BASE_DELAY_MS: "250",
      BATUK_MODEL_QUEUE_RATE_LIMIT_MAX_DELAY_MS: "5000",
    });

    assert.deepEqual(options, {
      concurrency: 12,
      rateLimitRetries: 0,
      baseDelayMs: 250,
      maxDelayMs: 5000,
    });
  });

  it("detects provider rate-limit errors and computes backoff", () => {
    assert.equal(isRateLimitError(new Error("429 Too Many Requests")), true);
    assert.equal(isRateLimitError({ status: 429, message: "busy" }), true);
    assert.equal(isRateLimitError(new Error("invalid api key")), false);
    assert.equal(rateLimitDelayMs({ headers: { get: () => "2" } }, 1, { maxDelayMs: 5000 }), 2000);
    assert.equal(rateLimitDelayMs(new Error("rate limit"), 3, { baseDelayMs: 100, maxDelayMs: 250 }), 250);
  });
});
