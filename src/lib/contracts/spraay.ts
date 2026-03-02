import { ethers } from "ethers";
import { CHAINS } from "./chains";
import { ChainId } from "@/types";

// ===========================================
// SPRAAY BATCH PAYMENT INTEGRATION
// The engine that powers StablePay payroll
// ===========================================

// Spraay V2 ABI — batch payment function
export const SPRAAY_ABI = [
  "function batchTransfer(address token, address[] calldata recipients, uint256[] calldata amounts) external",
  "function batchTransferETH(address[] calldata recipients, uint256[] calldata amounts) external payable",
  "event BatchTransfer(address indexed sender, address indexed token, uint256 totalAmount, uint256 recipientCount)",
];

// ERC20 ABI for USDC approval
export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

export interface BatchPaymentParams {
  chain: ChainId;
  recipients: string[]; // wallet addresses
  amounts: number[]; // amounts in USD (will be converted to USDC decimals)
  signer: ethers.Signer;
}

export interface BatchPaymentResult {
  success: boolean;
  txHash: string | null;
  error: string | null;
  totalAmount: number;
  recipientCount: number;
}

/**
 * Execute a batch payment via Spraay Protocol
 * This is the core function that powers "Run Payroll"
 */
export async function executeBatchPayment(
  params: BatchPaymentParams
): Promise<BatchPaymentResult> {
  const { chain, recipients, amounts, signer } = params;
  const chainConfig = CHAINS[chain];

  if (!chainConfig.spraayAddress) {
    return {
      success: false,
      txHash: null,
      error: `Spraay not deployed on ${chainConfig.name}`,
      totalAmount: 0,
      recipientCount: 0,
    };
  }

  try {
    // 1. Get USDC contract for approval
    const usdcContract = new ethers.Contract(
      chainConfig.usdcAddress,
      ERC20_ABI,
      signer
    );

    // 2. Calculate total in USDC decimals (6 decimals)
    const decimals = 6;
    const amountsInWei = amounts.map((a) =>
      ethers.utils.parseUnits(a.toFixed(decimals), decimals)
    );
    const totalAmount = amountsInWei.reduce(
      (sum, a) => sum.add(a),
      ethers.BigNumber.from(0)
    );

    // 3. Check and approve USDC spending
    const signerAddress = await signer.getAddress();
    const currentAllowance = await usdcContract.allowance(
      signerAddress,
      chainConfig.spraayAddress
    );

    if (currentAllowance.lt(totalAmount)) {
      console.log("[StablePay] Approving USDC spend...");
      const approveTx = await usdcContract.approve(
        chainConfig.spraayAddress,
        ethers.constants.MaxUint256 // Approve max for convenience
      );
      await approveTx.wait();
      console.log("[StablePay] USDC approved");
    }

    // 4. Execute batch transfer via Spraay
    const spraayContract = new ethers.Contract(
      chainConfig.spraayAddress,
      SPRAAY_ABI,
      signer
    );

    console.log(
      `[StablePay] Executing batch payment: ${recipients.length} recipients, $${ethers.utils.formatUnits(totalAmount, decimals)} total`
    );

    const tx = await spraayContract.batchTransfer(
      chainConfig.usdcAddress,
      recipients,
      amountsInWei
    );

    console.log(`[StablePay] Tx submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`[StablePay] Tx confirmed in block ${receipt.blockNumber}`);

    return {
      success: true,
      txHash: tx.hash,
      error: null,
      totalAmount: amounts.reduce((s, a) => s + a, 0),
      recipientCount: recipients.length,
    };
  } catch (error: any) {
    console.error("[StablePay] Batch payment failed:", error);
    return {
      success: false,
      txHash: null,
      error: error.message || "Transaction failed",
      totalAmount: 0,
      recipientCount: 0,
    };
  }
}

/**
 * Check USDC balance for an address on a given chain
 */
export async function getUSDCBalance(
  chain: ChainId,
  address: string
): Promise<number> {
  const chainConfig = CHAINS[chain];
  if (!chainConfig.usdcAddress || !chainConfig.rpcUrl) return 0;

  try {
    const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
    const usdc = new ethers.Contract(chainConfig.usdcAddress, ERC20_ABI, provider);
    const balance = await usdc.balanceOf(address);
    const decimals = await usdc.decimals();
    return parseFloat(ethers.utils.formatUnits(balance, decimals));
  } catch (error) {
    console.error(`[StablePay] Balance check failed on ${chain}:`, error);
    return 0;
  }
}

/**
 * Estimate gas for a batch payment (returns 0 for gasless chains)
 */
export async function estimatePayrollGas(
  chain: ChainId,
  recipientCount: number
): Promise<number> {
  const chainConfig = CHAINS[chain];
  if (chainConfig.gasless) return 0;

  // Rough estimate: ~65k gas per recipient + 30k base
  const estimatedGas = 30000 + recipientCount * 65000;

  try {
    const provider = new ethers.providers.JsonRpcProvider(chainConfig.rpcUrl);
    const gasPrice = await provider.getGasPrice();
    const costInEth = parseFloat(
      ethers.utils.formatEther(gasPrice.mul(estimatedGas))
    );
    // Convert to USD (rough estimate — in production, use price feed)
    return costInEth * 3000; // Assuming ~$3000/ETH
  } catch {
    return 0;
  }
}
