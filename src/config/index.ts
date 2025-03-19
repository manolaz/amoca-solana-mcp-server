/**
 * Configuration for the Solana MCP Agent
 */

// Default Solana cluster configurations
export const CLUSTER_CONFIGS = {
  mainnet: {
    name: "mainnet-beta",
    endpoint: "https://api.mainnet-beta.solana.com",
    websocket: "wss://api.mainnet-beta.solana.com",
    explorer: "https://explorer.solana.com"
  },
  devnet: {
    name: "devnet",
    endpoint: "https://api.devnet.solana.com",
    websocket: "wss://api.devnet.solana.com",
    explorer: "https://explorer.solana.com/?cluster=devnet"
  },
  testnet: {
    name: "testnet",
    endpoint: "https://api.testnet.solana.com",
    websocket: "wss://api.testnet.solana.com",
    explorer: "https://explorer.solana.com/?cluster=testnet"
  },
  localnet: {
    name: "localhost",
    endpoint: "http://localhost:8899",
    websocket: "ws://localhost:8900",
    explorer: ""
  }
};

// API endpoints for various services
export const API_ENDPOINTS = {
  // Jupiter DEX aggregator
  jupiter: {
    quoteApi: "https://quote-api.jup.ag/v6",
    priceApi: "https://price.jup.ag/v4"
  },
  // Public indexers
  indexers: {
    solscan: "https://public-api.solscan.io",
    birdeye: "https://public-api.birdeye.so/public"
  },
  // NFT marketplaces
  nftMarketplaces: {
    magicEden: "https://api-mainnet.magiceden.dev/v2",
    tensorTrade: "https://api.tensor.trade/graphql"
  }
};

// Token-related constants
export const TOKEN_CONSTANTS = {
  // SPL Token Program ID
  TOKEN_PROGRAM_ID: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  // Associated Token Account Program ID
  ASSOCIATED_TOKEN_PROGRAM_ID: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  // Well-known token mints
  WRAPPED_SOL_MINT: "So11111111111111111111111111111111111111112",
  USDC_MINT: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  USDT_MINT: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"
};

// Default request timeouts in milliseconds
export const TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds
  EXTENDED: 60000  // 60 seconds
};

// Default pagination limits
export const PAGINATION = {
  DEFAULT_LIMIT: 100,
  MAX_LIMIT: 1000
};
