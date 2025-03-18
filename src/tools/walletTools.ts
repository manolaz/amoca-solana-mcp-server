import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AMOCASolanaAgent } from "../agent";

export function registerWalletTools(server: McpServer, agent: AMOCASolanaAgent) {
  // Create Wallet
  server.tool(
    "createWallet",
    "Create a new Solana wallet keypair",
    {},
    async () => {
      try {
        const wallet = agent.createWallet();
        return {
          content: [{ type: "text", text: JSON.stringify(wallet, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Import Wallet
  server.tool(
    "importWallet",
    "Import an existing Solana wallet using private key",
    { privateKey: z.string() },
    async ({ privateKey }) => {
      try {
        const wallet = agent.importWallet(privateKey);
        return {
          content: [{ type: "text", text: JSON.stringify(wallet, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Token Balance
  server.tool(
    "getTokenBalance",
    "Get token balance for a wallet",
    { 
      walletAddress: z.string(),
      tokenMint: z.string()
    },
    async ({ walletAddress, tokenMint }) => {
      try {
        const balance = await agent.getTokenBalance(walletAddress, tokenMint);
        return {
          content: [{ type: "text", text: balance }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get All Token Balances
  server.tool(
    "getAllTokenBalances",
    "Get all token balances for a wallet with USD value distribution",
    { 
      walletAddress: z.string()
    },
    async ({ walletAddress }) => {
      try {
        const balanceSummary = await agent.getAllTokenBalances(walletAddress);
        
        // Format the response for better readability
        let response = `Wallet: ${walletAddress}\n`;
        response += `Total Value: $${balanceSummary.totalUsdValue.toFixed(2)}\n\n`;
        response += balanceSummary.histogram.distribution;
        
        response += "\n\nTop 5 tokens by value:\n";
        
        // Sort tokens by USD value and get top 5
        const topTokens = Object.entries(balanceSummary.tokens)
          .sort((a, b) => b[1].usdValue - a[1].usdValue)
          .slice(0, 5);
            
        for (const [mint, details] of topTokens) {
          const symbol = details.symbol || "Unknown";
          response += `${symbol.padEnd(10)} | ${details.amount.padEnd(15)} | $${details.usdValue.toFixed(2)}\n`;
        }
        
        return {
          content: [{ type: "text", text: response }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
}
