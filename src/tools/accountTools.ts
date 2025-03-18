import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { AMOCASolanaAgent } from "../agent";

export function registerAccountTools(server: McpServer, connection: Connection, agent: AMOCASolanaAgent) {
  // Get Account Info
  server.tool(
    "getAccountInfo",
    "Used to look up account info by public key (32 byte base58 encoded address)",
    { publicKey: z.string() },
    async ({ publicKey }) => {
      try {
        const pubkey = new PublicKey(publicKey);
        const accountInfo = await connection.getAccountInfo(pubkey);
        return {
          content: [{ type: "text", text: JSON.stringify(accountInfo, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Balance
  server.tool(
    "getBalance",
    "Get comprehensive token portfolio for a wallet with visual charts",
    { publicKey: z.string() },
    async ({ publicKey }) => {
      try {
        const pubkey = new PublicKey(publicKey);
        // Get SOL balance
        const solBalance = await connection.getBalance(pubkey);
        
        // Get all token balances with their values
        const tokenBalances = await agent.getAllTokenBalances(publicKey);
        
        // Create a more visual representation with ASCII art
        let response = `📊 WALLET PORTFOLIO SUMMARY 📊\n\n`;
        response += `🔷 SOL Balance: ${(solBalance / LAMPORTS_PER_SOL).toFixed(6)} SOL (${solBalance} lamports)\n`;
        response += `💰 Total Portfolio Value: $${tokenBalances.totalUsdValue.toFixed(2)}\n\n`;
        
        // Value distribution histogram
        response += `📈 TOKEN VALUE DISTRIBUTION 📈\n`;
        response += tokenBalances.histogram.distribution;
        
        // Top tokens table with better formatting
        response += `\n🏆 TOP TOKENS BY VALUE 🏆\n`;
        response += `${"TOKEN".padEnd(12)} | ${"AMOUNT".padEnd(18)} | ${"USD VALUE".padEnd(12)}\n`;
        response += `${"-".repeat(50)}\n`;
        
        // Sort tokens by USD value and get top 8
        const topTokens = Object.entries(tokenBalances.tokens)
          .sort((a, b) => b[1].usdValue - a[1].usdValue)
          .slice(0, 8);
            
        for (const [mint, details] of topTokens) {
          const symbol = details.symbol || "Unknown";
          const formattedAmount = details.amount.length > 15 
            ? `${details.amount.substring(0, 12)}...` 
            : details.amount.padEnd(15);
          response += `${symbol.padEnd(12)} | ${formattedAmount.padEnd(18)} | $${details.usdValue.toFixed(2).padEnd(12)}\n`;
        }
        
        // Add a pie chart representation using ASCII
        const totalValue = tokenBalances.totalUsdValue;
        if (totalValue > 0) {
          response += `\n🥧 PORTFOLIO COMPOSITION 🥧\n`;
            
          for (const [mint, details] of topTokens) {
            if (details.usdValue > 0) {
              const percentage = (details.usdValue / totalValue) * 100;
              const barLength = Math.max(1, Math.round((percentage / 100) * 30));
              const symbol = details.symbol || "Unknown";
              response += `${symbol.padEnd(10)} | ${"█".repeat(barLength)} ${percentage.toFixed(1)}%\n`;
            }
          }
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

  // Get Minimum Balance For Rent Exemption
  server.tool(
    "getMinimumBalanceForRentExemption",
    "Used to look up minimum balance required for rent exemption by data size",
    { dataSize: z.number() },
    async ({ dataSize }) => {
      try {
        const minBalance = await connection.getMinimumBalanceForRentExemption(dataSize);
        return {
          content: [{ type: "text", text: `${minBalance / LAMPORTS_PER_SOL} SOL (${minBalance} lamports)` }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Transaction
  server.tool(
    "getTransaction",
    "Used to look up transaction by signature (64 byte base58 encoded string)",
    { signature: z.string() },
    async ({ signature }) => {
      try {
        const transaction = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
        return {
          content: [{ type: "text", text: JSON.stringify(transaction, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
}
