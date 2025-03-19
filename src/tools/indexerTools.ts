import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerIndexerTools(server: McpServer) {
  // Solana blockchain indexer queries
  
  // Get Account Transaction History
  server.tool(
    "getAccountTransactionHistory",
    "Get transaction history for a specific account",
    {
      address: z.string(),
      limit: z.number().optional(),
      before: z.string().optional(),
      until: z.string().optional()
    },
    async ({ address, limit, before, until }) => {
      try {
        // Use a public indexer API (This is just a placeholder)
        const url = new URL("https://public-api.solscan.io/account/transactions");
        url.searchParams.append("account", address);
        if (limit) url.searchParams.append("limit", limit.toString());
        if (before) url.searchParams.append("before", before);
        if (until) url.searchParams.append("until", until);
        
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`Indexer API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
  
  // Get Token Holders Distribution
  server.tool(
    "getTokenHoldersDistribution",
    "Get distribution statistics of token holders",
    {
      tokenAddress: z.string()
    },
    async ({ tokenAddress }) => {
      try {
        // Use a public indexer API (This is just a placeholder)
        const url = new URL("https://public-api.solscan.io/token/holders/distribution");
        url.searchParams.append("tokenAddress", tokenAddress);
        
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`Indexer API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
  
  // Get Program Accounts
  server.tool(
    "getProgramAccounts",
    "Get accounts owned by a specific program",
    {
      programId: z.string(),
      limit: z.number().optional(),
      offset: z.number().optional()
    },
    async ({ programId, limit, offset }) => {
      try {
        // Use a public indexer API (This is just a placeholder)
        const url = new URL("https://public-api.solscan.io/program/accounts");
        url.searchParams.append("programId", programId);
        if (limit) url.searchParams.append("limit", limit.toString());
        if (offset) url.searchParams.append("offset", offset.toString());
        
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`Indexer API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
  
  // Get Market Data
  server.tool(
    "getMarketData",
    "Get market data for a token",
    {
      tokenAddress: z.string()
    },
    async ({ tokenAddress }) => {
      try {
        // Use a public market API (This is just a placeholder)
        const url = new URL("https://public-api.birdeye.so/public/tokeninfo");
        url.searchParams.append("address", tokenAddress);
        
        const response = await fetch(url.toString(), {
          headers: {
            "Content-Type": "application/json"
          }
        });
        
        if (!response.ok) {
          throw new Error(`Market API error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
}
