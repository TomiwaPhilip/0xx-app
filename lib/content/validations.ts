import { isAddress } from "viem";

/**
 * Validates that a string is a valid Ethereum address
 * @param address The address to validate
 * @returns True if the address is valid, false otherwise
 */
export function isValidAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Validates content token creation parameters
 * @param name Token name
 * @param symbol Token symbol
 * @param contentURI Content URI
 * @param initialMintAmount Initial mint amount
 * @returns An object with a valid flag and error message if invalid
 */
export function validateContentTokenParams(
  name: string,
  symbol: string,
  contentURI: string,
  initialMintAmount: bigint
): { valid: boolean; error?: string } {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Token name is required" };
  }

  if (!symbol || symbol.trim() === "") {
    return { valid: false, error: "Token symbol is required" };
  }

  if (symbol.length > 10) {
    return {
      valid: false,
      error: "Token symbol must be 10 characters or less",
    };
  }

  if (!contentURI || contentURI.trim() === "") {
    return { valid: false, error: "Content URI is required" };
  }

  if (initialMintAmount <= BigInt(0)) {
    return {
      valid: false,
      error: "Initial mint amount must be greater than 0",
    };
  }

  return { valid: true };
}

/**
 * Validates swap parameters
 * @param tokenAddress Token address
 * @param amountIn Input amount for the swap
 * @param amountOutMinimum Minimum output amount
 * @param deadline Transaction deadline
 * @returns An object with a valid flag and error message if invalid
 */
export function validateSwapParams(
  tokenAddress: string,
  amountIn: bigint,
  amountOutMinimum: bigint,
  deadline: bigint
): { valid: boolean; error?: string } {
  if (!isValidAddress(tokenAddress)) {
    return { valid: false, error: "Invalid token address" };
  }

  if (amountIn <= BigInt(0)) {
    return { valid: false, error: "Input amount must be greater than 0" };
  }

  if (amountOutMinimum <= BigInt(0)) {
    return {
      valid: false,
      error: "Minimum output amount must be greater than 0",
    };
  }

  const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= currentTimestamp) {
    return { valid: false, error: "Deadline must be in the future" };
  }

  return { valid: true };
}

/**
 * Validates private key format
 * @param privateKey Private key to validate
 * @returns An object with a valid flag and error message if invalid
 */
export function validatePrivateKey(privateKey: string): {
  valid: boolean;
  error?: string;
} {
  // Check if it's a valid hex string starting with 0x and has correct length
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return { valid: false, error: "Invalid private key format" };
  }

  return { valid: true };
}

/**
 * Get deadline timestamp for a transaction in the future
 * @param minutes Minutes in the future for the deadline
 * @returns Deadline timestamp as a BigInt
 */
export function getDeadlineTimestamp(minutes: number = 20): bigint {
  // Current timestamp in seconds + minutes * 60 seconds
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}
