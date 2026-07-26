import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function headersFromConfig(config = {}) {
  return Object.fromEntries(
    Object.entries(config.headers || {}).filter(([, value]) => String(value || "").trim()),
  );
}

function envFromConfig(config = {}) {
  return {
    ...process.env,
    ...Object.fromEntries(Object.entries(config.env || {}).filter(([, value]) => String(value || "").trim())),
  };
}

function makeTransport(integration) {
  const config = integration.config || {};
  if (integration.transport === "stdio") {
    if (!config.command) throw new Error("stdio MCP integrations need a command.");
    return new StdioClientTransport({
      command: String(config.command),
      args: Array.isArray(config.args) ? config.args.map(String) : [],
      env: envFromConfig(config),
      cwd: config.cwd ? String(config.cwd) : process.cwd(),
    });
  }

  if (!config.url) throw new Error("Remote MCP integrations need a URL.");
  const options = { requestInit: { headers: headersFromConfig(config) } };
  if (integration.transport === "sse") return new SSEClientTransport(new URL(config.url), options);
  return new StreamableHTTPClientTransport(new URL(config.url), options);
}

export async function withMcpClient(integration, callback) {
  const client = new Client({ name: "sb-chat", version: "0.1.0" });
  const transport = makeTransport(integration);
  try {
    await client.connect(transport);
    return await callback(client);
  } finally {
    await client.close().catch(() => {});
  }
}

export async function discoverMcpIntegration(integration) {
  return withMcpClient(integration, async (client) => {
    const [toolsResult, resourcesResult, promptsResult] = await Promise.allSettled([
      client.listTools(),
      client.listResources(),
      client.listPrompts(),
    ]);

    return {
      tools: toolsResult.status === "fulfilled" ? toolsResult.value.tools || [] : [],
      resources: resourcesResult.status === "fulfilled" ? resourcesResult.value.resources || [] : [],
      prompts: promptsResult.status === "fulfilled" ? promptsResult.value.prompts || [] : [],
      errors: [
        toolsResult.status === "rejected" ? `tools: ${toolsResult.reason?.message || "failed"}` : "",
        resourcesResult.status === "rejected" ? `resources: ${resourcesResult.reason?.message || "failed"}` : "",
        promptsResult.status === "rejected" ? `prompts: ${promptsResult.reason?.message || "failed"}` : "",
      ].filter(Boolean),
    };
  });
}

export async function callMcpTool(integration, name, args = {}) {
  return withMcpClient(integration, (client) => client.callTool({ name, arguments: args }));
}

export async function readMcpResource(integration, uri) {
  return withMcpClient(integration, (client) => client.readResource({ uri }));
}
