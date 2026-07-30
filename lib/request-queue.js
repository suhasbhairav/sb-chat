function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function queueRegistry() {
  if (!globalThis.__batukRequestQueues) {
    globalThis.__batukRequestQueues = new Map();
  }
  return globalThis.__batukRequestQueues;
}

export class InMemoryRequestQueue {
  constructor(name, { concurrency = 1 } = {}) {
    this.name = name;
    this.concurrency = positiveInteger(concurrency, 1);
    this.pending = [];
    this.active = new Map();
    this.sequence = 0;
    this.completed = 0;
    this.failed = 0;
  }

  updateOptions({ concurrency } = {}) {
    this.concurrency = positiveInteger(concurrency, this.concurrency);
    this.drain();
  }

  enqueue(handler, { onQueued } = {}) {
    if (typeof handler !== "function") {
      throw new TypeError("Queued request handler must be a function.");
    }

    const task = {
      id: `${this.name}-${Date.now().toString(36)}-${(this.sequence += 1).toString(36)}`,
      handler,
      queuedAt: Date.now(),
      startedAt: null,
      settledAt: null,
      resolve: null,
      reject: null,
    };

    const promise = new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
    });

    this.pending.push(task);
    onQueued?.(this.snapshot(task.id));
    this.drain();

    return {
      id: task.id,
      promise,
      snapshot: () => this.snapshot(task.id),
    };
  }

  snapshot(taskId = null) {
    const pendingIndex = taskId ? this.pending.findIndex((task) => task.id === taskId) : -1;
    const activeTask = taskId ? this.active.get(taskId) : null;

    return {
      name: this.name,
      taskId,
      status: activeTask ? "active" : pendingIndex >= 0 ? "queued" : "unknown",
      concurrency: this.concurrency,
      activeCount: this.active.size,
      pendingCount: this.pending.length,
      position: pendingIndex >= 0 ? pendingIndex + 1 : 0,
      completed: this.completed,
      failed: this.failed,
    };
  }

  drain() {
    while (this.active.size < this.concurrency && this.pending.length) {
      const task = this.pending.shift();
      task.startedAt = Date.now();
      this.active.set(task.id, task);

      Promise.resolve().then(async () => {
        try {
          const result = await task.handler({ id: task.id, queuedAt: task.queuedAt, startedAt: task.startedAt });
          this.completed += 1;
          task.settledAt = Date.now();
          this.active.delete(task.id);
          this.drain();
          task.resolve(result);
        } catch (error) {
          this.failed += 1;
          task.settledAt = Date.now();
          this.active.delete(task.id);
          this.drain();
          task.reject(error);
        }
        });
    }
  }
}

export function getRequestQueue(name, options = {}) {
  const registry = queueRegistry();
  const normalizedName = String(name || "default").trim() || "default";
  const concurrency = positiveInteger(options.concurrency, 1);

  if (!registry.has(normalizedName)) {
    registry.set(normalizedName, new InMemoryRequestQueue(normalizedName, { concurrency }));
  } else {
    registry.get(normalizedName).updateOptions({ concurrency });
  }

  return registry.get(normalizedName);
}

export function modelQueueOptionsFromEnv(env = process.env) {
  return {
    concurrency: positiveInteger(env.BATUK_MODEL_QUEUE_CONCURRENCY, 6),
    rateLimitRetries: nonNegativeInteger(env.BATUK_MODEL_QUEUE_RATE_LIMIT_RETRIES, 4),
    baseDelayMs: positiveInteger(env.BATUK_MODEL_QUEUE_RATE_LIMIT_BASE_DELAY_MS, 1500),
    maxDelayMs: positiveInteger(env.BATUK_MODEL_QUEUE_RATE_LIMIT_MAX_DELAY_MS, 30000),
  };
}

export function getModelRequestQueue(env = process.env) {
  return getRequestQueue("model", { concurrency: modelQueueOptionsFromEnv(env).concurrency });
}

export function enqueueModelRequest(handler, options = {}) {
  return getModelRequestQueue(options.env).enqueue(handler, options);
}

export function isRateLimitError(error) {
  const status = error?.status || error?.statusCode || error?.code;
  const message = String(error?.message || error || "").toLowerCase();
  return (
    status === 429 ||
    status === "429" ||
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("quota exceeded")
  );
}

export function rateLimitDelayMs(error, attempt, options = {}) {
  const retryAfter = error?.retryAfter || error?.headers?.get?.("retry-after");
  const retryAfterSeconds = Number.parseFloat(String(retryAfter || ""));
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, options.maxDelayMs || 30000);
  }

  const baseDelayMs = positiveInteger(options.baseDelayMs, 1500);
  const maxDelayMs = positiveInteger(options.maxDelayMs, 30000);
  return Math.min(baseDelayMs * 2 ** Math.max(0, attempt - 1), maxDelayMs);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
