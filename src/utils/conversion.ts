import { PublicKey } from '@solana/web3.js';
import { LAMPORTS_PER_SOL } from './constants';

/**
 * Converts lamports to SOL
 * @param lamports Amount in lamports
 * @returns Amount in SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Converts SOL to lamports
 * @param sol Amount in SOL
 * @returns Amount in lamports
 */
export function solToLamports(sol: number): number {
  return sol * LAMPORTS_PER_SOL;
}

/**
 * Converts a base58 string to a Buffer
 * @param base58String The base58 string
 * @returns Buffer representation
 */
export function base58ToBuffer(base58String: string): Buffer {
  return PublicKey.fromString(base58String).toBuffer();
}

/**
 * Converts a Buffer to a base58 string
 * @param buffer The buffer to convert
 * @returns Base58 string representation
 */
export function bufferToBase58(buffer: Buffer): string {
  return new PublicKey(buffer).toString();
}
