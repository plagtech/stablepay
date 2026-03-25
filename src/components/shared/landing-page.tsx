"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { ethers } from "ethers";

// ---- CONTRACT CONSTANTS ----
const SPRAAY_ADDRESS = "0x1646452F98E36A3c9Cfc3eDD8868221E207B5eEC";
const BASE_CHAIN_ID = 8453;

const SPRAAY_ABI = [
  "function sprayToken(address token, tuple(address recipient, uint256 amount)[] recipients) external",
  "function sprayETH(tuple(address recipient, uint256 amount)[] recipients) external payable",
];
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
];

// ---- TOKEN CONFIG ----
interface TokenConfig {
  symbol: string;
  address: string; // empty string = native token
  decimals: number;
  isNative: boolean;
}

const TOKENS_BY_CHAIN: Record<string, TokenConfig[]> = {
  base: [
    { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6, isNative: false },
    { symbol: "ETH", address: "", decimals: 18, isNative: true },
    { symbol: "DAI", address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", decimals: 18, isNative: false },
  ],
  ethereum: [
    { symbol: "USDC", address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", decimals: 6, isNative: false },
    { symbol: "ETH", address: "", decimals: 18, isNative: true },
  ],
  arbitrum: [
    { symbol: "USDC", address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", decimals: 6, isNative: false },
    { symbol: "ETH", address: "", decimals: 18, isNative: true },
  ],
  polygon: [
    { symbol: "USDC", address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", decimals: 6, isNative: false },
    { symbol: "POL", address: "", decimals: 18, isNative: true },
  ],
  bnb: [
    { symbol: "USDC", address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", decimals: 18, isNative: false },
    { symbol: "BNB", address: "", decimals: 18, isNative: true },
  ],
  avalanche: [
    { symbol: "USDC", address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", decimals: 6, isNative: false },
    { symbol: "AVAX", address: "", decimals: 18, isNative: true },
  ],
  solana: [
    { symbol: "USDC", address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", decimals: 6, isNative: false },
    { symbol: "SOL", address: "", decimals: 9, isNative: true },
  ],
  bitcoin: [
    { symbol: "BTC", address: "", decimals: 8, isNative: true },
  ],
};

// ---- TYPES ----
interface PayrollEntry {
  addr: string;
  amount: number;
}

type TxStep = "idle" | "connecting" | "switching" | "checking" | "approving" | "sending" | "confirming" | "done" | "error";

// ---- HELPERS ----
function parsePayroll(text: string): PayrollEntry[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  const entries: PayrollEntry[] = [];
  for (const line of lines) {
    const parts = line.includes("\t")
      ? line.split("\t").map((s) => s.trim())
      : line.split(",").map((s) => s.trim());
    if (parts.length >= 2) {
      const addr = parts[0];
      const amount = parseFloat(parts[1]);
      if (addr && !isNaN(amount) && amount > 0) {
        entries.push({ addr, amount });
      }
    }
  }
  return entries;
}

function shortenAddr(addr: string) {
  if (addr.length > 12) return addr.slice(0, 6) + "\u00B7\u00B7\u00B7" + addr.slice(-4);
  return addr;
}

function isValidAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

const EXAMPLE_DATA = `0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18, 2500
0x53d284357ec70cE289D6D64134DfAc8E511c8a3C, 1800
0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B, 3200
0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C, 4100
0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8, 950`;

const CHAINS = [
  { value: "base", label: "\u26A1 Base ($0 gas)", gas: 0, gasPerTx: 0 },
  { value: "ethereum", label: "Ethereum", gas: 0.45, gasPerTx: 0.35 },
  { value: "arbitrum", label: "Arbitrum", gas: 0.12, gasPerTx: 0.08 },
  { value: "polygon", label: "Polygon", gas: 0.05, gasPerTx: 0.03 },
  { value: "bnb", label: "BNB Chain", gas: 0.15, gasPerTx: 0.10 },
  { value: "solana", label: "Solana", gas: 0.02, gasPerTx: 0.01 },
  { value: "avalanche", label: "Avalanche", gas: 0.20, gasPerTx: 0.15 },
  { value: "bitcoin", label: "Bitcoin", gas: 2.50, gasPerTx: 1.50 },
];

function Check({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className}>
      <path d="M13.3 4.3L6.3 11.3L2.7 7.7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-2 border border-brand-primary/40 px-6 py-3 rounded-full text-sm font-medium text-brand-primary shadow-lg transition-all duration-300 ${visible ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0"}`}>
      {message}
    </div>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-surface-2 border border-border rounded-2xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-base font-bold">{title}</h3>
          <button onClick={onClose} className="text-text-dim hover:text-text-primary text-lg">&times;</button>
        </div>
        <div className="px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

// ---- TX STEP LABELS ----
const TX_STEP_LABELS: Record<TxStep, string> = {
  idle: "",
  connecting: "Connecting wallet...",
  switching: "Switching to Base...",
  checking: "Checking USDC balance...",
  approving: "Approve USDC in your wallet...",
  sending: "Confirm transaction in your wallet...",
  confirming: "Waiting for confirmation...",
  done: "Payroll sent!",
  error: "Transaction failed",
};

// ========================================
// MAIN COMPONENT
// ========================================
export function LandingPage() {
  const [input, setInput] = useState("");
  const [chain, setChain] = useState("base");
  const [tab, setTab] = useState<"paste" | "csv">("paste");
  const [showPreview, setShowPreview] = useState(false);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [toast, setToast] = useState({ message: "", visible: false });
  const [saveModal, setSaveModal] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [walletModal, setWalletModal] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [emailAddr, setEmailAddr] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [token, setToken] = useState("USDC");

  // Wallet / TX state
  const [txStep, setTxStep] = useState<TxStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);

  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Wagmi hooks
  const { address, isConnected, chain: connectedChain } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sp_input");
      setInput(saved && saved.trim() ? saved : EXAMPLE_DATA);
    } catch {
      setInput(EXAMPLE_DATA);
    }
  }, []);

  useEffect(() => {
    if (input.trim()) {
      try { localStorage.setItem("sp_input", input); } catch {}
    }
  }, [input]);

  function flash(msg: string) {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }

  const chainInfo = CHAINS.find((c) => c.value === chain) || CHAINS[0];
  const chainTokens = TOKENS_BY_CHAIN[chain] || TOKENS_BY_CHAIN["base"];
  const selectedToken = chainTokens.find((t) => t.symbol === token) || chainTokens[0];
  const tokenSymbol = selectedToken.symbol;
  const isNativeToken = selectedToken.isNative;

  // Reset token to USDC (or first available) when chain changes
  useEffect(() => {
    const tokens = TOKENS_BY_CHAIN[chain] || TOKENS_BY_CHAIN["base"];
    const hasUsdc = tokens.find((t) => t.symbol === "USDC");
    setToken(hasUsdc ? "USDC" : tokens[0].symbol);
  }, [chain]);
  const total = entries.reduce((s, e) => s + e.amount, 0);
  const fee = total * 0.01;
  const gas = chainInfo.gas;
  const savedGas = chainInfo.gasPerTx * Math.max(0, entries.length - 1);
  const timeSaved = entries.length * 2;

  function preview() {
    const parsed = parsePayroll(input);
    if (parsed.length === 0) return;
    setEntries(parsed);
    setShowPreview(true);
    setTimeout(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
  }

  function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = (ev.target?.result as string).trim();
      const lines = text.split("\n");
      const start = lines[0].toLowerCase().includes("wallet") ? 1 : 0;
      const cleaned = lines.slice(start).join("\n");
      setInput(cleaned);
      setTab("paste");
      const parsed = parsePayroll(cleaned);
      if (parsed.length > 0) { setEntries(parsed); setShowPreview(true); }
      flash("CSV loaded");
    };
    reader.readAsText(file);
  }

  function loadExample() {
    setInput(EXAMPLE_DATA);
    setShowPreview(false);
    flash("Example payroll loaded \u2014 5 recipients");
  }

  function clearAll() {
    setInput("");
    setShowPreview(false);
    setEntries([]);
    try { localStorage.removeItem("sp_input"); } catch {}
    flash("Payroll cleared");
  }

  function savePayroll() {
    const name = saveName.trim() || "Saved Payroll";
    try {
      const saves = JSON.parse(localStorage.getItem("sp_saves") || "[]");
      saves.push({ name, input, chain, date: new Date().toISOString() });
      localStorage.setItem("sp_saves", JSON.stringify(saves));
    } catch {}
    setSaveModal(false);
    setSaveName("");
    flash(`\u201C${name}\u201D saved \u2014 come back next month`);
  }

  async function emailSummary() {
    if (!emailAddr.trim() || !emailAddr.includes("@")) return;
    setEmailSending(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddr.trim(), payroll_data: { entries, chain, total, fee }, source: "email_summary" }),
      });
      if (!res.ok) throw new Error("Failed");
      setEmailModal(false);
      setEmailAddr("");
      flash(`Summary sent to ${emailAddr.trim()}`);
    } catch {
      flash("Something went wrong \u2014 try again");
    } finally {
      setEmailSending(false);
    }
  }

  function downloadCSV() {
    if (entries.length === 0) return;
    let csv = "wallet,amount\n";
    entries.forEach((e) => { csv += `${e.addr},${e.amount}\n`; });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "stablepay-payroll.csv"; a.click();
    URL.revokeObjectURL(url);
    flash("CSV downloaded");
  }

  // ========================================
  // REAL WALLET CONNECT + SEND FLOW
  // ========================================
  const handleSendPayroll = useCallback(async () => {
    setTxHash(null);
    setTxError(null);

    // Validate entries
    const invalidAddrs = entries.filter((e) => !isValidAddress(e.addr));
    if (invalidAddrs.length > 0) {
      setTxError(`Invalid address: ${invalidAddrs[0].addr}`);
      setTxStep("error");
      return;
    }

    // Only Base is wired for now
    if (chain !== "base") {
      setTxError("Only Base is supported for live payroll right now. Select Base and try again.");
      setTxStep("error");
      return;
    }

    try {
      // Step 1: Connect wallet if not connected
      if (!isConnected) {
        setTxStep("connecting");
        // The modal will show connect options — user clicks one
        return; // User needs to connect first, then click send again
      }

      // Step 2: Switch to Base if needed
      if (connectedChain?.id !== BASE_CHAIN_ID) {
        setTxStep("switching");
        switchChain({ chainId: BASE_CHAIN_ID });
        return; // Will re-trigger after chain switch
      }

      // Step 3: Get signer via ethers
      setTxStep("checking");
      const provider = new ethers.providers.Web3Provider(window.ethereum as any);
      const signer = provider.getSigner();
      const signerAddr = await signer.getAddress();

      // Build recipients array as tuples
      const recipients = entries.map((e) => ({
        recipient: e.addr,
        amount: ethers.utils.parseUnits(e.amount.toFixed(selectedToken.decimals > 6 ? 8 : selectedToken.decimals), selectedToken.decimals),
      }));
      const totalWei = recipients.reduce(
        (sum, r) => sum.add(r.amount),
        ethers.BigNumber.from(0)
      );

      if (isNativeToken) {
        // ---- NATIVE TOKEN (ETH, BNB, AVAX, etc.) ----
        // Check native balance
        const balance = await provider.getBalance(signerAddr);
        const balanceNum = parseFloat(ethers.utils.formatEther(balance));
        setUsdcBalance(balanceNum);

        if (balance.lt(totalWei)) {
          setTxError(`Insufficient ${tokenSymbol}. You have ${balanceNum.toFixed(4)} but need ${total}`);
          setTxStep("error");
          return;
        }

        // No approval needed for native tokens
        setTxStep("sending");
        const spraay = new ethers.Contract(SPRAAY_ADDRESS, SPRAAY_ABI, signer);
        const tx = await spraay.sprayETH(recipients, { value: totalWei });

        setTxStep("confirming");
        const receipt = await tx.wait();
        setTxHash(receipt.transactionHash);
        setTxStep("done");
        flash(`Payroll sent! ${entries.length} ${tokenSymbol} payments in 1 transaction`);

      } else {
        // ---- ERC-20 TOKEN (USDC, DAI, etc.) ----
        const tokenContract = new ethers.Contract(selectedToken.address, ERC20_ABI, signer);
        const balance = await tokenContract.balanceOf(signerAddr);
        const balanceNum = parseFloat(ethers.utils.formatUnits(balance, selectedToken.decimals));
        setUsdcBalance(balanceNum);

        if (balance.lt(totalWei)) {
          setTxError(`Insufficient ${tokenSymbol}. You have ${balanceNum.toFixed(2)} but need ${total}`);
          setTxStep("error");
          return;
        }

        // Check allowance & approve if needed
        const allowance = await tokenContract.allowance(signerAddr, SPRAAY_ADDRESS);
        if (allowance.lt(totalWei)) {
          setTxStep("approving");
          const approveTx = await tokenContract.approve(SPRAAY_ADDRESS, ethers.constants.MaxUint256);
          await approveTx.wait();
        }

        // Execute batch payment via Spraay
        setTxStep("sending");
        const spraay = new ethers.Contract(SPRAAY_ADDRESS, SPRAAY_ABI, signer);
        const tx = await spraay.sprayToken(selectedToken.address, recipients);

        setTxStep("confirming");
        const receipt = await tx.wait();
        setTxHash(receipt.transactionHash);
        setTxStep("done");
        flash(`Payroll sent! ${entries.length} ${tokenSymbol} payments in 1 transaction`);
      }

    } catch (err: any) {
      console.error("[StablePay] TX error:", err);
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setTxError("Transaction rejected by user");
      } else {
        setTxError(err.reason || err.message || "Transaction failed");
      }
      setTxStep("error");
    }
  }, [entries, chain, isConnected, connectedChain, switchChain, total, selectedToken, tokenSymbol, isNativeToken]);

  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2 });

  // Determine send button state
  const isBase = chain === "base";
  const sendDisabled = txStep === "approving" || txStep === "sending" || txStep === "confirming";

  function getSendButtonText() {
    if (!isBase) return "Switch to Base to Send";
    if (!isConnected) return "Connect Wallet to Run Payroll";
    if (txStep === "approving") return "Approving USDC...";
    if (txStep === "sending") return "Confirm in Wallet...";
    if (txStep === "confirming") return "Confirming...";
    if (txStep === "done") return "\u2713 Payroll Sent!";
    return `Send ${entries.length} Payment${entries.length > 1 ? "s" : ""} in 1 Transaction`;
  }

  function handleSendClick() {
    if (txStep === "done") {
      // Reset for another run
      setTxStep("idle");
      setTxHash(null);
      return;
    }
    if (!isConnected) {
      setWalletModal(true);
      return;
    }
    handleSendPayroll();
  }

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary font-display">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-surface-0/80 backdrop-blur-xl border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-brand-primary font-extrabold text-lg">S</span>
          <span className="font-bold tracking-tight">StablePay</span>
        </div>
        <div className="flex items-center gap-5">
          <a href="#demo" className="text-sm text-text-muted hover:text-text-primary transition-colors hidden sm:block">Try It</a>
          <a href="#how" className="text-sm text-text-muted hover:text-text-primary transition-colors hidden sm:block">How It Works</a>
          <a href="#pricing" className="text-sm text-text-muted hover:text-text-primary transition-colors hidden sm:block">Pricing</a>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-primary font-mono">{shortenAddr(address || "")}</span>
              <button onClick={() => disconnect()} className="text-xs text-text-dim hover:text-text-muted">Disconnect</button>
            </div>
          ) : (
            <a href="/auth?signup=true" className="text-sm font-semibold px-5 py-2 rounded-full gradient-primary text-white glow-primary">Start Free &rarr;</a>
          )}
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-28 pb-20 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse,rgba(0,214,126,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-xs font-semibold text-brand-primary mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
          Live on 13 chains &middot; 1,000+ payments processed
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl">
          Run crypto payroll in<br /><span className="text-brand-primary">minutes &mdash; not hours.</span>
        </h1>
        <p className="text-base sm:text-lg text-text-muted max-w-xl mt-5 leading-relaxed">
          For teams paying 10&ndash;500 people in crypto every month. CSV to payments in 60 seconds. Replaces spreadsheets + manual wallet sends.
        </p>
        <div className="flex gap-3 mt-10 flex-wrap justify-center">
          <a href="#demo" className="px-7 py-3.5 rounded-full gradient-primary text-white font-bold text-sm glow-primary">Run Demo Payroll (No Wallet Needed)</a>
          <a href="#how" className="px-7 py-3.5 rounded-full border border-border text-text-primary font-medium text-sm hover:bg-surface-2 transition-colors">See How It Works</a>
        </div>
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mt-12 text-text-dim text-sm">
          {["Non-custodial", "Preview before sending", "Gas-free on Base", "You control your wallet", "Built for monthly payroll"].map((item) => (
            <span key={item} className="flex items-center gap-2"><Check className="text-brand-primary" />{item}</span>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section className="max-w-3xl mx-auto px-6 py-20" id="demo">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary text-center mb-3">Try it now</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight mb-2">Run a demo payroll</h2>
        <p className="text-sm text-text-muted text-center max-w-md mx-auto mb-10">Paste wallet addresses and amounts below. No wallet needed to preview.</p>

        <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden focus-within:border-brand-primary/40 transition-colors">
          <div className="flex items-center justify-between px-5 py-3 border-b border-border">
            <span className="text-sm font-semibold">Payroll</span>
            <div className="flex gap-1">
              {(["paste", "csv"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${tab === t ? "bg-brand-primary/15 text-brand-primary" : "text-text-dim hover:text-text-muted"}`}>
                  {t === "paste" ? "Paste" : "Upload CSV"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-2 border-b border-border/50">
            <div className="flex gap-1">
              <button onClick={loadExample} className="px-3 py-1 rounded-lg text-xs text-text-dim hover:text-text-muted hover:bg-surface-3 transition-colors">{"\uD83D\uDCCB"} Load Example</button>
              <button onClick={clearAll} className="px-3 py-1 rounded-lg text-xs text-text-dim hover:text-text-muted hover:bg-surface-3 transition-colors">&times; Clear</button>
            </div>
            <span className="text-xs text-text-dim italic hidden sm:block">Tip: Paste directly from Google Sheets</span>
          </div>
          {tab === "paste" ? (
            <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder={"wallet address, amount (USD or USDC)\n0x742d...bD18, 2500\n0x53d2...8a3C, 1800"} spellCheck={false} className="w-full min-h-[160px] px-5 py-4 bg-transparent text-text-primary font-mono text-sm leading-loose resize-y outline-none placeholder-text-dim" />
          ) : (
            <div className="p-5">
              <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer hover:border-brand-primary/40 hover:bg-brand-primary/5 transition-colors">
                <p className="text-lg mb-1">{"\uD83D\uDCC4"}</p>
                <p className="text-sm text-text-muted">Drop a CSV file or click to upload</p>
                <p className="text-xs text-text-dim mt-1">Format: wallet, amount</p>
                <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCSV} className="hidden" />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-dim">Chain:</span>
                <select value={chain} onChange={(e) => setChain(e.target.value)} className="bg-surface-3 text-text-primary border border-border rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-brand-primary/40">
                  <option value="base">{"\u26A1"} Base ($0 gas)</option>
                  <optgroup label="More chains">
                    {CHAINS.slice(1).map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                  </optgroup>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-dim">Token:</span>
                <select value={token} onChange={(e) => setToken(e.target.value)} className="bg-surface-3 text-text-primary border border-border rounded-lg px-3 py-1.5 text-xs font-medium outline-none focus:border-brand-primary/40">
                  {chainTokens.map((t) => (<option key={t.symbol} value={t.symbol}>{t.symbol}</option>))}
                </select>
              </div>
            </div>
            <button onClick={preview} className="px-6 py-2.5 rounded-full gradient-primary text-white font-semibold text-sm glow-primary">Preview Payments &rarr;</button>
          </div>

          {/* PREVIEW */}
          {showPreview && entries.length > 0 && (
            <div ref={previewRef} className="border-t border-border bg-surface-0">
              <div className="px-5 py-2.5 bg-brand-primary/8 text-brand-primary text-xs font-medium">
                {entries.length} payments &rarr; 1 transaction &middot; {entries.length - 1} manual send{entries.length - 1 > 1 ? "s" : ""} eliminated &middot; ~{timeSaved} min saved
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                <span className="text-sm font-semibold text-brand-primary">Payment Preview</span>
                <span className="text-xs text-text-dim">{entries.length} recipient{entries.length > 1 ? "s" : ""}</span>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-border">
                  <th className="px-5 py-2 text-left text-xs font-semibold text-text-dim uppercase tracking-wider">Recipient</th>
                  <th className="px-5 py-2 text-right text-xs font-semibold text-text-dim uppercase tracking-wider">Amount</th>
                </tr></thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr key={i} className="border-b border-border/30">
                      <td className="px-5 py-3 text-sm font-mono text-text-muted">{shortenAddr(e.addr)}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-right">{fmt(e.amount)} {tokenSymbol}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {/* Stats */}
              <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-4">
                <div className="flex gap-6 flex-wrap">
                  <div><p className="text-xs text-text-dim">Total</p><p className="text-base font-bold">{fmt(total)} {tokenSymbol}</p></div>
                  <div><p className="text-xs text-text-dim">Fee (1%)</p><p className="text-base font-bold">{fmt(fee)} {tokenSymbol}</p></div>
                  <div><p className="text-xs text-text-dim">Gas</p><p className="text-base font-bold text-brand-primary">{gas === 0 ? "$0 gas \u26A1" : `$${gas.toFixed(2)}`}</p></div>
                  <div><p className="text-xs text-text-dim">You save</p><p className="text-base font-bold text-brand-primary">{savedGas > 0 ? `~${timeSaved} min + $${savedGas.toFixed(2)}` : `~${timeSaved} min`}</p></div>
                </div>
                <button
                  onClick={handleSendClick}
                  disabled={sendDisabled}
                  className={`px-6 py-3 rounded-full font-bold text-sm whitespace-nowrap flex items-center gap-2 transition-all ${
                    txStep === "done"
                      ? "bg-brand-primary/20 text-brand-primary border border-brand-primary/30"
                      : txStep === "error"
                      ? "bg-red-500/20 text-red-400 border border-red-500/30"
                      : "gradient-primary text-white glow-primary"
                  } disabled:opacity-50`}
                >
                  {getSendButtonText()} {txStep === "idle" || txStep === "error" ? "\u2192" : ""}
                </button>
              </div>

              {/* TX Status */}
              {txStep !== "idle" && (
                <div className={`px-5 py-3 text-sm font-medium flex items-center gap-2 ${
                  txStep === "done" ? "bg-brand-primary/8 text-brand-primary" :
                  txStep === "error" ? "bg-red-500/8 text-red-400" :
                  "bg-surface-3 text-text-muted"
                }`}>
                  {txStep !== "done" && txStep !== "error" && (
                    <span className="w-4 h-4 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                  )}
                  {txStep === "done" && "\u2713 "}
                  {txStep === "error" && "\u2717 "}
                  {TX_STEP_LABELS[txStep]}
                  {txError && txStep === "error" && <span className="text-xs ml-2 opacity-70">{txError}</span>}
                  {txHash && (
                    <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener" className="ml-auto text-xs text-brand-primary underline">
                      View on Basescan &rarr;
                    </a>
                  )}
                </div>
              )}

              {/* USDC Balance indicator when connected */}
              {isConnected && usdcBalance !== null && (
                <div className="px-5 py-2 text-xs text-text-dim border-t border-border">
                  Wallet: {shortenAddr(address || "")} &middot; {tokenSymbol} Balance: {fmt(usdcBalance)}
                </div>
              )}

              <div className="px-5 py-2.5 bg-brand-primary/8 text-brand-primary text-sm font-medium">
                {"\uD83D\uDCB0"} Only <strong>{fmt(fee)} {tokenSymbol}</strong> to process this entire payroll
              </div>
              <div className="px-5 py-3 flex gap-2 flex-wrap border-t border-border">
                {[
                  { label: "\uD83D\uDCBE Save for Next Month", fn: () => setSaveModal(true) },
                  { label: "\uD83D\uDCE7 Email Summary", fn: () => setEmailModal(true) },
                  { label: "\uD83D\uDCE5 Download CSV", fn: downloadCSV },
                ].map((btn) => (
                  <button key={btn.label} onClick={btn.fn} className="px-4 py-2 rounded-full text-xs font-medium border border-border text-text-muted hover:border-brand-primary/40 hover:text-brand-primary hover:bg-brand-primary/5 transition-colors">
                    {btn.label}
                  </button>
                ))}
              </div>
              <div className="px-5 py-2 text-center text-xs text-text-dim border-t border-border">{"\u23F1"} Takes ~60 seconds to complete</div>
              <div className="px-5 py-2.5 bg-surface-3 text-center text-xs text-text-dim">
                {"\uD83D\uDD17"} All transactions verified on-chain &middot; <a href="https://basescan.org" target="_blank" rel="noopener" className="text-brand-primary underline">View example transaction &rarr;</a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-6 py-20" id="how">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary text-center mb-3">Simple by design</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight mb-2">Three steps. That&apos;s it.</h2>
        <p className="text-sm text-text-muted text-center max-w-md mx-auto mb-12">No onboarding. No training. If you can paste a spreadsheet, you can run payroll.</p>
        <div className="grid md:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden">
          {[
            { num: "01", title: "Upload your payroll", desc: "Paste wallet addresses and amounts, or upload a CSV. Works with any EVM or Bitcoin address." },
            { num: "02", title: "Preview everything", desc: "See totals, fees, and every recipient before anything is sent. No surprises, no guessing." },
            { num: "03", title: "Send in one click", desc: "All payments batch into a single transaction. Everyone gets paid instantly. You get a receipt." },
          ].map((step) => (
            <div key={step.num} className="bg-surface-2 p-8">
              <span className="text-xs font-bold text-brand-primary tracking-widest">{step.num}</span>
              <h3 className="text-base font-bold mt-4 mb-2">{step.title}</h3>
              <p className="text-sm text-text-muted leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TRUST */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary text-center mb-3">Built for trust</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight mb-2">Your money, your control</h2>
        <p className="text-sm text-text-muted text-center max-w-md mx-auto mb-12">We never hold your funds. Every payment is verified on-chain.</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { icon: "\uD83D\uDD10", title: "Non-custodial", desc: "Payments go directly from your wallet to recipients. We never touch your funds." },
            { icon: "\uD83D\uDC41\uFE0F", title: "Preview before sending", desc: "Review every address and amount before you confirm. Catch mistakes before they happen." },
            { icon: "\u26D3\uFE0F", title: "On-chain receipts", desc: "Every payment is a verifiable blockchain transaction. Full transparency." },
            { icon: "\u26A1", title: "13 chains supported", desc: "Base, Ethereum, Arbitrum, Polygon, Solana, Bitcoin, and 7 more." },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3 p-5 bg-surface-2 border border-border rounded-xl">
              <div className="w-9 h-9 rounded-lg bg-brand-primary/10 flex items-center justify-center text-base flex-shrink-0">{item.icon}</div>
              <div>
                <h4 className="text-sm font-bold mb-0.5">{item.title}</h4>
                <p className="text-xs text-text-muted leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary text-center mb-3">Who it&apos;s for</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight mb-2">Used by teams running monthly payroll</h2>
        <p className="text-sm text-text-muted text-center mb-12">Set it up once. Run it every payday.</p>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { icon: "\uD83C\uDFE2", title: "Remote Teams", desc: "Pay contractors and employees across borders. No wires, no delays, no bank fees." },
            { icon: "\uD83C\uDFDB\uFE0F", title: "DAO Payouts", desc: "Distribute contributor rewards in one transaction. Treasury ops made simple." },
            { icon: "\uD83D\uDCBB", title: "Freelancer Payments", desc: "Pay multiple freelancers at once. They get USDC instantly, cash out their way." },
          ].map((uc) => (
            <div key={uc.title} className="p-7 bg-surface-2 border border-border rounded-2xl text-center hover:border-brand-primary/30 transition-colors">
              <span className="text-3xl block mb-3">{uc.icon}</span>
              <h3 className="text-sm font-bold mb-1">{uc.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section className="max-w-lg mx-auto px-6 py-20" id="pricing">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-primary text-center mb-3">Simple pricing</p>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-center tracking-tight mb-2">No surprises</h2>
        <p className="text-sm text-text-muted text-center mb-10">Start free. Pay only when you send.</p>
        <div className="bg-surface-2 border border-border rounded-2xl overflow-hidden text-center">
          <div className="px-8 pt-10 pb-6">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 text-xs font-semibold text-brand-primary mb-4">{"\u2728"} Free under 10 payments</span>
            <h3 className="text-xl font-bold mb-2">Pay as you go</h3>
            <p className="text-5xl font-extrabold tracking-tight">1%<span className="text-base text-text-muted font-normal"> per batch</span></p>
            <p className="text-xs text-text-dim mt-2">No subscriptions. No hidden fees. No minimums.</p>
          </div>
          <div className="w-[calc(100%-64px)] mx-auto h-px bg-border" />
          <div className="px-8 py-6 text-left space-y-3">
            {["Unlimited recipients per batch", "All 13 chains included", "CSV upload & paste input", "Gas-free on Base", "On-chain receipts & CSV export"].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm"><Check className="text-brand-primary flex-shrink-0" />{f}</div>
            ))}
          </div>
          <div className="px-8 pb-8">
            <a href="/auth?signup=true" className="inline-block px-8 py-3 rounded-full gradient-primary text-white font-bold text-sm glow-primary">Start Free &rarr;</a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-3">You&apos;re still doing payroll manually?</h2>
        <p className="text-text-muted max-w-md mx-auto mb-8">Teams run StablePay every month. Set it up once, run payroll in 60 seconds &mdash; forever.</p>
        <a href="#demo" className="inline-block px-8 py-3.5 rounded-full gradient-primary text-white font-bold text-sm glow-primary">Run Demo Payroll &rarr;</a>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center">
        <p className="text-xs text-text-dim">&copy; 2026 StablePay &middot; <a href="https://spraay.app" target="_blank" rel="noopener" className="hover:text-text-muted transition-colors">Powered by Spraay Protocol</a></p>
      </footer>

      {/* MODALS */}
      <Modal open={saveModal} onClose={() => setSaveModal(false)} title={"\uD83D\uDCBE Save Payroll"}>
        <label className="text-xs text-text-muted block mb-1.5">Payroll name</label>
        <input value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="e.g. March 2026 Payroll" className="w-full px-4 py-2.5 bg-surface-0 border border-border rounded-xl text-sm text-text-primary placeholder-text-dim outline-none focus:border-brand-primary/40 mb-3" />
        <button onClick={savePayroll} className="w-full py-3 rounded-full gradient-primary text-white font-bold text-sm glow-primary">Save Payroll</button>
        <p className="text-xs text-text-dim text-center mt-2.5">Saved locally. Return anytime to run it again.</p>
      </Modal>

      <Modal open={emailModal} onClose={() => setEmailModal(false)} title={"\uD83D\uDCE7 Email Summary"}>
        <label className="text-xs text-text-muted block mb-1.5">Your email</label>
        <input value={emailAddr} onChange={(e) => setEmailAddr(e.target.value)} type="email" placeholder="you@company.com" className="w-full px-4 py-2.5 bg-surface-0 border border-border rounded-xl text-sm text-text-primary placeholder-text-dim outline-none focus:border-brand-primary/40 mb-3" />
        <button onClick={emailSummary} disabled={emailSending} className="w-full py-3 rounded-full gradient-primary text-white font-bold text-sm glow-primary disabled:opacity-50">{emailSending ? "Sending..." : "Send Summary"}</button>
        <p className="text-xs text-text-dim text-center mt-2.5">We&apos;ll send totals, recipients, and a link to return.</p>
      </Modal>

      {/* WALLET CONNECT MODAL */}
      <Modal open={walletModal} onClose={() => setWalletModal(false)} title="Connect Wallet to Run Payroll">
        <p className="text-sm text-text-muted mb-4">Choose your wallet to connect and send payroll on Base.</p>
        <div className="space-y-2 mb-4">
          <button
            onClick={() => { connect({ connector: injected() }); setWalletModal(false); flash("Wallet connected"); }}
            className="w-full py-3 px-4 rounded-xl bg-surface-3 border border-border hover:border-brand-primary/40 transition-colors flex items-center gap-3 text-sm font-medium"
          >
            <span className="text-lg">{"\uD83E\uDD8A"}</span> MetaMask / Browser Wallet
          </button>
          <button
            onClick={() => { connect({ connector: coinbaseWallet({ appName: "StablePay" }) }); setWalletModal(false); flash("Wallet connected"); }}
            className="w-full py-3 px-4 rounded-xl bg-surface-3 border border-border hover:border-brand-primary/40 transition-colors flex items-center gap-3 text-sm font-medium"
          >
            <span className="text-lg">{"\uD83D\uDD35"}</span> Coinbase Wallet
          </button>
        </div>
        <div className="space-y-0 mb-4">
          {[
            { num: "1", text: "Connect your wallet" },
            { num: "2", text: "Approve USDC spend (one-time)" },
            { num: "3", text: "Confirm & send \u2014 all payments in 1 tx" },
          ].map((step) => (
            <div key={step.num} className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
              <span className="w-6 h-6 rounded-full bg-brand-primary/15 text-brand-primary text-xs font-bold flex items-center justify-center flex-shrink-0">{step.num}</span>
              <p className="text-xs text-text-muted">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-dim text-center">Non-custodial &mdash; you control your funds the entire time</p>
      </Modal>

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
