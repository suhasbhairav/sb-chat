import assert from "node:assert/strict";
import { startNextServer } from "../helpers/next-server.mjs";

const server = await startNextServer();

try {
  const home = await fetch(server.baseUrl);
  const html = await home.text();

  assert.equal(home.status, 200);
  assert.match(html, /Batuk/i);

  const models = await fetch(`${server.baseUrl}/api/models?provider=manual`);
  const payload = await models.json();

  assert.equal(models.status, 401);
  assert.equal(payload.error, "Authentication required.");

  console.log(`E2E smoke passed against ${server.baseUrl}`);
} finally {
  await server.stop();
}
