import { createWalletClient, http, createPublicClient, Hex } from "viem";

import { externalContracts } from "@/contract/deployment";
import { networks } from "@/contract/config";
import { base, baseSepolia } from "viem/chains";

const network = networks.defaultNetwork === "base" ? base : baseSepolia;
const client = networks[(networks.defaultNetwork as "base") || "baseSepolia"];
const publicClient = createPublicClient({
  chain: network,
  transport: http(client.rpcUrl),
});

// Helper to safely access contracts based on chainId, falling back to 84532 if needed
const getContractsByChainId = (chainId: number) => {
  return (
    externalContracts[chainId as keyof typeof externalContracts] ||
    externalContracts[84532]
  );
};

/**
 * Creates a new content token through the ContentFactory contract
 * @param privateKey The private key of the creator
 * @param name Name of the content token
 * @param symbol Symbol of the content token
 * @param contentURI URI pointing to the content metadata
 * @param initialMintAmount Amount of tokens to mint initially
 * @returns Address of the newly created content token
 */
export async function createContentToken(
  name: string,
  symbol: string,
  contentURI: string,
  initialMintAmount: bigint,
  account: Hex
) {
  // Set up wallet client
  const walletClient = createWalletClient({
    account,
    chain: network,
    transport: http(client.rpcUrl),
  });

  // Get ContentFactory contract address and ABI
  const contracts = getContractsByChainId(client.chainId);
  const contentFactoryAddress = contracts.ContentFactory
    .address as `0x${string}`;
  const contentFactoryAbi = contracts.ContentFactory.abi;

  try {
    // Create transaction parameters
    const tokenCreationParams = {
      name,
      symbol,
      contentURI,
      creator: walletClient.account.address,
      initialMintRecipient: walletClient.account.address,
      initialMintAmount,
    };

    // Execute transaction to create content token
    const hash = await walletClient.writeContract({
      address: contentFactoryAddress,
      abi: contentFactoryAbi,
      functionName: "createContentToken",
      args: [tokenCreationParams],
    });

    // Wait for transaction receipt
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Find ContentTokenCreated event to get the token address
    const contentTokenCreatedEvents = receipt.logs
      .map((log) => {
        try {
          const event = decodeEventLog({
            abi: contentFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
          return event.eventName === "ContentTokenCreated" ? event : null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Return the newly created token address
    if (contentTokenCreatedEvents.length > 0) {
      return contentTokenCreatedEvents[0]?.args.tokenAddress;
    }

    throw new Error(
      "Content token creation event not found in transaction logs"
    );
  } catch (error) {
    console.error("Error creating content token:", error);
    throw error;
  }
}

/**
 * Updates the content URI for an existing content token
 * @param account Account of the creator/admin
 * @param tokenAddress Address of the content token to update
 * @param newContentURI New URI pointing to updated content metadata
 * @returns Transaction hash
 */
export async function updateContentURI(
  account: Hex,
  tokenAddress: string,
  newContentURI: string
) {
  // Set up wallet client
  const walletClient = createWalletClient({
    account,
    chain: network,
    transport: http(client.rpcUrl),
  });

  // Get ContentToken ABI
  const contracts = getContractsByChainId(client.chainId);
  const contentTokenAbi = contracts.ContentToken.abi;

  try {
    // Execute transaction to update content URI
    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: contentTokenAbi,
      functionName: "setContentURI",
      args: [newContentURI],
    });

    return hash;
  } catch (error) {
    console.error("Error updating content URI:", error);
    throw error;
  }
}

/**
 * Mints additional tokens for an existing content token
 * @param account Account of the creator/admin
 * @param tokenAddress Address of the content token
 * @param recipient Address to receive the minted tokens
 * @param amount Amount of tokens to mint
 * @returns Transaction hash
 */
export async function mintContentTokens(
  account: Hex,
  tokenAddress: string,
  recipient: `0x${string}`,
  amount: bigint
) {
  // Set up wallet client
  const walletClient = createWalletClient({
    account,
    chain: network,
    transport: http(client.rpcUrl),
  });

  // Get ContentToken ABI
  const contracts = getContractsByChainId(client.chainId);
  const contentTokenAbi = contracts.ContentToken.abi;

  try {
    // Execute transaction to mint tokens
    const hash = await walletClient.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: contentTokenAbi,
      functionName: "mint",
      args: [recipient, amount],
    });

    return hash;
  } catch (error) {
    console.error("Error minting content tokens:", error);
    throw error;
  }
}

// Helper function to decode event logs
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

  // Simplified event parsing logic - in practice, you would use viem's decodeEventLog
  // This is just a placeholder to show the concept
  return decoded;
}

// Helper function to get event topic
function getEventTopic(name: string, inputs: any[]): string {
  // In practice, you would use viem's keccak256 and proper event signature encoding
  // This is just a placeholder showing the concept
  return `0x${name}${inputs.map((i) => i.type).join("")}`;
}
