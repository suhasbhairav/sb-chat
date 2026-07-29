import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { formatMcpContextForPrompt, publicMcpStoreView } = await import("../../lib/mcp-store.js");

describe("MCP integrations", () => {
  it("redacts OAuth secrets and tokens before returning MCP store data to the browser", () => {
    const view = publicMcpStoreView({
      version: 1,
      activeIntegrationId: "hubspot-1",
      integrations: [
        {
          id: "hubspot-1",
          name: "HubSpot CRM",
          config: {
            oauth: {
              clientId: "client-id",
              clientSecret: "client-secret",
              tokens: {
                access_token: "access-token",
                refresh_token: "refresh-token",
              },
            },
          },
        },
      ],
    });

    assert.equal(view.integrations[0].config.oauth.clientId, "client-id");
    assert.equal(view.integrations[0].config.oauth.clientSecret, "********");
    assert.equal(view.integrations[0].config.oauth.tokens, "********");
  });

  it("adds Swiggy food ordering safety guidance to MCP chat context", () => {
    const context = formatMcpContextForPrompt({
      name: "Swiggy Food",
      catalogId: "swiggy-food",
      description: "Food ordering",
      config: {
        safety: {
          requireConfirmationForTools: ["place_food_order"],
        },
      },
      discovery: {
        tools: [{ name: "place_food_order", description: "Places a food order" }],
      },
    });

    assert.match(context, /place_food_order/);
    assert.match(context, /High-impact MCP tools requiring explicit user confirmation/);
    assert.match(context, /Confirm cart items, address, payment method, and total/);
    assert.match(context, /Rs\. 1000/);
  });
});
