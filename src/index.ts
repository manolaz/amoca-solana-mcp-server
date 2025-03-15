import { ACTIONS, SolanaAgentKit, startMcpServer } from "solana-agent-kit";
import * as dotenv from "dotenv";
import { z } from "zod";
import bs58 from "bs58";
import chalk from "chalk";

dotenv.config();

// Define the ThoughtData interface
interface ThoughtData {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
  nextThoughtNeeded: boolean;
}

// Sequential Thinking Server implementation
class SequentialThinkingServer {
  private thoughtHistory: ThoughtData[] = [];
  private branches: Record<string, ThoughtData[]> = {};

  private validateThoughtData(input: unknown): ThoughtData {
    const data = input as Record<string, unknown>;

    if (!data.thought || typeof data.thought !== 'string') {
      throw new Error('Invalid thought: must be a string');
    }
    if (!data.thoughtNumber || typeof data.thoughtNumber !== 'number') {
      throw new Error('Invalid thoughtNumber: must be a number');
    }
    if (!data.totalThoughts || typeof data.totalThoughts !== 'number') {
      throw new Error('Invalid totalThoughts: must be a number');
    }
    if (typeof data.nextThoughtNeeded !== 'boolean') {
      throw new Error('Invalid nextThoughtNeeded: must be a boolean');
    }

    return {
      thought: data.thought,
      thoughtNumber: data.thoughtNumber,
      totalThoughts: data.totalThoughts,
      nextThoughtNeeded: data.nextThoughtNeeded,
      isRevision: data.isRevision as boolean | undefined,
      revisesThought: data.revisesThought as number | undefined,
      branchFromThought: data.branchFromThought as number | undefined,
      branchId: data.branchId as string | undefined,
      needsMoreThoughts: data.needsMoreThoughts as boolean | undefined,
    };
  }

  private formatThought(thoughtData: ThoughtData): string {
    const { thoughtNumber, totalThoughts, thought, isRevision, revisesThought, branchFromThought, branchId } = thoughtData;

    let prefix = '';
    let context = '';

    if (isRevision) {
      prefix = chalk.yellow('🔄 Revision');
      context = ` (revising thought ${revisesThought})`;
    } else if (branchFromThought) {
      prefix = chalk.green('🌿 Branch');
      context = ` (from thought ${branchFromThought}, ID: ${branchId})`;
    } else {
      prefix = chalk.blue('💭 Thought');
      context = '';
    }

    const header = `${prefix} ${thoughtNumber}/${totalThoughts}${context}`;
    const border = '─'.repeat(Math.max(header.length, thought.length) + 4);

    return `
┌${border}┐
│ ${header} │
├${border}┤
│ ${thought.padEnd(border.length - 2)} │
└${border}┘`;
  }

  public processThought(input: unknown): { content: Array<{ type: string; text: string }>; isError?: boolean } {
    try {
      const validatedInput = this.validateThoughtData(input);

      if (validatedInput.thoughtNumber > validatedInput.totalThoughts) {
        validatedInput.totalThoughts = validatedInput.thoughtNumber;
      }

      this.thoughtHistory.push(validatedInput);

      if (validatedInput.branchFromThought && validatedInput.branchId) {
        if (!this.branches[validatedInput.branchId]) {
          this.branches[validatedInput.branchId] = [];
        }
        this.branches[validatedInput.branchId].push(validatedInput);
      }

      const formattedThought = this.formatThought(validatedInput);
      console.error(formattedThought);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            thoughtNumber: validatedInput.thoughtNumber,
            totalThoughts: validatedInput.totalThoughts,
            nextThoughtNeeded: validatedInput.nextThoughtNeeded,
            branches: Object.keys(this.branches),
            thoughtHistoryLength: this.thoughtHistory.length
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            error: error instanceof Error ? error.message : String(error),
            status: 'failed'
          }, null, 2)
        }],
        isError: true
      };
    }
  }
}

// Create the SolanaAgentKit instance
const agent = new SolanaAgentKit(
    process.env.SOLANA_PRIVATE_KEY || "",   // If no private key provided, will generate a new one
    process.env.RPC_URL || "https://api.mainnet-beta.solana.com", 
    {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || "",
    }
);

// Define the sequential thinking tool
const SEQUENTIAL_THINKING_TOOL = {
  name: "sequentialthinking",
  description: `A detailed tool for dynamic and reflective problem-solving through thoughts.
This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
Each thought can build on, question, or revise previous insights as understanding deepens.

When to use this tool:
- Breaking down complex problems into steps
- Planning and design with room for revision
- Analysis that might need course correction
- Problems where the full scope might not be clear initially
- Problems that require a multi-step solution
- Tasks that need to maintain context over multiple steps
- Situations where irrelevant information needs to be filtered out

Key features:
- You can adjust total_thoughts up or down as you progress
- You can question or revise previous thoughts
- You can add more thoughts even after reaching what seemed like the end
- You can express uncertainty and explore alternative approaches
- Not every thought needs to build linearly - you can branch or backtrack
- Generates a solution hypothesis
- Verifies the hypothesis based on the Chain of Thought steps
- Repeats the process until satisfied
- Provides a correct answer`,
  parameters: {
    thought: z.string().describe("Your current thinking step"),
    nextThoughtNeeded: z.boolean().describe("Whether another thought step is needed"),
    thoughtNumber: z.number().int().min(1).describe("Current thought number"),
    totalThoughts: z.number().int().min(1).describe("Estimated total thoughts needed"),
    isRevision: z.boolean().optional().describe("Whether this revises previous thinking"),
    revisesThought: z.number().int().min(1).optional().describe("Which thought is being reconsidered"),
    branchFromThought: z.number().int().min(1).optional().describe("Branching point thought number"),
    branchId: z.string().optional().describe("Branch identifier"),
    needsMoreThoughts: z.boolean().optional().describe("If more thoughts are needed")
  },
  handler: async (params: any) => {
    const thinkingServer = new SequentialThinkingServer();
    return thinkingServer.processThought(params);
  }
};

// Define custom actions that match our functionality
const customActions = {
    // Standard actions from the package
    GET_BALANCE: ACTIONS.GET_BALANCE_ACTION,
    GET_TRANSACTION: ACTIONS.GET_TRANSACTION_ACTION,
    GET_ACCOUNT_INFO: ACTIONS.GET_ACCOUNT_INFO_ACTION,
    GET_MINIMUM_BALANCE_FOR_RENT_EXEMPTION: ACTIONS.GET_RENT_EXEMPTION_ACTION,
    
    // Add the sequential thinking tool
    SEQUENTIAL_THINKING: SEQUENTIAL_THINKING_TOOL,
    
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