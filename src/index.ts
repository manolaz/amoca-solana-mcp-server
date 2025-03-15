import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ACTIONS, SolanaAgentKit , startMcpServer  } from "solana-agent-kit";
import * as dotenv from "dotenv";
import { z } from "zod";
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Keypair, Transaction } from "@solana/web3.js";
import { getExplorerLink } from "gill";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import bs58 from "bs58";

dotenv.config();

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
    "Used to look up balance by public key (32 byte base58 encoded address)",
    { publicKey: z.string() },
    async ({ publicKey }) => {
        try {
            const pubkey = new PublicKey(publicKey);
            const balance = await connection.getBalance(pubkey);
            return {
                content: [{ type: "text", text: `${balance / LAMPORTS_PER_SOL} SOL (${balance} lamports)` }]
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


// Start receiving messages on stdin and sending messages on stdout
const transport = new StdioServerTransport();
server.connect(transport);