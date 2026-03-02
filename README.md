# 💵 StablePay.me

**Get Paid. Stay Stable.**

The simplest crypto payroll platform. Pay your global team in digital dollars across 11 chains — powered by 💧 Spraay Protocol.

## Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (Postgres + Auth + Realtime)
- **Payments:** Spraay Protocol (batch payments on 11 chains)
- **Wallet:** Wagmi + OnchainKit + WalletConnect
- **Styling:** Tailwind CSS
- **Email:** Resend
- **Deploy:** Vercel
- **Mobile:** PWA (installable from browser)

## Architecture

```
stablepay.me/
├── /employer      → Employer dashboard (web, desktop-first)
│   ├── /team      → Manage team members
│   ├── /pay-runs  → View and run payroll
│   ├── /funding   → Fund account with USDC
│   └── /settings  → Company settings
├── /recipient     → Recipient app (mobile-first PWA)
│   ├── /history   → Payment history
│   ├── /cashout   → Cash out to bank or wallet
│   └── /settings  → Chain preference, display mode
├── /auth          → Magic link + wallet connect auth
├── /invite/[token]→ Recipient onboarding from invite
└── /api
    ├── /payroll   → Create and execute pay runs
    ├── /invite    → Send recipient invites
    └── /webhook   → On-chain event listeners
```

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/plagtech/stablepay.git
cd stablepay
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Copy your project URL and anon key

### 3. Set up environment

```bash
cp .env.example .env.local
```

Fill in your values:
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard (Settings > API)
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` — from [cloud.walletconnect.com](https://cloud.walletconnect.com)
- `RESEND_API_KEY` — from [resend.com](https://resend.com)
- `NEXT_PUBLIC_SPRAAY_BASE` — Your Spraay V2 contract address on Base
- (Add other chain Spraay addresses as needed)

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy to Vercel

```bash
npx vercel
```

Or connect your GitHub repo to Vercel for auto-deploys.

### 6. Point DNS

In GoDaddy, add:
- **A Record:** `@` → Vercel IP (76.76.21.21)
- **CNAME:** `www` → `cname.vercel-dns.com`

## How Payroll Works

1. Employer adds team members (name, email, pay amount)
2. Recipients get email invite → accept → set wallet + preferred chain
3. Employer funds account with USDC on any supported chain
4. Employer clicks "Run Payroll"
5. API creates pay run records in Supabase
6. Client-side: Employer's wallet signs Spraay `batchTransfer` transaction
7. Spraay sends USDC to all recipients in ONE transaction
8. API updates records with tx hash
9. Recipients get push notification: "You've been paid $X,XXX 💰"

## Spraay Integration

StablePay uses Spraay V2's `batchTransfer` function:

```solidity
function batchTransfer(
  address token,        // USDC address
  address[] recipients, // Employee wallets
  uint256[] amounts     // Payment amounts
) external
```

- 0.3% protocol fee
- Gas-free on Base via Coinbase Paymaster
- Available on 11 chains

## TODO

- [ ] Convert prototype JSX components to proper Next.js pages
- [ ] Build invite acceptance flow at /invite/[token]
- [ ] Integrate Coinbase Onramp/Offramp for cash-out
- [ ] Add scheduled/recurring payroll with cron jobs
- [ ] CSV import for bulk employee upload
- [ ] Push notifications via Web Push API
- [ ] Generate PWA icons (192x192 and 512x512)
- [ ] Tax document export (CSV for accounting)
- [ ] Wrap in Capacitor for App Store / Play Store submission

## License

Proprietary — © 2026 StablePay / LP
