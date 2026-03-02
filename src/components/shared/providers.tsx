"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, mainnet, arbitrum, polygon, avalanche, bsc } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { useState, type ReactNode } from "react";
import { Toaster } from "sonner";

// Wagmi config for wallet connections
const wagmiConfig = createConfig({
  chains: [base, mainnet, arbitrum, polygon, avalanche, bsc],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "StablePay" }),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
    }),
  ],
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
    [arbitrum.id]: http(),
    [polygon.id]: http(),
    [avalanche.id]: http(),
    [bsc.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          theme="dark"
          position="top-right"
          toastOptions={{
            style: {
              background: "#111B2E",
              border: "1px solid #1E2D44",
              color: "#E8EDF5",
              fontFamily: "DM Sans, sans-serif",
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
