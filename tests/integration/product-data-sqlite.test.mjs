import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

process.env.BATUK_DATA_STORE_PROVIDER = "sqlite";
process.env.BATUK_DATA_SQLITE_PATH = path.join(await mkdtemp(path.join(os.tmpdir(), "batuk-sqlite-")), "product.sqlite");

const {
  getProductDataProvider,
  isSqlProductDataStoreEnabled,
  readSqlDomainStore,
  resolveProductDataScope,
  withProductDataScope,
  writeSqlDomainStore,
} = await import("../../lib/product-data-store.js");

describe("SQLite product data store", () => {
  it("stores domain payloads by organization and user scope", async () => {
    assert.equal(getProductDataProvider(), "sqlite");
    assert.equal(isSqlProductDataStoreEnabled(), true);

    const orgScope = { organizationId: "org-a", userId: "user-a" };
    const userScope = { organizationId: "user-b", userId: "user-b" };

    await withProductDataScope(orgScope, async () => {
      await writeSqlDomainStore("chats", { chats: [{ id: "chat-1" }] });
    });
    await withProductDataScope(userScope, async () => {
      await writeSqlDomainStore("chats", { chats: [{ id: "chat-2" }] });
    });

    const orgStore = await withProductDataScope(orgScope, () => readSqlDomainStore("chats", { chats: [] }));
    const userStore = await withProductDataScope(userScope, () => readSqlDomainStore("chats", { chats: [] }));

    assert.equal(orgStore.chats[0].id, "chat-1");
    assert.equal(userStore.chats[0].id, "chat-2");
  });

  it("falls back to user scope when no active organization exists", () => {
    assert.deepEqual(resolveProductDataScope({ user: { id: "user-only" } }), {
      organizationId: "user-only",
      userId: "user-only",
    });
  });
});
