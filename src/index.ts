import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Connection, clusterApiUrl } from "@solana/web3.js";
import * as dotenv from "dotenv";
import { Helius } from "helius-sdk";

// Import modular components
import { AMOCASolanaAgent } from "./agent";
import { 
  registerAccountTools, 
  registerWalletTools, 
  registerTradingTools, 
  registerHeliusTools,
  registerResourceTools,
  registerGraphQLTools,
  registerIndexerTools
} from "./tools";
import { registerPrompts } from "./prompts";

// Load environment variables
dotenv.config();

// Initialize Helius client with API key from environment variables
const helius = new Helius(process.env.HELIUS_API_KEY || "");

// Create an MCP server
const server = new McpServer({
  name: "Solana RPC Tools",
  version: "1.0.0",
  description: "Comprehensive Solana blockchain tools for the Model Context Protocol",
});

// Initialize Solana connection
const connection = new Connection(
  process.env.RPC_ENDPOINT || clusterApiUrl("mainnet-beta"), 
  process.env.COMMITMENT_LEVEL || "confirmed"
);

// Initialize AMOCASolanaAgent with our connection
const agent = new AMOCASolanaAgent(connection);

// Register all tool categories
registerAccountTools(server, connection, agent);
registerWalletTools(server, agent);
registerTradingTools(server, agent);
registerHeliusTools(server, helius);
registerResourceTools(server);
registerGraphQLTools(server);
registerIndexerTools(server);

// Register prompts
registerPrompts(server);

// Console log startup information
console.log(`Starting Solana MCP Server v1.0.0`);
console.log(`Connected to ${process.env.RPC_ENDPOINT || "mainnet-beta"}`);
console.log(`Helius API Key: ${process.env.HELIUS_API_KEY ? "Configured" : "Not configured"}`);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
server.connect(transport);

console.log("MCP server connected and ready");