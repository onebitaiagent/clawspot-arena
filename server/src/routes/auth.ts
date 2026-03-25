import { Router, Request, Response } from 'express';
import { verifyTelegramAuth } from '../services/telegram';
import { findPlayerByTelegramId, findPlayerById, findPlayerByUsername, createPlayer } from '../services/db';
import { getDepositAddress, generateDepositAddress } from '../services/eth';
import { ethers } from 'ethers';
import crypto from 'crypto';

// Generate wallet info for a player (address + private key)
function getWalletKeys(depositIndex: number): { address: string; privateKey: string } | null {
  const mnemonic = process.env.ETH_MNEMONIC;
  if (!mnemonic || depositIndex === undefined || depositIndex === null) return null;
  try {
    const hdNode = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(mnemonic), "m/44'/60'/0'/0");
    const child = hdNode.deriveChild(depositIndex);
    return { address: child.address, privateKey: child.privateKey };
  } catch { return null; }
}

// Send wallet backup via TG bot DM
async function sendTGWalletBackup(chatId: number, username: string, address: string, privateKey: string) {
  const botToken = process.env.TG_BOT_TOKEN;
  if (!botToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔐 <b>Welcome to ClawRisk Arena!</b>\n\n` +
          `Your wallet has been created. <b>Save this backup!</b>\n\n` +
          `<b>Username:</b> ${username}\n` +
          `<b>Deposit Address (Base L2):</b>\n<code>${address}</code>\n\n` +
          `<b>Private Key:</b>\n<code>${privateKey}</code>\n\n` +
          `⚠️ <b>NEVER share your private key.</b> You can import it into MetaMask to access your funds directly.`,
        parse_mode: 'HTML',
      }),
    });
  } catch (e) { console.error('Failed to send TG wallet backup:', e); }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'clawrisk_salt_2026').digest('hex');
}

export const authRouter = Router();

// Telegram Mini App auth
authRouter.post('/telegram', async (req: Request, res: Response) => {
  try {
    const { initData } = req.body;
    if (!initData) return res.status(400).json({ error: 'Missing initData' });

    const botToken = process.env.TG_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: 'Bot token not configured' });

    const { valid, user } = verifyTelegramAuth(initData, botToken);
    if (!valid || !user) return res.status(401).json({ error: 'Invalid Telegram auth' });

    // Find or create player
    let player = await findPlayerByTelegramId(user.id);
    let isNewPlayer = false;
    if (!player) {
      player = await createPlayer({
        telegram_id: user.id,
        username: user.username || user.first_name || 'Crab_' + user.id,
      });
      isNewPlayer = true;
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, player.id);

    // Generate deposit address + send wallet backup for new TG users
    if (isNewPlayer) {
      try {
        const addr = await getDepositAddress(player.id);
        const updatedPlayer = await findPlayerById(player.id);
        if (updatedPlayer?.deposit_index !== undefined && updatedPlayer?.deposit_index !== null) {
          const keys = getWalletKeys(updatedPlayer.deposit_index);
          if (keys) {
            sendTGWalletBackup(user.id, player.username, keys.address, keys.privateKey);
          }
        }
      } catch (e) { /* ETH not configured, skip */ }
    }

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        balance_eth: player.balance_eth,
        balance_shells: player.balance_shells,
        wins: player.wins,
        level: player.level,
      },
    });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ error: 'Auth failed' });
  }
});

// Guest auth (no Telegram, no deposits)
authRouter.post('/guest', async (_req: Request, res: Response) => {
  try {
    const player = await createPlayer({
      username: 'Guest_' + Math.random().toString(36).slice(2, 8),
    });

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, player.id);

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        balance_eth: 0,
        balance_shells: 0,
        wins: 0,
        level: 1,
      },
    });
  } catch (err) {
    console.error('Guest auth error:', err);
    res.status(500).json({ error: 'Failed to create guest' });
  }
});

// Sign up with username + password
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: 'Username must be 2-20 characters' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }
    const clean = username.replace(/[^a-zA-Z0-9_]/g, '');
    if (clean.length < 2) return res.status(400).json({ error: 'Invalid characters in username' });

    // Check if username taken
    const existing = await findPlayerByUsername(clean);
    if (existing) return res.status(400).json({ error: 'Username already taken' });

    const player = await createPlayer({
      username: clean,
      password_hash: hashPassword(password),
    });
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, player.id);

    // Generate deposit address + wallet keys
    let walletInfo: { address?: string; privateKey?: string } = {};
    try {
      const addr = await getDepositAddress(player.id);
      const updated = await findPlayerById(player.id);
      if (updated?.deposit_index !== undefined && updated?.deposit_index !== null) {
        const keys = getWalletKeys(updated.deposit_index);
        if (keys) walletInfo = keys;
      }
    } catch (e) { /* ETH not configured */ }

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        balance_eth: player.balance_eth,
        balance_shells: player.balance_shells,
        wins: player.wins,
        level: player.level,
      },
      wallet: walletInfo.address ? { address: walletInfo.address, privateKey: walletInfo.privateKey } : undefined,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login with username + password
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const player = await findPlayerByUsername(username);
    if (!player) return res.status(401).json({ error: 'User not found' });
    if (!player.password_hash) return res.status(401).json({ error: 'Account has no password (use Telegram)' });
    if (player.password_hash !== hashPassword(password)) return res.status(401).json({ error: 'Wrong password' });

    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, player.id);

    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        balance_eth: player.balance_eth,
        balance_shells: player.balance_shells,
        wins: player.wins,
        level: player.level,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
authRouter.post('/logout', (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    sessions.delete(auth.slice(7));
  }
  res.json({ ok: true });
});

// Get current player info
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const playerId = getPlayerFromToken(req);
    if (!playerId) return res.status(401).json({ error: 'Not authenticated' });

    const player = await findPlayerById(playerId);
    if (!player) return res.status(404).json({ error: 'Player not found' });

    res.json({
      id: player.id,
      username: player.username,
      balance_eth: player.balance_eth,
      balance_shells: player.balance_shells,
      wins: player.wins,
      losses: player.losses,
      total_earned: player.total_earned,
      xp: player.xp,
      level: player.level,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get player' });
  }
});

// === Session management ===
const sessions = new Map<string, string>(); // token → playerId

export function getPlayerFromToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return sessions.get(token) || null;
}

export function getPlayerFromTokenString(token: string): string | null {
  return sessions.get(token) || null;
}
