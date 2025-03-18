import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ACTIONS, SolanaAgentKit , startMcpServer  } from "solana-agent-kit";
import * as dotenv from "dotenv";
import { z } from "zod";
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Keypair, Transaction } from "@solana/web3.js";
import { getExplorerLink } from "gill";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import bs58 from "bs58";
import { Helius } from "helius-sdk";

dotenv.config();

// Initialize Helius client with API key from environment variables
const helius = new Helius(process.env.HELIUS_API_KEY || "");

// Type definitions for Helius API responses
interface HeliusAsset {
  id: string;
  content: {
    metadata: any;
    files?: any[];
    json_uri?: string;
    links?: any;
  };
  authorities: any[];
  compression: any;
  grouping: any[];
  royalty: any;
  creators: any[];
  ownership: any;
  supply: any;
  mutable: boolean;
  burnt: boolean;
}

interface HeliusAssetsByOwnerResponse {
  items: HeliusAsset[];
  total: number;
  limit: number;
  page: number;
}

// Jupiter API constants
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

// Type definitions for Solana Trading features
interface SwapQuote {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippage: number;
}

interface WalletDetails {
  publicKey: string;
  privateKey: string;
}

interface SwapResult {
  txid: string;
  status: 'confirmed' | 'failed';
}

interface TokenBalanceSummary {
  tokens: Record<string, {
    amount: string;
    usdValue: number;
    symbol?: string;
  }>;
  histogram: {
    ranges: string[];
    counts: number[];
    distribution: string;
  };
  totalUsdValue: number;
}

// Renamed from SolanaTrader to AMOCASolanaAgent
class AMOCASolanaAgent {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  createWallet(): WalletDetails {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toString(),
      privateKey: bs58.encode(keypair.secretKey),
    };
  }

  importWallet(privateKey: string): WalletDetails {
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
      return {
        publicKey: keypair.publicKey.toString(),
        privateKey,
      };
    } catch (error) {
      throw new Error('Invalid private key');
    }
  }

  async getTokenBalance(walletAddress: string, tokenMint: string): Promise<string> {
    try {
      const wallet = new PublicKey(walletAddress);
      const mint = new PublicKey(tokenMint);
      
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        Keypair.generate(), // dummy signer for read-only
        mint,
        wallet
      );

      const balance = await this.connection.getTokenAccountBalance(tokenAccount.address);
      return balance.value.uiAmountString || '0';
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw error;
    }
  }

  async getTokenPrices(mintAddresses: string[]): Promise<Record<string, { price: number, symbol?: string }>> {
    try {
      // Use Jupiter Price API to fetch token prices
      const response = await fetch("https://price.jup.ag/v4/price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: mintAddresses,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch token prices");
      }
      
      const data = await response.json();
      const prices: Record<string, { price: number, symbol?: string }> = {};
      
      // Format the price data
      for (const mint of mintAddresses) {
        if (data.data && data.data[mint]) {
          prices[mint] = {
            price: data.data[mint].price || 0,
            symbol: data.data[mint].symbol
          };
        } else {
          prices[mint] = { price: 0 };
        }
      }
      
      return prices;
    } catch (error) {
      console.error("Error fetching token prices:", error);
      // Return empty prices if API fails
      return mintAddresses.reduce((acc, mint) => {
        acc[mint] = { price: 0 };
        return acc;
      }, {} as Record<string, { price: number, symbol?: string }>);
    }
  }

  async getAllTokenBalances(walletAddress: string): Promise<TokenBalanceSummary> {
    try {
      const wallet = new PublicKey(walletAddress);
      
      // Get all token accounts owned by this wallet
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        wallet,
        {
          programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // SPL Token program ID
        }
      );
      
      const balances: Record<string, string> = {};
      const mintAddresses: string[] = [];
      
      // Process each token account
      for (const tokenAccount of tokenAccounts.value) {
        const accountInfo = tokenAccount.account;
        const accountData = Buffer.from(accountInfo.data);
        
        // Extract mint address from token account data (first 32 bytes)
        const mintAddress = new PublicKey(accountData.slice(0, 32)).toString();
        mintAddresses.push(mintAddress);
        
        // Get parsed token info for better data presentation
        const parsedAccountInfo = await this.connection.getParsedAccountInfo(tokenAccount.pubkey);
        
        if (parsedAccountInfo.value && 'parsed' in parsedAccountInfo.value.data) {
          const parsedData = parsedAccountInfo.value.data.parsed;
          if ('info' in parsedData && 'tokenAmount' in parsedData.info) {
            const amount = parsedData.info.tokenAmount.uiAmountString || '0';
            balances[mintAddress] = amount;
          }
        }
      }
      
      // Get token prices
      const prices = await this.getTokenPrices(mintAddresses);
      
      // Calculate USD values for each token
      const tokenDetails: Record<string, {amount: string; usdValue: number; symbol?: string}> = {};
      let totalUsdValue = 0;
      
      for (const [mint, amount] of Object.entries(balances)) {
        const price = prices[mint]?.price || 0;
        const usdValue = parseFloat(amount) * price;
        totalUsdValue += usdValue;
        
        tokenDetails[mint] = {
          amount,
          usdValue,
          symbol: prices[mint]?.symbol
        };
      }
      
      // Create histogram data for value distribution
      const ranges = ['$0-$1', '$1-$10', '$10-$100', '$100-$1K', '$1K-$10K', '$10K+'];
      const thresholds = [0, 1, 10, 100, 1000, 10000, Infinity];
      const counts = new Array(ranges.length).fill(0);
      
      // Count tokens in each value range
      for (const token of Object.values(tokenDetails)) {
        for (let i = 0; i < thresholds.length - 1; i++) {
          if (token.usdValue >= thresholds[i] && token.usdValue < thresholds[i + 1]) {
            counts[i]++;
            break;
          }
        }
      }
      
      // Create ASCII histogram
      const maxCount = Math.max(...counts);
      const histogramWidth = 30; // Max width of histogram bars
      
      let distribution = 'Token Value Distribution:\n\n';
      
      for (let i = 0; i < ranges.length; i++) {
        const barWidth = maxCount > 0 ? Math.round((counts[i] / maxCount) * histogramWidth) : 0;
        const bar = '█'.repeat(barWidth);
        distribution += `${ranges[i].padEnd(10)} | ${bar} ${counts[i]}\n`;
      }
      
      return {
        tokens: tokenDetails,
        histogram: {
          ranges,
          counts,
          distribution
        },
        totalUsdValue
      };
    } catch (error) {
      console.error('Error getting all token balances:', error);
      throw error;
    }
  }

  async getSwapQuote(params: SwapQuote): Promise<unknown> {
    try {
      const response = await fetch(
        `${JUPITER_QUOTE_API}/quote?inputMint=${params.inputMint}&outputMint=${params.outputMint}&amount=${params.amount}&slippageBps=${params.slippage * 100}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get swap quote');
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting swap quote:', error);
      throw error;
    }
  }

  async executeSwap(
    quote: unknown,
    walletPrivateKey: string
  ): Promise<SwapResult> {
    try {
      // Get serialized transactions from Jupiter
      const swapResponse = await fetch(`${JUPITER_QUOTE_API}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteResponse: quote,
          userPublicKey: Keypair.fromSecretKey(
            bs58.decode(walletPrivateKey)
          ).publicKey.toString(),
        }),
      });

      if (!swapResponse.ok) {
        throw new Error('Failed to prepare swap transaction');
      }

      const swapData = await swapResponse.json() as { swapTransaction: string };
      const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
      
      // Deserialize and sign transaction
      const transaction = Transaction.from(swapTransactionBuf);
      const keypair = Keypair.fromSecretKey(bs58.decode(walletPrivateKey));
      transaction.sign(keypair);

      // Send transaction
      const txid = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: true }
      );

      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(txid);
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed');
      }

      return {
        txid,
        status: 'confirmed',
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }
}

// Create an MCP server
const server = new McpServer({
    name: "Solana RPC Tools",
    version: "1.0.0",
});

// Initialize Solana connection
const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
// const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Initialize AMOCASolanaAgent with our connection (renamed from trader)
const agent = new AMOCASolanaAgent(connection);

// Solana RPC Methods as Tools

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
server.tool("getTransaction",
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

// New trading tools

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

// Add a dynamic account info resource
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

// Helius API Tools

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

// Get Transaction History
server.tool(
  "getTransactionHistory",
  "Get transaction history for a specific asset or address",
  {
    account: z.string(),
    page: z.number().optional(),
    limit: z.number().optional()
  },
  async ({ account, page, limit }) => {
    try {
      const response = await helius.rpc.getTransactionHistory({
        account,
        options: {
          limit: limit || 100,
          page: page || 1
        }
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

// Get NFT Events
server.tool(
  "getNftEvents",
  "Get NFT events like mints, sales, and listings",
  {
    query: z.object({
      types: z.array(z.string()).optional(),
      sources: z.array(z.string()).optional(),
      collectionId: z.string().optional(),
      walletAddress: z.string().optional(),
    }).optional(),
    options: z.object({
      limit: z.number().optional(),
      page: z.number().optional(),
      sortOrder: z.enum(["ASC", "DESC"]).optional(),
    }).optional(),
  },
  async ({ query, options }) => {
    try {
      const response = await helius.rpc.getNftEvents({
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

// Helius API Prompts

server.prompt(
  'view-nft-collection',
  'Get all NFTs from a collection using Helius API',
  { collectionAddress: z.string() },
  ({ collectionAddress }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Get all NFTs from the collection with address ${collectionAddress} using the Helius API getAssetsByGroup endpoint with groupKey="collection" and groupValue being the collection address. Please summarize the collection and show some key stats like total count, floor price if available.`
      }
    }]
  })
);

server.prompt(
  'view-wallet-nfts',
  'Get all NFTs owned by a wallet using Helius API',
  { walletAddress: z.string() },
  ({ walletAddress }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Get all NFTs owned by the wallet ${walletAddress} using the Helius API getAssetsByOwner endpoint. Please summarize the NFTs by collection and provide a visual overview of the wallet's NFT portfolio.`
      }
    }]
  })
);

server.prompt(
  'nft-transaction-history',
  'Get transaction history for a specific NFT',
  { assetId: z.string() },
  ({ assetId }) => ({
    messages: [{
      role: 'user',
      content: {
        type: 'text',
        text: `Get the transaction history for the NFT with ID ${assetId} using the Helius API getTransactionHistory endpoint. Please analyze the history and provide insights on minting, transfers, sales, and listings if available.`
      }
    }]
  })
);

server.prompt(
    'calculate-storage-deposit',
    'Calculate storage deposit for a specified number of bytes',
    { bytes: z.string() },
    ({ bytes }) => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `Calculate the SOL amount needed to store ${bytes} bytes of data on Solana using getMinimumBalanceForRentExemption.`
            }
        }]
    })
);

server.prompt(
    'minimum-amount-of-sol-for-storage',
    'Calculate the minimum amount of SOL needed for storing 0 bytes on-chain',
    () => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `Calculate the amount of SOL needed to store 0 bytes of data on Solana using getMinimumBalanceForRentExemption & present it to the user as the minimum cost for storing any data on Solana.`
            }
        }]
    })
);

server.prompt(
    'why-did-my-transaction-fail',
    'Look up the given transaction and inspect its logs to figure out why it failed',
    { signature: z.string() },
    ({ signature }) => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `Look up the transaction with signature ${signature} and inspect its logs to figure out why it failed.`
            }
        }]
    })
);

server.prompt(
    'how-much-did-this-transaction-cost',
    'Fetch the transaction by signature, and break down cost & priority fees',
    { signature: z.string() },
    ({ signature }) => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `Calculate the network fee for the transaction with signature ${signature} by fetching it and inspecting the 'fee' field in 'meta'. Base fee is 0.000005 sol per signature (also provided as array at the end). So priority fee is fee - (numSignatures * 0.000005). Please provide the base fee and the priority fee.`
            }
        }]
    })
);

server.prompt('what-happened-in-transaction',
    'Look up the given transaction and inspect its logs & instructions to figure out what happened',
    { signature: z.string() },
    ({ signature }) => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `Look up the transaction with signature ${signature} and inspect its logs & instructions to figure out what happened.`
            }
        }]
    })
);

server.prompt(
    'account-balance',
    'Fetch and analyze all token balances for a Solana wallet address',
    { walletAddress: z.string() },
    ({ walletAddress }) => ({
        messages: [{
            role: 'user',
            content: {
                type: 'text',
                text: `Get all token balances for the wallet address ${walletAddress}, analyze their USD values, and provide a summary of the wallet's portfolio including total value and distribution of assets.`
            }
        }]
    })
);

// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
server.connect(transport);