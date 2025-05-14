import { createPublicClient, http, PublicClient, formatUnits } from "viem";
import { externalContracts } from "@/contract/deployment";
import { networks } from "@/contract/config";
import { base, baseSepolia } from "viem/chains";

const network = networks.defaultNetwork === "base" ? base : baseSepolia;
const defaultNetwork = networks[(networks.defaultNetwork as "base" || "baseSepolia")]
// Helper to safely access contracts based on chainId, falling back to 84532 if needed
const getContractsByChainId = (chainId: number) => {
  return (
    externalContracts[chainId as keyof typeof externalContracts] ||
    externalContracts[84532]
  );
};


// Define a common type for content token information
export interface ContentTokenInfo {
  address: string;
  name: string;
  symbol: string;
  contentURI: string;
  creator: string;
  totalSupply: bigint;
  price?: string;
  poolAddress?: string;
}

/**
 * Get details about a specific content token
 * @param tokenAddress Address of the content token
 * @returns Token details including name, symbol, contentURI, creator, and supply
 */
export async function getContentTokenDetails(
  tokenAddress: `0x${string}`
): Promise<ContentTokenInfo> {
  // Set up public client
  const publicClient = createPublicClient({
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

  const contracts = getContractsByChainId(defaultNetwork.chainId);
  const contentTokenAbi = contracts.ContentToken.abi;

  try {
    // Fetch token data in parallel using multicall
    const [name, symbol, contentURI, creator, totalSupply] = await Promise.all([
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: contentTokenAbi,
        functionName: "name",
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: contentTokenAbi,
        functionName: "symbol",
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: contentTokenAbi,
        functionName: "contentURI",
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: contentTokenAbi,
        functionName: "contentCreator",
      }),
      publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: contentTokenAbi,
        functionName: "totalSupply",
      }),
    ]);

    // Get pool information from LiquidityManager
    const liquidityManagerAddress = contracts.LiquidityManager
      .address as `0x${string}`;
    const liquidityManagerAbi = contracts.LiquidityManager.abi;

    const poolAddress = (await publicClient.readContract({
      address: liquidityManagerAddress,
      abi: liquidityManagerAbi,
      functionName: "tokenToPair",
      args: [tokenAddress],
    })) as `0x${string}`;

    // The basic token info
    const tokenInfo: ContentTokenInfo = {
      address: tokenAddress,
      name: name as string,
      symbol: symbol as string,
      contentURI: contentURI as string,
      creator: creator as string,
      totalSupply: totalSupply as bigint,
      poolAddress: poolAddress,
    };

    // Get price if a pool exists
    if (
      poolAddress &&
      poolAddress !== "0x0000000000000000000000000000000000000000"
    ) {
      const price = await getContentTokenPrice(tokenAddress);
      tokenInfo.price = price;
    }

    return tokenInfo;
  } catch (error) {
    console.error("Error fetching content token details:", error);
    throw error;
  }
}

/**
 * Get the current price of a content token in ETH
 * @param tokenAddress Address of the content token
 * @returns Price as a formatted string with ETH units
 */
export async function getContentTokenPrice(
  tokenAddress: `0x${string}`
): Promise<string> {
  // Set up public client
  const publicClient = createPublicClient({
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

  try {
    // First, get the liquidity pool address from the LiquidityManager
    const contracts = getContractsByChainId(defaultNetwork.chainId);
    const liquidityManagerAddress = contracts.LiquidityManager
      .address as `0x${string}`;
    const liquidityManagerAbi = contracts.LiquidityManager.abi;

    const poolAddress = (await publicClient.readContract({
      address: liquidityManagerAddress,
      abi: liquidityManagerAbi,
      functionName: "tokenToPair",
      args: [tokenAddress],
    })) as `0x${string}`;

    if (
      !poolAddress ||
      poolAddress === "0x0000000000000000000000000000000000000000"
    ) {
      return "N/A (No liquidity pool)";
    }

    // For a more accurate price, we would need to query the AMM pool for the current price
    // This is a simplified example - in a real implementation, you would query reserves and calculate the current price
    // For Uniswap V3 pools, this is more complex as it depends on the current tick

    // Mock price calculation - in a real implementation, you would:
    // 1. Query the pool for the current price/reserves
    // 2. Calculate the price based on the pool's reserves

    // In a simplified case, we'd calculate: price = amountWETH / amountToken
    // Returning a placeholder price
    return "0.001 ETH"; // Placeholder price
  } catch (error) {
    console.error("Error fetching content token price:", error);
    return "Error fetching price";
  }
}

/**
 * Get all content tokens created through the factory
 * @returns Array of content token addresses
 */
export async function getAllContentTokens(): Promise<string[]> {
  // Set up public client
  const publicClient = createPublicClient({
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

  const contracts = getContractsByChainId(defaultNetwork.chainId);
  const contentFactoryAddress = contracts.ContentFactory
    .address as `0x${string}`;
  const contentFactoryAbi = contracts.ContentFactory.abi;

  try {
    // Fetch all created tokens
    const tokens = await publicClient.readContract({
      address: contentFactoryAddress,
      abi: contentFactoryAbi,
      functionName: "getCreatedTokens",
    });

    return tokens as string[];
  } catch (error) {
    console.error("Error fetching all content tokens:", error);
    throw error;
  }
}

/**
 * Get all content tokens with their details
 * @returns Array of content token details
 */
export async function getAllContentTokensWithDetails(): Promise<
  ContentTokenInfo[]
> {
  try {
    // First get all token addresses
    const tokenAddresses = await getAllContentTokens();

    // Then get details for each token in parallel
    const tokenDetails = await Promise.all(
      tokenAddresses.map((address) =>
        getContentTokenDetails(address as `0x${string}`)
      )
    );

    return tokenDetails;
  } catch (error) {
    console.error("Error fetching all content tokens with details:", error);
    throw error;
  }
}

/**
 * Check if an address has tokens available for a content token
 * @param tokenAddress Address of the content token
 * @param userAddress Address of the user to check
 * @returns Balance of the user for the specified token
 */
export async function getUserContentTokenBalance(
  tokenAddress: `0x${string}`,
  userAddress: `0x${string}`
): Promise<string> {
  // Set up public client
  const publicClient = createPublicClient({
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

  const contracts = getContractsByChainId(defaultNetwork.chainId);
  const contentTokenAbi = contracts.ContentToken.abi;

  try {
    // Fetch user's balance
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: contentTokenAbi,
      functionName: "balanceOf",
      args: [userAddress],
    });

    // Get token decimals
    const decimals = await publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: contentTokenAbi,
      functionName: "decimals",
    });

    // Format the balance with proper decimals
    return formatUnits(balance as bigint, decimals as number);
  } catch (error) {
    console.error("Error fetching user balance:", error);
    throw error;
  }
}
