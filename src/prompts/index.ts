import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerPrompts(server: McpServer) {
  server.prompt(
    'collection-analysis',
    'Get a detailed analysis of an NFT collection',
    { collectionAddress: z.string() },
    ({ collectionAddress }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze the NFT collection with address ${collectionAddress}. Use the Helius API getAssetsByGroup endpoint with groupKey="collection" and groupValue being the collection address. For deeper insight, also fetch mintlist information using getMintlist. Provide statistics about rarity distribution, holder distribution, and market activity if available.`
        }
      }]
    })
  );

  server.prompt(
    'monitor-nft-collection',
    'Set up a webhook to monitor NFT collection activity',
    { 
      collectionAddress: z.string(),
      webhookUrl: z.string().optional()
    },
    ({ collectionAddress, webhookUrl }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Help me set up a webhook to monitor activity for the NFT collection with address ${collectionAddress}. ${webhookUrl ? `The webhook URL is ${webhookUrl}.` : 'Generate sample code that I can use to set up a webhook later.'} Include monitoring for mints, sales, listings, and transfers. Explain how I can process webhook events when they arrive.`
        }
      }]
    })
  );

  server.prompt(
    'network-status',
    'Get Solana network status information',
    {},
    () => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Get the current Solana network status including TPS, average block time, and priority fee estimates. Analyze if this is a good time to send transactions or if the network is congested.`
        }
      }]
    })
  );

  // Additional useful prompts
  server.prompt(
    'wallet-analysis',
    'Analyze a Solana wallet portfolio with recommendations',
    { walletAddress: z.string() },
    ({ walletAddress }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Perform a comprehensive analysis of the wallet ${walletAddress}. Get the SOL balance and token balances, then identify portfolio composition, top holdings, and value distribution. Also check NFTs owned by this address. Provide insights about the wallet's activity and any recommendations for portfolio management.`
        }
      }]
    })
  );

  server.prompt(
    'token-swap-guide',
    'Get a step-by-step guide for swapping tokens with best rates',
    { 
      inputToken: z.string(),
      outputToken: z.string(),
      amount: z.string().optional() 
    },
    ({ inputToken, outputToken, amount }) => ({
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `I want to swap ${amount ? amount : 'some'} ${inputToken} for ${outputToken} on Solana. Get the latest swap quote, explain the expected output, slippage impact, and best practices for executing this swap. Include steps for setting up the transaction and information about current market conditions affecting this pair.`
        }
      }]
    })
  );
}
