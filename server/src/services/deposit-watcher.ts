import { ethers } from 'ethers';
import { getDb } from './db';
import { sweepDeposit, weiToEth } from './eth';

const POLL_INTERVAL = 15_000; // 15 seconds
let timer: ReturnType<typeof setInterval> | null = null;

interface DepositPlayer {
  id: string;
  username: string;
  deposit_address: string;
  deposit_index: number;
  balance_eth: number;
}

/**
 * Start the deposit watcher background service.
 * Polls every 15s for deposits on player-assigned HD addresses,
 * sweeps funds to the hot wallet, and credits the player's balance.
 */
export function startDepositWatcher() {
  const rpc = process.env.ETH_RPC_URL;
  const mnemonic = process.env.ETH_MNEMONIC;

  if (!rpc || !mnemonic) {
    console.log('[deposit-watcher] ETH not configured — watcher disabled');
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpc);

  console.log('[deposit-watcher] Started — polling every 15s');

  timer = setInterval(() => {
    pollDeposits(provider).catch((err) => {
      console.error('[deposit-watcher] Poll cycle error:', err.message);
    });
  }, POLL_INTERVAL);

  // Run once immediately on startup
  pollDeposits(provider).catch((err) => {
    console.error('[deposit-watcher] Initial poll error:', err.message);
  });
}

export function stopDepositWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log('[deposit-watcher] Stopped');
  }
}

async function getPlayersWithDeposits(): Promise<DepositPlayer[]> {
  const db = getDb();
  if (db) {
    const { data, error } = await db
      .from('players')
      .select('id, username, deposit_address, deposit_index, balance_eth')
      .not('deposit_address', 'is', null);
    if (error) throw error;
    return (data || []) as DepositPlayer[];
  }
  // In-memory fallback: no easy way to iterate — return empty
  // (deposit watcher is only meaningful with a real DB in production)
  return [];
}

async function logDeposit(
  db: ReturnType<typeof getDb>,
  playerId: string,
  address: string,
  amountWei: bigint,
  txHash: string
) {
  if (!db) return;
  await db.from('deposits').insert({
    player_id: playerId,
    from_address: address,
    to_address: 'hot_wallet',
    amount_wei: amountWei.toString(),
    amount_eth: parseFloat(weiToEth(amountWei)),
    tx_hash: txHash,
    confirmed: true,
  });
}

async function pollDeposits(provider: ethers.JsonRpcProvider) {
  const players = await getPlayersWithDeposits();
  if (players.length === 0) return;

  const db = getDb();

  for (const player of players) {
    try {
      const balance = await provider.getBalance(player.deposit_address);

      if (balance === 0n) continue;

      // Estimate gas to see if sweep is worthwhile
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const gasCost = gasPrice * 21000n;

      if (balance <= gasCost) {
        // Balance too small to cover gas — skip
        continue;
      }

      const netAmount = balance - gasCost;

      console.log(
        `[deposit-watcher] Deposit detected for ${player.username} (${player.id}): ` +
        `${weiToEth(balance)} ETH at ${player.deposit_address}`
      );

      // Sweep funds to hot wallet
      const txHash = await sweepDeposit(player.deposit_index);

      if (!txHash) {
        console.warn(`[deposit-watcher] Sweep returned null for player ${player.id}`);
        continue;
      }

      console.log(`[deposit-watcher] Swept ${weiToEth(netAmount)} ETH → hot wallet, tx: ${txHash}`);

      // Credit the player's balance (stored as a float of ETH)
      const creditEth = parseFloat(weiToEth(netAmount));
      const newBalance = (player.balance_eth || 0) + creditEth;

      if (db) {
        const { error } = await db
          .from('players')
          .update({ balance_eth: newBalance })
          .eq('id', player.id);
        if (error) {
          console.error(`[deposit-watcher] Failed to credit player ${player.id}:`, error.message);
          continue;
        }
      }

      // Log to deposits table
      await logDeposit(db, player.id, player.deposit_address, netAmount, txHash);

      console.log(
        `[deposit-watcher] Credited ${creditEth} ETH to ${player.username} ` +
        `(new balance: ${newBalance} ETH)`
      );
    } catch (err: any) {
      // Don't crash the loop — log and continue to next player
      console.error(
        `[deposit-watcher] Error checking player ${player.id} ` +
        `(${player.deposit_address}):`,
        err.message
      );
    }
  }
}
