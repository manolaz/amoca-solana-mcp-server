import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GraphQLClient } from 'graphql-request';

// Create a GraphQL client for common Solana data providers
const createGraphQLClient = (endpoint: string) => {
  return new GraphQLClient(endpoint);
};

export function registerGraphQLTools(server: McpServer) {
  // Generic GraphQL Query Tool
  server.tool(
    "executeGraphQLQuery",
    "Execute a GraphQL query against Solana data providers",
    {
      endpoint: z.string(),
      query: z.string(),
      variables: z.record(z.any()).optional()
    },
    async ({ endpoint, query, variables }) => {
      try {
        const client = createGraphQLClient(endpoint);
        const response = await client.request(query, variables || {});
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

  // The Graph Protocol - Solana Subgraphs Query
  server.tool(
    "querySubgraph",
    "Query a Solana subgraph from The Graph Protocol",
    {
      subgraphUrl: z.string(),
      query: z.string(),
      variables: z.record(z.any()).optional()
    },
    async ({ subgraphUrl, query, variables }) => {
      try {
        const client = createGraphQLClient(subgraphUrl);
        const response = await client.request(query, variables || {});
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

  // NFT Floor Price Lookup
  server.tool(
    "getNFTCollectionStats",
    "Get statistics for an NFT collection using a GraphQL API",
    {
      collectionAddress: z.string()
    },
    async ({ collectionAddress }) => {
      try {
        // Example endpoint (this should be replaced with a real Solana NFT API endpoint)
        const client = createGraphQLClient("https://api.hexanode.com/graphql");
        
        const query = `
          query GetCollectionStats($address: String!) {
            collection(address: $address) {
              name
              floorPrice
              volumeTotal
              totalListings
              averagePrice24hr
              totalItems
              uniqueHolders
            }
          }
        `;
        
        const response = await client.request(query, { address: collectionAddress });
        
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error or collection not found: ${(error as Error).message}` 
          }]
        };
      }
    }
  );

  // DEX Pool Data
  server.tool(
    "getDEXPoolData",
    "Get Solana DEX pool/liquidity data using GraphQL",
    {
      poolAddress: z.string()
    },
    async ({ poolAddress }) => {
      try {
        // Example endpoint (this should be replaced with a real DEX API endpoint)
        const client = createGraphQLClient("https://api.orca.so/graphql");
        
        const query = `
          query GetPoolData($address: String!) {
            pool(address: $address) {
              address
              tokenA {
                symbol
                address
                decimals
              }
              tokenB {
                symbol
                address
                decimals
              }
              liquidity
              volume24h
              fee
              apr
              price
            }
          }
        `;
        
        const response = await client.request(query, { address: poolAddress });
        
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: "text", 
            text: `Error or pool not found: ${(error as Error).message}` 
          }]
        };
      }
    }
  );
}
