import { createCoin, CreateCoinArgs, updateCoinURI, UpdateCoinURIArgs } from "@zoralabs/coins-sdk";
import { Hex, createWalletClient, createPublicClient, http } from "viem";
import { base } from "viem/chains";

const publicClient = createPublicClient({
  chain: base,
  transport: http("https://base.llamarpc.com"),
});

/**
 * Creates a new Zora coin using the provided parameters
 * @param account - The hex address of the account creating the coin
 * @param rpcUrl - The RPC URL for connecting to the Base network
 * @param coinParams - Parameters for creating the coin including:
 *   - name: The name of the coin
 *   - symbol: The token symbol
 *   - uri: Valid metadata URI (ipfs://, ar://, https://)
 *   - owners: Optional array of owner addresses
 *   - payoutRecipient: Address to receive payouts
 *   - platformReferrer: Optional referrer address
 *   - initialPurchaseWei: Optional initial purchase amount in wei
 * @returns Object containing:
 *   - hash: Transaction hash
 *   - receipt: Transaction receipt
 *   - address: Deployed coin contract address
 *   - deployment: Additional deployment details
 * @throws Error if coin creation fails
 */
export async function createMyCoin(account: Hex, coinParams: CreateCoinArgs) {
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://base.llamarpc.com"),
  });
  try {
    const result = await createCoin(coinParams, walletClient, publicClient);

    console.log("Transaction hash:", result.hash);
    console.log("Coin address:", result.address);
    console.log("Deployment details:", result.deployment);

    return result;
  } catch (error) {
    console.error("Error creating coin:", error);
    throw error;
  }
}

export async function updateCoinMetadata(updateParams: UpdateCoinURIArgs, account: Hex) {
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://base.llamarpc.com"),
  });
  const result = await updateCoinURI(updateParams, walletClient, publicClient);

  console.log("Transaction hash:", result.hash);
  console.log("URI updated event:", result.uriUpdated);

  return result;
}
