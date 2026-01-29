import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_FILE = path.join(__dirname, "memory.json");

// Load memory from file
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      return JSON.parse(fs.readFileSync(MEMORY_FILE, "utf-8"));
    }
  } catch (e) {
    console.error("Error loading memory:", e);
  }
  return {};
}

// Save memory to file
function saveMemory(memory) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

const server = new Server(
  {
    name: "memory-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "memory_save",
        description: "Save a key-value pair to persistent memory",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The key to save" },
            value: { type: "string", description: "The value to save" },
          },
          required: ["key", "value"],
        },
      },
      {
        name: "memory_load",
        description: "Load a value from persistent memory by key",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The key to load" },
          },
          required: ["key"],
        },
      },
      {
        name: "memory_list",
        description: "List all keys in persistent memory",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "memory_delete",
        description: "Delete a key from persistent memory",
        inputSchema: {
          type: "object",
          properties: {
            key: { type: "string", description: "The key to delete" },
          },
          required: ["key"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const memory = loadMemory();

  switch (name) {
    case "memory_save": {
      memory[args.key] = args.value;
      saveMemory(memory);
      return {
        content: [{ type: "text", text: `Saved "${args.key}" to memory` }],
      };
    }
    case "memory_load": {
      const value = memory[args.key];
      if (value === undefined) {
        return {
          content: [{ type: "text", text: `Key "${args.key}" not found` }],
        };
      }
      return {
        content: [{ type: "text", text: value }],
      };
    }
    case "memory_list": {
      const keys = Object.keys(memory);
      if (keys.length === 0) {
        return {
          content: [{ type: "text", text: "Memory is empty" }],
        };
      }
      return {
        content: [{ type: "text", text: `Keys in memory:\n${keys.join("\n")}` }],
      };
    }
    case "memory_delete": {
      if (memory[args.key] !== undefined) {
        delete memory[args.key];
        saveMemory(memory);
        return {
          content: [{ type: "text", text: `Deleted "${args.key}" from memory` }],
        };
      }
      return {
        content: [{ type: "text", text: `Key "${args.key}" not found` }],
      };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memory MCP Server running");
}

main().catch(console.error);
