/**
 * Entry point for running the MCP server.
 * Run with: npx mcp-map-server
 * Or: node dist/index.js [--stdio]
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import type { Request, Response } from "express";
import { createServer } from "./server.js";

/**
 * Starts an MCP server with Streamable HTTP transport in stateless mode.
 *
 * @param createServer - Factory function that creates a new McpServer instance per request.
 */
export async function startStreamableHTTPServer(
  createServer: () => McpServer,
): Promise<void> {
  const port = parseInt(process.env.PORT ?? "3001", 10);

  const app = createMcpExpressApp({ host: "0.0.0.0" });
  app.use(cors());

  // Health check endpoint for Azure
  app.get("/", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      service: "MCP Map Server",
      port: port,
      timestamp: new Date().toISOString()
    });
  });

  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("MCP error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal server error" },
          id: null,
        });
      }
    }
  });

  const httpServer = app.listen(port, "0.0.0.0", () => {
    console.log(`=== MCP Server Started ===`);
    console.log(`Port: ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`Health: http://localhost:${port}/health`);
    console.log(`MCP Endpoint: http://localhost:${port}/mcp`);
    console.log(`========================`);
  });

  const shutdown = () => {
    console.log("\nShutting down...");
    httpServer.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

/**
 * Starts an MCP server with stdio transport.
 *
 * @param createServer - Factory function that creates a new McpServer instance.
 */
export async function startStdioServer(
  createServer: () => McpServer,
): Promise<void> {
  await createServer().connect(new StdioServerTransport());
}

async function main() {
  console.log("Starting MCP Map Server...");
  console.log("Node version:", process.version);
  console.log("PORT env:", process.env.PORT || "not set (using 3001)");
  console.log("Args:", process.argv);

  if (process.argv.includes("--stdio")) {
    console.log("Starting in STDIO mode");
    await startStdioServer(createServer);
  } else {
    console.log("Starting in HTTP mode");
    await startStreamableHTTPServer(createServer);
  }
}

main().catch((e) => {
  console.error("=== STARTUP ERROR ===");
  console.error(e);
  console.error("====================");
  process.exit(1);
});
