import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const schemas = [
  "database/sqlite/001_enterprise_data.sql",
  "database/postgresql/001_enterprise_data.sql",
  "database/mysql/001_enterprise_data.sql",
];

describe("enterprise SQL schema files", () => {
  for (const schema of schemas) {
    it(`${schema} includes scoped product state and audit-capable domains`, async () => {
      const sql = await readFile(schema, "utf8");

      assert.match(sql, /batuk_app_state/i);
      assert.match(sql, /organization_id/i);
      assert.match(sql, /user_id/i);
      assert.match(sql, /payload/i);
      assert.match(sql, /updated_at/i);
    });
  }
});
