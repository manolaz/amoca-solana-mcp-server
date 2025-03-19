import { PublicKey } from '@solana/web3.js';

/**
 * Checks if a string is a valid Solana public key
 * @param address The address to validate
 * @returns Boolean indicating if the address is valid
 */
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Validates that a value is not null or undefined
 * @param value The value to check
 * @returns Boolean indicating if the value exists
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Checks if the input is a valid number
 * @param value Value to check
 * @returns Boolean indicating if it's a valid number
 */
export function isValidNumber(value: any): boolean {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
