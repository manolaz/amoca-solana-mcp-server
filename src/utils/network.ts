import { 
  Connection, 
  Commitment, 
  ConnectionConfig 
} from '@solana/web3.js';

/**
 * Get a Solana connection for a specific endpoint
 * @param endpoint RPC endpoint URL
 * @param commitment Commitment level
 * @returns Connection object
 */
export function getSolanaConnection(
  endpoint: string, 
  commitment: Commitment = 'confirmed'
): Connection {
  const config: ConnectionConfig = { commitment };
  return new Connection(endpoint, config);
}

/**
 * Sleep for a specified amount of time
 * @param ms Milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param maxRetries Maximum number of retries
 * @param initialDelayMs Initial delay in milliseconds
 * @returns Promise with the function's result
 */
export async function retry<T>(
  fn: () => Promise<T>, 
  maxRetries: number = 3, 
  initialDelayMs: number = 500
): Promise<T> {
  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      await sleep(delay);
      delay *= 2; // Exponential backoff
    }
  }

  throw lastError || new Error('Operation failed after multiple retries');
}
