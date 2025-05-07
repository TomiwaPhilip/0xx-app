import { simulateBuy, tradeCoin, TradeParams } from "@zoralabs/coins-sdk";
import {
  Address,
  createWalletClient,
  createPublicClient,
  http,
  Hex,
} from "viem";
import { base } from "viem/chains";


const publicClient = createPublicClient({
    chain: base,
    transport: http("https://base.llamarpc.com"),
  });
// Execute the buy
export async function buyCoin(
  buyParams: TradeParams,
  account: Hex,
) {
  
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://base.llamarpc.com"),
  });
  const result = await tradeCoin(buyParams, walletClient, publicClient);

  console.log("Transaction hash:", result.hash);
  console.log("Trade details:", result.trade);

  return result;
}

export async function simulateCoinBuy(target: Address, requestedOrderSize: bigint) {
  const simulation = await simulateBuy({
    target,
    requestedOrderSize,
    publicClient,
  });

  console.log("Order size", simulation.orderSize);
  console.log("Amount out", simulation.amountOut);

  return simulation;
}

export async function sellCoin(sellParams: TradeParams, account: Hex) {
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http("https://base.llamarpc.com"),
  });
  const result = await tradeCoin(sellParams, walletClient, publicClient);

  console.log("Transaction hash:", result.hash);
  console.log("Trade details:", result.trade);

  return result;
}