import { Chain, ChainId } from "@/types";

// ===========================================
// SUPPORTED CHAINS — All 11 Spraay chains
// ===========================================

export const CHAINS: Record<ChainId, Chain> = {
  base: {
    id: "base",
    name: "Base",
    label: "Fastest (Gas-Free)",
    chainId: 8453,
    color: "#0052FF",
    rpcUrl: "https://mainnet.base.org",
    explorerUrl: "https://basescan.org",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_BASE || "",
    gasless: true,
  },
  ethereum: {
    id: "ethereum",
    name: "Ethereum",
    label: "Most Secure",
    chainId: 1,
    color: "#627EEA",
    rpcUrl: "https://eth.llamarpc.com",
    explorerUrl: "https://etherscan.io",
    usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_ETHEREUM || "",
    gasless: false,
  },
  arbitrum: {
    id: "arbitrum",
    name: "Arbitrum",
    label: "Low Cost",
    chainId: 42161,
    color: "#28A0F0",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    usdcAddress: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_ARBITRUM || "",
    gasless: false,
  },
  polygon: {
    id: "polygon",
    name: "Polygon",
    label: "Low Cost",
    chainId: 137,
    color: "#8247E5",
    rpcUrl: "https://polygon-rpc.com",
    explorerUrl: "https://polygonscan.com",
    usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_POLYGON || "",
    gasless: false,
  },
  avalanche: {
    id: "avalanche",
    name: "Avalanche",
    label: "Fast",
    chainId: 43114,
    color: "#E84142",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_AVALANCHE || "",
    gasless: false,
  },
  bnb: {
    id: "bnb",
    name: "BNB Chain",
    label: "Popular",
    chainId: 56,
    color: "#F0B90B",
    rpcUrl: "https://bsc-dataseed.binance.org",
    explorerUrl: "https://bscscan.com",
    usdcAddress: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_BNB || "",
    gasless: false,
  },
  solana: {
    id: "solana",
    name: "Solana",
    label: "Fastest",
    chainId: -1, // Non-EVM
    color: "#9945FF",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://solscan.io",
    usdcAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    spraayAddress: "", // SDK-based, no contract
    gasless: false,
  },
  unichain: {
    id: "unichain",
    name: "Unichain",
    label: "DeFi Native",
    chainId: 130,
    color: "#FF007A",
    rpcUrl: "https://mainnet.unichain.org",
    explorerUrl: "https://uniscan.xyz",
    usdcAddress: "",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_UNICHAIN || "",
    gasless: false,
  },
  plasma: {
    id: "plasma",
    name: "Plasma",
    label: "Emerging",
    chainId: 11155420, // Update with actual
    color: "#00BFFF",
    rpcUrl: "",
    explorerUrl: "",
    usdcAddress: "",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_PLASMA || "",
    gasless: false,
  },
  bob: {
    id: "bob",
    name: "BOB",
    label: "Bitcoin L2",
    chainId: 60808,
    color: "#FF6600",
    rpcUrl: "https://rpc.gobob.xyz",
    explorerUrl: "https://explorer.gobob.xyz",
    usdcAddress: "",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_BOB || "",
    gasless: false,
  },
  bittensor: {
    id: "bittensor",
    name: "Bittensor",
    label: "AI Economy",
    chainId: 945, // Update with actual
    color: "#1A1A2E",
    rpcUrl: "",
    explorerUrl: "",
    usdcAddress: "",
    spraayAddress: process.env.NEXT_PUBLIC_SPRAAY_BITTENSOR || "",
    gasless: false,
  },
};

// Primary chains shown to users (most common)
export const PRIMARY_CHAINS: ChainId[] = [
  "base",
  "ethereum",
  "arbitrum",
  "polygon",
  "avalanche",
  "bnb",
  "solana",
];

// Get explorer URL for a transaction
export function getExplorerTxUrl(chain: ChainId, txHash: string): string {
  const c = CHAINS[chain];
  if (!c?.explorerUrl) return "#";
  return `${c.explorerUrl}/tx/${txHash}`;
}

// Get explorer URL for an address
export function getExplorerAddressUrl(chain: ChainId, address: string): string {
  const c = CHAINS[chain];
  if (!c?.explorerUrl) return "#";
  return `${c.explorerUrl}/address/${address}`;
}

// Human-friendly chain display
export function getChainDisplay(chain: ChainId): { name: string; label: string; color: string } {
  const c = CHAINS[chain];
  return { name: c.name, label: c.label, color: c.color };
}
