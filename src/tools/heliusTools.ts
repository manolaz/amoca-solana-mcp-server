import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { Helius } from "helius-sdk";

export function registerHeliusTools(server: McpServer, helius: Helius) {
  // Get Assets By Owner
  server.tool(
    "getAssetsByOwner",
    "Get DAS API compliant NFTs owned by a specific address",
    {
      ownerAddress: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ ownerAddress, page, limit }) => {
      try {
        const response = await helius.rpc.getAssetsByOwner({
          ownerAddress,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Asset
  server.tool(
    "getAsset",
    "Get detailed information about a specific asset by its ID",
    {
      id: z.string()
    },
    async ({ id }) => {
      try {
        const response = await helius.rpc.getAsset({
          id
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Assets By Group
  server.tool(
    "getAssetsByGroup",
    "Get assets that belong to a specific group (like collection)",
    {
      groupKey: z.string(),
      groupValue: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ groupKey, groupValue, page, limit }) => {
      try {
        const response = await helius.rpc.getAssetsByGroup({
          groupKey,
          groupValue,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Search Assets
  server.tool(
    "searchAssets",
    "Search for assets using complex query parameters",
    {
      query: z.object({
        ownerAddress: z.string().optional(),
        creatorAddress: z.string().optional(),
        collectionAddress: z.string().optional(),
        grouping: z.array(z.object({
          group_key: z.string(),
          group_value: z.string()
        })).optional(),
        burnt: z.boolean().optional(),
        compressible: z.boolean().optional(),
        compressed: z.boolean().optional(),
        tokenType: z.enum(["fungible", "nonFungible"]).optional()
      }).optional(),
      options: z.object({
        limit: z.number().optional(),
        page: z.number().optional(),
        sortBy: z.enum(["created", "updated"]).optional(),
        sortDirection: z.enum(["asc", "desc"]).optional()
      }).optional()
    },
    async ({ query, options }) => {
      try {
        const response = await helius.rpc.searchAssets({
          query: query || {},
          options: options || { limit: 100, page: 1 }
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Asset Proof
  server.tool(
    "getAssetProof",
    "Get the merkle proof for a compressed NFT",
    {
      id: z.string()
    },
    async ({ id }) => {
      try {
        const response = await helius.rpc.getAssetProof({
          id
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Assets By Creator
  server.tool(
    "getAssetsByCreator",
    "Get assets created by a specific creator address",
    {
      creatorAddress: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ creatorAddress, page, limit }) => {
      try {
        const response = await helius.rpc.getAssetsByCreator({
          creatorAddress,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get Assets By Authority
  server.tool(
    "getAssetsByAuthority",
    "Get assets by update authority address",
    {
      authorityAddress: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ authorityAddress, page, limit }) => {
      try {
        const response = await helius.rpc.getAssetsByAuthority({
          authorityAddress,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Get NFT Editions
  server.tool(
    "getNftEditions",
    "Get all editions of a master edition NFT",
    {
      masterEditionAddress: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ masterEditionAddress, page, limit }) => {
      try {
        const response = await helius.rpc.getNftEditions({
          masterEditionAddress,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Mintlist API
  server.tool(
    "getMintlist",
    "Get mintlist for a collection",
    {
      collectionAddress: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ collectionAddress, page, limit }) => {
      try {
        const response = await helius.mint.getMintlist({
          collectionAddress,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Webhook Management
  server.tool(
    "getAllWebhooks",
    "Get all webhooks for your Helius API key",
    {},
    async () => {
      try {
        const response = await helius.webhooks.getAllWebhooks();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "getWebhookByID",
    "Get webhook details by webhook ID",
    {
      webhookID: z.string()
    },
    async ({ webhookID }) => {
      try {
        const response = await helius.webhooks.getWebhookByID({
          webhookID
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "createWebhook",
    "Create a new webhook for address activity monitoring",
    {
      webhook: z.object({
        webhookURL: z.string(),
        transactionTypes: z.array(z.string()),
        accountAddresses: z.array(z.string()),
        webhookType: z.string(),
        authHeader: z.string().optional(),
        txnStatus: z.enum(["all", "success", "fail"]).optional()
      })
    },
    async ({ webhook }) => {
      try {
        const response = await helius.webhooks.createWebhook({
          webhook
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "createCollectionWebhook",
    "Create a webhook to monitor NFT collections",
    {
      webhook: z.object({
        webhookURL: z.string(),
        transactionTypes: z.array(z.string()),
        collectionQuery: z.object({
          firstVerifiedCreators: z.array(z.string()).optional(),
          verifiedCollectionAddresses: z.array(z.string()).optional()
        }),
        webhookType: z.string(),
        authHeader: z.string().optional(),
        txnStatus: z.enum(["all", "success", "fail"]).optional()
      })
    },
    async ({ webhook }) => {
      try {
        const response = await helius.webhooks.createCollectionWebhook({
          webhook
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "deleteWebhook",
    "Delete a webhook by its ID",
    {
      webhookID: z.string()
    },
    async ({ webhookID }) => {
      try {
        const response = await helius.webhooks.deleteWebhook({
          webhookID
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  // Utils
  server.tool(
    "getCurrentTPS",
    "Get current transactions per second on Solana",
    {},
    async () => {
      try {
        const response = await helius.utils.getCurrentTPS();
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "getTokenHolders",
    "Get holders of a specific token by mint address",
    {
      mintAddress: z.string(),
      page: z.number().optional(),
      limit: z.number().optional()
    },
    async ({ mintAddress, page, limit }) => {
      try {
        const response = await helius.utils.getTokenHolders({
          mintAddress,
          page: page || 1,
          limit: limit || 100
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "getPriorityFeeEstimate",
    "Get estimated priority fees for transactions",
    {
      accountKeys: z.array(z.string())
    },
    async ({ accountKeys }) => {
      try {
        const response = await helius.utils.getPriorityFeeEstimate({
          accountKeys
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "getStakeAccounts",
    "Get stake accounts by their owner address",
    {
      ownerAddress: z.string()
    },
    async ({ ownerAddress }) => {
      try {
        const response = await helius.utils.getStakeAccounts({
          ownerAddress
        });
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );

  server.tool(
    "getComputeUnits",
    "Simulate a transaction to get the total compute units consumed",
    {
      instructions: z.array(z.any()),
      payerKey: z.string(),
      lookupTables: z.array(z.any()).optional(),
      signers: z.array(z.any()).optional()
    },
    async ({ instructions, payerKey, lookupTables, signers }) => {
      try {
        const response = await helius.rpc.getComputeUnits({
          instructions,
          payerKey,
          lookupTables: lookupTables || [],
          signers: signers || []
        });
        
        if (response === null) {
          return {
            content: [{ type: "text", text: "Simulation failed: Unable to determine compute units" }]
          };
        }
        
        return {
          content: [{ 
            type: "text", 
            text: `Simulation successful!\nCompute Units Consumed: ${response}` 
          }]
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${(error as Error).message}` }]
        };
      }
    }
  );
}
