// ===========================================
// STABLEPAY TYPE DEFINITIONS
// ===========================================

export type ChainId =
  | "base"
  | "ethereum"
  | "arbitrum"
  | "polygon"
  | "avalanche"
  | "bnb"
  | "solana"
  | "unichain"
  | "plasma"
  | "bob"
  | "bittensor";

export interface Chain {
  id: ChainId;
  name: string;
  label: string; // Human-friendly label like "Fastest"
  chainId: number;
  color: string;
  rpcUrl: string;
  explorerUrl: string;
  usdcAddress: string;
  spraayAddress: string;
  gasless: boolean; // Uses Coinbase Paymaster
}

export interface Company {
  id: string;
  owner_id: string;
  name: string;
  default_chain: ChainId;
  pay_schedule: "weekly" | "biweekly" | "semimonthly" | "monthly";
  wallet_address: string;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: string;
  company_id: string;
  user_id: string | null; // null until they accept invite
  name: string;
  email: string;
  role: string;
  pay_amount: number; // Monthly amount in USD
  preferred_chain: ChainId;
  wallet_address: string | null;
  status: "pending" | "active" | "paused" | "removed";
  display_mode: "simple" | "advanced";
  created_at: string;
  updated_at: string;
}

export interface PayRun {
  id: string;
  company_id: string;
  scheduled_date: string;
  executed_at: string | null;
  total_amount: number;
  recipient_count: number;
  status: "scheduled" | "processing" | "completed" | "failed";
  chain: ChainId | "multi"; // "multi" if recipients on different chains
  tx_hash: string | null;
  spraay_batch_id: string | null;
  gas_fee: number;
  created_at: string;
}

export interface Payment {
  id: string;
  pay_run_id: string;
  recipient_id: string;
  amount_gross: number;
  fee: number;
  amount_net: number;
  chain: ChainId;
  tx_hash: string | null;
  status: "pending" | "completed" | "failed";
  paid_at: string | null;
  created_at: string;
}

export interface FundingTransaction {
  id: string;
  company_id: string;
  amount: number;
  chain: ChainId;
  tx_hash: string;
  from_address: string;
  status: "pending" | "confirmed" | "failed";
  created_at: string;
}

// --- API Request/Response Types ---

export interface RunPayrollRequest {
  company_id: string;
  recipient_ids?: string[]; // If empty, pay all active recipients
  chain_override?: ChainId; // Force all payments on one chain
}

export interface RunPayrollResponse {
  pay_run_id: string;
  status: "processing";
  estimated_total: number;
  recipient_count: number;
}

export interface InviteRecipientRequest {
  company_id: string;
  name: string;
  email: string;
  role: string;
  pay_amount: number;
}

// --- Frontend State Types ---

export type EmployerTab = "overview" | "team" | "payRuns" | "funding" | "settings";
export type RecipientTab = "home" | "history" | "cashout" | "settings";
export type AppView = "employer" | "recipient" | "landing" | "auth";
