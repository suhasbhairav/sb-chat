import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { describe, it } from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function validEnv(overrides = {}) {
  return {
    ...process.env,
    BETTER_AUTH_DATABASE_PROVIDER: "sqlite",
    BETTER_AUTH_DB_PATH: "data/test-auth.sqlite",
    BATUK_DATA_STORE_PROVIDER: "json",
    BATUK_DATA_DIR: "data/test-runtime",
    BETTER_AUTH_OAUTH_TRUSTED_CLIENTS: "[]",
    BETTER_AUTH_OIDC_TRUSTED_CLIENTS: "[]",
    BETTER_AUTH_DEFAULT_SSO: "[]",
    BETTER_AUTH_DEFAULT_SCIM: "[]",
    ...overrides,
  };
}

describe("enterprise environment validation", () => {
  it("accepts the default local enterprise storage profile", async () => {
    const { stdout } = await execFileAsync("node", ["scripts/validate-enterprise-env.mjs"], {
      env: validEnv(),
    });

    assert.match(stdout, /configuration is valid/i);
  });

  it("rejects malformed Better Auth JSON integration settings", async () => {
    await assert.rejects(
      execFileAsync("node", ["scripts/validate-enterprise-env.mjs"], {
        env: validEnv({ BETTER_AUTH_OAUTH_TRUSTED_CLIENTS: "{bad json" }),
      }),
      /must be valid JSON/i,
    );
  });
});
