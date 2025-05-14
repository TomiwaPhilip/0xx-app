import {base, baseSepolia} from "viem/chains"

export const networks = {
  base: {
    chainId: base.id,
    name: base.name,
    rpcUrl: "https://base.llamarpc.com",
    blockExplorer: base.blockExplorers.default.url,
    chain: base
  },
  baseSepolia: {
    chainId: baseSepolia.id,
    name: baseSepolia.name,
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: baseSepolia.blockExplorers.default.url,
    chain: baseSepolia
  },
  defaultNetwork: "baseSepolia"
}
