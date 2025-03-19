export const LAMPORTS_PER_SOL = 1_000_000_000;

// Common network endpoints
export const SOLANA_NETWORKS = {
  MAINNET: 'https://api.mainnet-beta.solana.com',
  TESTNET: 'https://api.testnet.solana.com',
  DEVNET: 'https://api.devnet.solana.com',
  LOCALNET: 'http://localhost:8899',
};

// Transaction confirmation levels
export const COMMITMENT_LEVELS = {
  PROCESSED: 'processed',
  CONFIRMED: 'confirmed',
  FINALIZED: 'finalized',
};

// Common error messages
export const ERROR_MESSAGES = {
  INVALID_ADDRESS: 'Invalid Solana address',
  INSUFFICIENT_FUNDS: 'Insufficient funds for transaction',
  CONNECTION_FAILED: 'Failed to connect to the Solana network',
  TRANSACTION_FAILED: 'Transaction failed to complete',
};

// Common local storage keys
export const STORAGE_KEYS = {
  WALLET_PUBKEY: 'walletPubkey',
  RECENT_TRANSACTIONS: 'recentTransactions',
  USER_SETTINGS: 'userSettings',
};

// Rate limiting constants
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_SECOND: 10,
  REQUEST_TIMEOUT_MS: 30000,
};
