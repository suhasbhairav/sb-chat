import assert from "node:assert/strict";
import { startNextServer } from "../helpers/next-server.mjs";

const server = await startNextServer();

try {
  const home = await fetch(server.baseUrl);

  assert.equal(home.headers.get("x-content-type-options"), "nosniff");
  assert.equal(home.headers.get("x-frame-options"), "DENY");
  assert.equal(home.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(home.headers.get("permissions-policy") || "", /microphone=\(self\)/);
  assert.match(home.headers.get("strict-transport-security") || "", /max-age=63072000/);

  const protectedEndpoints = [
    "/api/models?provider=manual",
    "/api/compliance",
    "/api/documents",
    "/api/library",
    "/api/token-usage",
  ];

  for (const endpoint of protectedEndpoints) {
    const response = await fetch(`${server.baseUrl}${endpoint}`);
    const payload = await response.json().catch(() => ({}));

    assert.equal(response.status, 401, `${endpoint} must require authentication`);
    assert.equal(payload.error, "Authentication required.");
  }

  console.log(`Security checks passed against ${server.baseUrl}`);
} finally {
  await server.stop();
}
