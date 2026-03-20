import { ethers } from 'ethers';
import { findPlayerById, updatePlayer, getNextDepositIndex } from './db';

let provider: ethers.JsonRpcProvider | null = null;
let hdNode: ethers.HDNodeWallet | null = null;
let hotWallet: ethers.Wallet | null = null;

export function initEth() {
  const rpc = process.env.ETH_RPC_URL;
  const mnemonic = process.env.ETH_MNEMONIC;
  const hotKey = process.env.HOT_WALLET_KEY;

  if (!rpc || !mnemonic) {
    console.warn('ETH not configured — deposit/withdraw disabled');
    return;
  }

  provider = new ethers.JsonRpcProvider(rpc);
  hdNode = ethers.HDNodeWallet.fromMnemonic(
    ethers.Mnemonic.fromPhrase(mnemonic),
    "m/44'/60'/0'/0"
  );

  if (hotKey) {
    hotWallet = new ethers.Wallet(hotKey, provider);
    console.log('Hot wallet:', hotWallet.address);
  }

  console.log('ETH provider connected:', rpc);
}

// Generate a unique deposit address for a player using HD derivation
export function generateDepositAddress(index: number): { address: string; path: string } {
  if (!hdNode) throw new Error('ETH not configured');
  const child = hdNode.deriveChild(index);
  return { address: child.address, path: `m/44'/60'/0'/0/${index}` };
}

// Get or create deposit address for a player
export async function getDepositAddress(playerId: string): Promise<string> {
  const player = await findPlayerById(playerId);
  if (!player) throw new Error('Player not found');

  if (player.deposit_address) return player.deposit_address;

  const index = getNextDepositIndex();
  const { address } = generateDepositAddress(index);

  await updatePlayer(playerId, {
    deposit_address: address,
    deposit_index: index,
  });

  return address;
}

// Check balance of a deposit address
export async function checkDepositBalance(address: string): Promise<bigint> {
  if (!provider) throw new Error('ETH not configured');
  return provider.getBalance(address);
}

// Sweep funds from deposit address to hot wallet
export async function sweepDeposit(playerIndex: number): Promise<string | null> {
  if (!provider || !hdNode || !hotWallet) return null;

  const child = hdNode.deriveChild(playerIndex);
  const wallet = new ethers.Wallet(child.privateKey, provider);
  const balance = await provider.getBalance(wallet.address);

  if (balance === 0n) return null;

  // Estimate gas and sweep remaining
  const gasPrice = (await provider.getFeeData()).gasPrice || 0n;
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;

  if (balance <= gasCost) return null;

  const tx = await wallet.sendTransaction({
    to: hotWallet.address,
    value: balance - gasCost,
    gasLimit,
    gasPrice,
  });

  return tx.hash;
}

// Withdraw from hot wallet to player's external address
export async function withdrawToAddress(
  toAddress: string,
  amountWei: bigint
): Promise<{ hash: string; fee: bigint }> {
  if (!provider || !hotWallet) throw new Error('ETH not configured');

  // Validate address
  if (!ethers.isAddress(toAddress)) throw new Error('Invalid address');

  const gasPrice = (await provider.getFeeData()).gasPrice || 0n;
  const gasLimit = 21000n;
  const gasCost = gasPrice * gasLimit;

  const tx = await hotWallet.sendTransaction({
    to: toAddress,
    value: amountWei,
    gasLimit,
    gasPrice,
  });

  return { hash: tx.hash, fee: gasCost };
}

// Format wei to ETH string
export function weiToEth(wei: bigint): string {
  return ethers.formatEther(wei);
}

export function ethToWei(eth: string): bigint {
  return ethers.parseEther(eth);
}
