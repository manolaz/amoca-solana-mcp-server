import { ACTIONS, SolanaAgentKit, startMcpServer } from "solana-agent-kit";
import * as dotenv from "dotenv";
import { z } from "zod";
import bs58 from "bs58";

dotenv.config();

// Create the SolanaAgentKit instance
const agent = new SolanaAgentKit(
    process.env.SOLANA_PRIVATE_KEY || "",   // If no private key provided, will generate a new one
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com", 
    {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    }
);

// Define custom actions that match our functionality
const customActions = {
    // Standard actions from the package
    GET_BALANCE: ACTIONS.GET_BALANCE_ACTION,
    GET_TRANSACTION: ACTIONS.GET_TRANSACTION_ACTION,
    GET_ACCOUNT_INFO: ACTIONS.GET_ACCOUNT_INFO_ACTION,
    GET_MINIMUM_BALANCE_FOR_RENT_EXEMPTION: ACTIONS.GET_RENT_EXEMPTION_ACTION,
    
    // Custom trading actions
    CREATE_WALLET: {
        name: "createWallet",
        description: "Create a new Solana wallet keypair",
        parameters: {},
        handler: async () => {
            try {
                const keypair = agent.createWallet();
                return {
                    publicKey: keypair.publicKey.toString(),
                    privateKey: bs58.encode(keypair.secretKey),
                };
            } catch (error) {
                throw new Error(`Error creating wallet: ${(error as Error).message}`);
            }
        }
    },

    IMPORT_WALLET: {
        name: "importWallet",
        description: "Import an existing Solana wallet using private key",
        parameters: {
            privateKey: z.string().describe("Private key in base58 format")
        },
        handler: async ({ privateKey }) => {
            try {
                const keypair = agent.importWallet(privateKey);
                return {
                    publicKey: keypair.publicKey.toString(),
                    privateKey,
                };
            } catch (error) {
                throw new Error(`Invalid private key: ${(error as Error).message}`);
            }
        }
    },
    
    GET_TOKEN_BALANCE: {
        name: "getTokenBalance",
        description: "Get token balance for a wallet",
        parameters: {
            walletAddress: z.string().describe("Wallet address to check"),
            tokenMint: z.string().describe("Token mint address")
        },
        handler: async ({ walletAddress, tokenMint }) => {
            try {
                const balance = await agent.getTokenBalance(walletAddress, tokenMint);
                return balance;
            } catch (error) {
                throw new Error(`Error getting token balance: ${(error as Error).message}`);
            }
        }
    },
    
    GET_ALL_TOKEN_BALANCES: {
        name: "getAllTokenBalances",
        description: "Get all token balances for a wallet with USD value distribution",
        parameters: {
            walletAddress: z.string().describe("Wallet address to check")
        },
        handler: async ({ walletAddress }) => {
            try {
                const balanceSummary = await agent.getAllTokenBalances(walletAddress);
                return balanceSummary;
            } catch (error) {
                throw new Error(`Error getting all token balances: ${(error as Error).message}`);
            }
        }
    },
    
    GET_SWAP_QUOTE: {
        name: "getSwapQuote",
        description: "Get a quote for swapping tokens via Jupiter",
        parameters: {
            inputMint: z.string().describe("Input token mint address"),
            outputMint: z.string().describe("Output token mint address"),
            amount: z.string().describe("Amount to swap in smallest units"),
            slippage: z.number().describe("Slippage tolerance (0.01 = 1%)")
        },
        handler: async ({ inputMint, outputMint, amount, slippage }) => {
            try {
                return await agent.getSwapQuote({
                    inputMint,
                    outputMint,
                    amount,
                    slippage
                });
            } catch (error) {
                throw new Error(`Error getting swap quote: ${(error as Error).message}`);
            }
        }
    },
    
    EXECUTE_SWAP: {
        name: "executeSwap",
        description: "Execute a token swap using Jupiter",
        parameters: {
            quote: z.any().describe("Quote object returned by getSwapQuote"),
            walletPrivateKey: z.string().describe("Private key of the wallet to use for the swap")
        },
        handler: async ({ quote, walletPrivateKey }) => {
            try {
                return await agent.executeSwap(quote, walletPrivateKey);
            } catch (error) {
                throw new Error(`Error executing swap: ${(error as Error).message}`);
            }
        }
    }
};

// Define prompts for common Solana operations
const prompts = {
    CALCULATE_STORAGE_DEPOSIT: {
        name: 'calculate-storage-deposit',
        description: 'Calculate storage deposit for a specified number of bytes',
        parameters: {
            bytes: z.string().describe('Number of bytes to store')
        },
        messages: ({ bytes }) => ({
            role: 'user',
            content: `Calculate the SOL amount needed to store ${bytes} bytes of data on Solana using getMinimumBalanceForRentExemption.`
        })
    },
    
    MINIMUM_STORAGE_COST: {
        name: 'minimum-amount-of-sol-for-storage',
        description: 'Calculate the minimum amount of SOL needed for storing 0 bytes on-chain',
        parameters: {},
        messages: () => ({
            role: 'user',
            content: 'Calculate the amount of SOL needed to store 0 bytes of data on Solana using getMinimumBalanceForRentExemption & present it as the minimum cost for storing any data on Solana.'
        })
    },
    
    TRANSACTION_FAILURE_ANALYSIS: {
        name: 'why-did-my-transaction-fail',
        description: 'Look up the given transaction and inspect its logs to figure out why it failed',
        parameters: {
            signature: z.string().describe('Transaction signature')
        },
        messages: ({ signature }) => ({
            role: 'user',
            content: `Look up the transaction with signature ${signature} and inspect its logs to figure out why it failed.`
        })
    },
    
    TRANSACTION_COST_ANALYSIS: {
        name: 'how-much-did-this-transaction-cost',
        description: 'Fetch the transaction by signature, and break down cost & priority fees',
        parameters: {
            signature: z.string().describe('Transaction signature')
        },
        messages: ({ signature }) => ({
            role: 'user',
            content: `Calculate the network fee for the transaction with signature ${signature} by fetching it and inspecting the 'fee' field in 'meta'. Break down base fee vs priority fee.`
        })
    },
    
    TRANSACTION_ANALYSIS: {
        name: 'what-happened-in-transaction',
        description: 'Look up the transaction and analyze what happened',
        parameters: {
            signature: z.string().describe('Transaction signature')
        },
        messages: ({ signature }) => ({
            role: 'user',
            content: `Look up the transaction with signature ${signature} and inspect its logs & instructions to figure out what happened.`
        })
    },
    
    WALLET_PORTFOLIO_ANALYSIS: {
        name: 'account-balance',
        description: 'Fetch and analyze all token balances for a Solana wallet address',
        parameters: {
            walletAddress: z.string().describe('Wallet address to analyze')
        },
        messages: ({ walletAddress }) => ({
            role: 'user',
            content: `Get all token balances for the wallet address ${walletAddress}, analyze their USD values, and provide a summary of the wallet's portfolio.`
        })
    }
};

// Define resources to include Solana documentation
const resources = {
    SOLANA_DOCS_INSTALLATION: {
        name: "solanaDocsInstallation",
        template: "solana://docs/intro/installation",
        handler: async (uri) => {
            try {
                const response = await fetch(`https://raw.githubusercontent.com/solana-foundation/solana-com/main/content/docs/intro/installation.mdx`);
                const fileContent = await response.text();
                return {
                    uri: uri.href,
                    text: fileContent
                };
            } catch (error) {
                return {
                    uri: uri.href,
                    text: `Error: ${(error as Error).message}`
                };
            }
        }
    },
    
    SOLANA_DOCS_CLUSTERS: {
        name: "solanaDocsClusters",
        template: "solana://docs/references/clusters",
        handler: async (uri) => {
            try {
                const response = await fetch(`https://raw.githubusercontent.com/solana-foundation/solana-com/main/content/docs/references/clusters.mdx`);
                const fileContent = await response.text();
                return {
                    uri: uri.href,
                    text: fileContent
                };
            } catch (error) {
                return {
                    uri: uri.href,
                    text: `Error: ${(error as Error).message}`
                };
            }
        }
    }
};

// Start the MCP server with our defined actions
startMcpServer(
    customActions, 
    agent, 
    { 
        name: "AMOCA Solana RPC Tools", 
        version: "0.0.1",
        prompts,
        resources
    }
);