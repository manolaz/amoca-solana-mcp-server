import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registerResourceTools(server: McpServer) {
  // Setup specific resources to read from solana.com/docs pages
  server.resource(
    "solanaDocsInstallation",
    new ResourceTemplate("solana://docs/intro/installation", { list: undefined }),
    async (uri) => {
      try {
        const response = await fetch(`https://raw.githubusercontent.com/solana-foundation/solana-com/main/content/docs/intro/installation.mdx`);
        const fileContent = await response.text();
        return {
          contents: [{
            uri: uri.href,
            text: fileContent
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error: ${(error as Error).message}`
          }]
        };
      }
    }
  );

  server.resource(
    "solanaDocsClusters",
    new ResourceTemplate("solana://docs/references/clusters", { list: undefined }),
    async (uri) => {
      try {
        const response = await fetch(`https://raw.githubusercontent.com/solana-foundation/solana-com/main/content/docs/references/clusters.mdx`);
        const fileContent = await response.text();
        return {
          contents: [{
            uri: uri.href,
            text: fileContent
          }]
        };
      } catch (error) {
        return {
          contents: [{
            uri: uri.href,
            text: `Error: ${(error as Error).message}`
          }]
        };
      }
    }
  );
}
