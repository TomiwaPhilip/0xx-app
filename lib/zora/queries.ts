import { getCoin, getCoins } from "@zoralabs/coins-sdk";
import { base } from "viem/chains";

type CoinDetails = {
  name: string;
  symbol: string;
  description: string;
  totalSupply: string;
  marketCap: string;
  volume24h: string;
  creatorAddress: string;
  createdAt: string;
  uniqueHolders: number;
  comments: Array<{
    txHash: string;
    comment: string;
    userAddress: string;
    timestamp: number;
    userProfile?: {
      id: string;
      handle: string;
      avatar?: {
        previewImage: {
          small: string;
          medium: string;
        };
      };
    };
  }>;
};

type MultiCoinDetails = {
  address: string;
  name: string;
  symbol: string;
  marketCap: string;
  volume24h: string;
  marketDelta?: string;
};

export async function fetchCoinDetails(
  address: string
): Promise<CoinDetails | null> {
  try {
    const response = await getCoin({
      address,
      chain: base.id, // Default to Base chain
    });

    const coin = response.data?.zora20Token;

    if (!coin) {
      console.error("Coin not found");
      return null;
    }

    const comments = coin.zoraComments.edges.map((edge) => ({
      txHash: edge.node.txHash,
      comment: edge.node.comment,
      userAddress: edge.node.userAddress,
      timestamp: edge.node.timestamp,
      userProfile: edge.node.userProfile,
    }));

    return {
      name: coin.name,
      symbol: coin.symbol,
      description: coin.description,
      totalSupply: coin.totalSupply,
      marketCap: coin.marketCap,
      volume24h: coin.volume24h,
      creatorAddress: coin.creatorAddress || "N/A",
      createdAt: coin.createdAt || "N/A",
      uniqueHolders: coin.uniqueHolders,
      comments,
    };
  } catch (error) {
    console.error("Error fetching coin details:", error);
    return null;
  }
}

/**
 * Fetches details for multiple coins from the Zora network
 * @param addresses Array of coin contract addresses
 * @returns Promise with array of coin details including name, symbol, market cap, volume, and delta
 */
export async function fetchMultipleCoins(
  addresses: string[]
): Promise<MultiCoinDetails[]> {
  try {
    const coins = addresses.map((address) => ({
      chainId: base.id,
      collectionAddress: address,
    }));

    const response = await getCoins({
      coins,
    });

    if (!response.data?.zora20Tokens) {
      console.error("No coins found");
      return [];
    }

    return response.data.zora20Tokens
      .map((coin) => {
        if (!coin) return null;

        return {
          address: coin.address,
          name: coin.name,
          symbol: coin.symbol,
          marketCap: coin.marketCap,
          volume24h: coin.volume24h,
          marketDelta: coin.marketCapDelta24h,
        };
      })
      .filter(Boolean) as MultiCoinDetails[];
  } catch (error) {
    console.error("Error fetching multiple coins:", error);
    return [];
  }
}
