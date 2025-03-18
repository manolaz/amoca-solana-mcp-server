import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AMOCASolanaAgent } from "../agent";

export function registerTradingTools(server: McpServer, agent: AMOCASolanaAgent) {
  // Get Swap Quote
  server.tool(
    "getSwapQuote",
    "Get a quote for swapping tokens via Jupiter",
    {
      inputMint: z.string(),
      outputMint: z.string(),
      amount: z.string(),
      slippage: z.number()
    },
    async ({ inputMint, outputMint, amount, slippage }) => {
      try {
        const quote = await agent.getSwapQuote({
          inputMint,
          outputMint,
          amount,
          slippage
        });
        return {
          content: [{ type: "text", text: JSON.stringify(quote, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Execute Swap
  server.tool(
    "executeSwap",
    "Execute a token swap using Jupiter",
    {
      quote: z.any(),
      walletPrivateKey: z.string()
    },
    async ({ quote, walletPrivateKey }) => {
      try {
        const result = await agent.executeSwap(quote, walletPrivateKey);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
}
