#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { cdpClient } from "./cdpClient.js";
import { config } from "./config.js";

const server = new Server(
    {
        name: "ruishu-cdp",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "init_ruishu_hook",
                title: "Initialize Ruishu Hook",
                description: "Step 1: Hooking. When you need to capture plaintext of Ruishu encrypted interfaces, call this function first to mount to the browser. It will also bypass cache, ServiceWorker proxy, and SRI security restrictions.",
                inputSchema: {
                    type: "object",
                    properties: {
                        url_keyword: {
                            type: "string",
                            description: "URL keyword of the target webpage, leave empty to mount the first tab by default"
                        },
                        host: {
                            type: "string",
                            description: "Chrome Debug port Host, default 127.0.0.1"
                        },
                        port: {
                            type: "number",
                            description: "Chrome Debug port Port, default 9222"
                        }
                    }
                },
                annotations: {
                    title: "Initialize Ruishu Hook",
                    readOnlyHint: false,
                    destructiveHint: false,
                    openWorldHint: true
                }
            },
            {
                name: "get_intercepted_traffic",
                title: "Get Intercepted Traffic",
                description: "Step 2: Extraction. Get the merged plaintext logs of intercepted requests and responses sent by the browser. Automatically clears the queue to prevent overflow.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: {
                            type: "number",
                            description: "Number of newest records to retrieve (prevents context explosion), retrieves all if not provided."
                        }
                    }
                },
                annotations: {
                    title: "Get Intercepted Traffic",
                    readOnlyHint: true,
                    destructiveHint: false,
                    openWorldHint: false
                }
            },
            {
                name: "execute_page_action",
                title: "Execute Page Action",
                description: "Auxiliary action: allows executing specified JS in the page (simulate click/scroll/input, etc.) to trigger requests.",
                inputSchema: {
                    type: "object",
                    properties: {
                        js_script: {
                            type: "string",
                            description: "JavaScript code to execute in the page"
                        }
                    },
                    required: ["js_script"]
                },
                annotations: {
                    title: "Execute Page Action",
                    readOnlyHint: false,
                    destructiveHint: true,
                    openWorldHint: true
                }
            }
        ],
    };
});

/**
 * Handle tool execution
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
        case "init_ruishu_hook": {
            const keyword = String(request.params.arguments?.url_keyword || "");
            const host = String(request.params.arguments?.host || config.defaultHost);
            const port = Number(request.params.arguments?.port || config.defaultPort);
            
            try {
                const msg = await cdpClient.connect(keyword, host, port);
                return { content: [{ type: "text", text: msg }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: "Error initializing hook: " + e.message }], isError: true };
            }
        }

        case "get_intercepted_traffic": {
            try {
                const limit = request.params.arguments?.limit 
                    ? Number(request.params.arguments.limit) 
                    : undefined;
                
                // Directly pull data from the browser's incognito cache queue, clear it after pulling to prevent overflow
                // [Fix point]: Added timeout protection to prevent infinite waiting when the page hangs
                const rawStr = await Promise.race([
                    cdpClient.executeScript("var q=(window.__mcp_intercept_queue||[]).splice(0);q;"),
                    new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Timed out reading browser queue (30s)")), 30000))
                ]);
                let recs: any[] = [];
                try {
                     recs = JSON.parse(rawStr) || [];
                } catch(e) {
                     console.error(`[WARN] Failed to parse browser queue data: ${String(rawStr).substring(0, 200)}`);
                }

                // Append the data natively intercepted by the backend
                const nodeRecs = cdpClient.nodeInterceptQueue.splice(0, cdpClient.nodeInterceptQueue.length); // Extract and clear
                recs = recs.concat(nodeRecs);

                // Truncate unifiedly after merging, ensure limit applies to the full dataset
                if (limit && limit > 0) {
                     recs = recs.slice(-limit);
                }

                // Return nicely formatted robust JSON array
                return { content: [{ type: "text", text: JSON.stringify(recs, null, 2) }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: "Error reading storage: " + e.message }], isError: true };
            }
        }

        case "execute_page_action": {
            const script = String(request.params.arguments?.js_script || "");
            try {
                const res = await cdpClient.executeScript(script);
                return { content: [{ type: "text", text: res }] };
            } catch (e: any) {
                return { content: [{ type: "text", text: "Execution Error: " + e.message }], isError: true };
            }
        }

        default:
            // [Fix point]: No longer throw (to prevent unhandled exceptions across different SDK versions), return unified MCP error response
            return { content: [{ type: "text", text: `Unknown tool: ${request.params.name}` }], isError: true };
    }
});

// VERY IMPORTANT:
// Intercept all default console methods and redirect to stderr!
// Because stdio transport uses stdout, console.log corrupts JSON-RPC!
console.log = (...args) => console.error("[LOG_REDIRECTED]", ...args);
console.info = (...args) => console.error("[INFO_REDIRECTED]", ...args);
console.warn = (...args) => console.error("[WARN_REDIRECTED]", ...args);

// Boot server
async function main() {
    console.error("Starting Ruishu MCP Node.js server via stdio transport...");
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Ruishu MCP server is running and connected to transport.");
}

main().catch(error => {
    console.error("Fatal Server Startup Error:", error);
    process.exit(1);
});
