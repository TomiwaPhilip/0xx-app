import { createWalletClient, http, parseEther, createPublicClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { externalContracts } from "@/contract/deployment";
import { networks } from "@/contract/config";
import { base, baseSepolia } from "viem/chains";

// Helper to safely access contracts based on chainId, falling back to 84532 if needed
const getContractsByChainId = (chainId: number) => {
  return (
    externalContracts[chainId as keyof typeof externalContracts] ||
    externalContracts[84532]
  );
};

const network = networks.defaultNetwork === "base" ? base : baseSepolia;
const defaultNetwork =
  networks[(networks.defaultNetwork as "base") || "baseSepolia"];

  const publicClient = createPublicClient({
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

/**
 * Buy content tokens using the SwapHandler
 * @param privateKey The private key of the buyer
 * @param tokenAddress Address of the content token to buy
 * @param amountIn Amount of input token (ETH or other) to spend
 * @param amountOutMinimum Minimum amount of content tokens to receive
 * @param deadline Transaction deadline timestamp
 * @param inputToken Address of the input token (use null for ETH)
 * @returns Transaction hash and amount of tokens received
 */
export async function buyContentToken(
  privateKey: string,
  tokenAddress: string,
  amountIn: bigint,
  amountOutMinimum: bigint,
  deadline: bigint,
  inputToken: string | null = null
) {
  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Set up wallet client
  const walletClient = createWalletClient({
    account,
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

  // Get SwapHandler contract address and ABI
  const contracts = getContractsByChainId(defaultNetwork.chainId);
  const swapHandlerAddress = contracts.SwapHandler.address as `0x${string}`;
  const swapHandlerAbi = contracts.SwapHandler.abi;

  // Use WETH if inputToken is null
  const WETH_ADDRESS = contracts.ContentFactory.abi.find(
    (item: any) => item.name === "WETH_ADDRESS"
  );

  // Determine input token (ETH or specific token)
  const tokenIn = inputToken || WETH_ADDRESS;

  try {
    // Create swap parameters
    const swapParams = {
      tokenIn: tokenIn as `0x${string}`,
      tokenOut: tokenAddress as `0x${string}`,
      fee: 3000, // Default fee tier (0.3%)
      recipient: account.address,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0), // No price limit
      deadline,
    };

    // Execute transaction to swap tokens
    const value = inputToken ? BigInt(0) : amountIn; // Only send ETH value if input token is ETH
    const hash = await walletClient.writeContract({
      address: swapHandlerAddress,
      abi: swapHandlerAbi,
      functionName: "swap",
      args: [swapParams],
      value,
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Find SwapExecuted event to get the amount out
    const swapExecutedEvents = receipt.logs
      .map((log) => {
        try {
          const event = decodeEventLog({
            abi: swapHandlerAbi,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === "SwapExecuted" ? event : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (swapExecutedEvents.length > 0) {
      return {
        hash,
        amountOut: swapExecutedEvents[0]?.args.amountOutReceived,
      };
    }

    return { hash, amountOut: null };
  } catch (error) {
    console.error("Error buying content token:", error);
    throw error;
  }
}

/**
 * Sell content tokens using the SwapHandler
 * @param privateKey The private key of the seller
 * @param tokenAddress Address of the content token to sell
 * @param amountIn Amount of content tokens to sell
 * @param amountOutMinimum Minimum amount of output token to receive
 * @param deadline Transaction deadline timestamp
 * @param outputToken Address of the desired output token (use null for ETH)
 * @returns Transaction hash and amount of tokens received
 */
export async function sellContentToken(
  privateKey: string,
  tokenAddress: string,
  amountIn: bigint,
  amountOutMinimum: bigint,
  deadline: bigint,
  outputToken: string | null = null
) {
  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  // Set up wallet client
  const walletClient = createWalletClient({
    account,
    chain: network,
    transport: http(defaultNetwork.rpcUrl),
  });

  // Get SwapHandler contract address and ABI
  const contracts = getContractsByChainId(defaultNetwork.chainId);
  const swapHandlerAddress = contracts.SwapHandler.address as `0x${string}`;
  const swapHandlerAbi = contracts.SwapHandler.abi;

  // Use WETH if outputToken is null
  const WETH_ADDRESS = contracts.ContentFactory.abi.find(
    (item: any) => item.name === "WETH_ADDRESS"
  );

  // Determine output token (ETH or specific token)
  const tokenOut = outputToken || WETH_ADDRESS;

  // First approve the SwapHandler to spend tokens
  const contentTokenAbi = contracts.ContentToken.abi;
  await walletClient.writeContract({
    address: tokenAddress as `0x${string}`,
    abi: contentTokenAbi,
    functionName: "approve",
    args: [swapHandlerAddress, amountIn],
  });

  try {
    // Create swap parameters
    const swapParams = {
      tokenIn: tokenAddress as `0x${string}`,
      tokenOut: tokenOut as `0x${string}`,
      fee: 3000, // Default fee tier (0.3%)
      recipient: account.address,
      amountIn,
      amountOutMinimum,
      sqrtPriceLimitX96: BigInt(0), // No price limit
      deadline,
    };

    // Execute transaction to swap tokens
    const hash = await walletClient.writeContract({
      address: swapHandlerAddress,
      abi: swapHandlerAbi,
      functionName: "swap",
      args: [swapParams],
    });
    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Find SwapExecuted event to get the amount out
    const swapExecutedEvents = receipt.logs
      .map((log) => {
        try {
          const event = decodeEventLog({
            abi: swapHandlerAbi,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === "SwapExecuted" ? event : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if (swapExecutedEvents.length > 0) {
      return {
        hash,
        amountOut: swapExecutedEvents[0]?.args.amountOutReceived,
      };
    }

    return { hash, amountOut: null };
  } catch (error) {
    console.error("Error selling content token:", error);
    throw error;
  }
}

// Helper function to decode event logs (same as in coin.ts)
function decodeEventLog({
  abi,
  data,
  topics,
}: {
  abi: any;
  data: string;
  topics: string[];
}) {
  const event = abi.find(
    (item: any) =>
      item.type === "event" &&
      topics[0] === getEventTopic(item.name, item.inputs)
  );

  if (!event) {
    throw new Error("Event not found in ABI");
  }

  // Parse the event data according to the ABI
  const decoded = {
    eventName: event.name,
    args: {} as any,
  };

  // Simplified event parsing logic
  return decoded;
}

// Helper function to get event topic
function getEventTopic(name: string, inputs: any[]): string {
  // Simplified topic calculation
  return `0x${name}${inputs.map((i) => i.type).join("")}`;
}
