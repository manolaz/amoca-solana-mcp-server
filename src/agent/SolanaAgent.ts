import { Connection, PublicKey, Keypair, Transaction } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount } from "@solana/spl-token";
import bs58 from "bs58";

// Jupiter API constants
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

// Type definitions for Solana Trading features
export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippage: number;
}

export interface WalletDetails {
  publicKey: string;
  privateKey: string;
}

export interface SwapResult {
  txid: string;
  status: 'confirmed' | 'failed';
}

export interface TokenBalanceSummary {
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

export class AMOCASolanaAgent {
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
