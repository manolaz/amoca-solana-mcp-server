import { 
  Keypair, 
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Connection
} from '@solana/web3.js';

/**
 * Generate a new Solana keypair
 * @returns New keypair
 */
export function generateKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Create a keypair from a secret key
 * @param secretKey Secret key as Uint8Array
 * @returns Keypair created from the secret key
 */
export function keypairFromSecretKey(secretKey: Uint8Array): Keypair {
  return Keypair.fromSecretKey(secretKey);
}

/**
 * Create a keypair from a base58 encoded secret key
 * @param base58SecretKey Base58 encoded secret key
 * @returns Keypair created from the secret key
 */
export function keypairFromBase58(base58SecretKey: string): Keypair {
  const decodedKey = Buffer.from(base58SecretKey, 'base58');
  return Keypair.fromSecretKey(decodedKey);
}

/**
 * Sign and send a transaction
 * @param connection Solana connection
 * @param transaction Transaction to send
 * @param signer Signer keypair
 * @returns Transaction signature
 */
export async function signAndSendTransaction(
  connection: Connection,
  transaction: Transaction,
  signer: Keypair
): Promise<string> {
  return await sendAndConfirmTransaction(
    connection,
    transaction,
    [signer]
  );
}
