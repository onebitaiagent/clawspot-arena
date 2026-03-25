import { Router, Request, Response } from 'express';
import { findPlayerByTelegramId } from '../services/db';
import { ethers } from 'ethers';

export const botRouter = Router();

// Telegram webhook endpoint — receives updates from Bot API
botRouter.post('/webhook', async (req: Request, res: Response) => {
  const update = req.body;

  // Handle /start command
  if (update.message?.text === '/start') {
    const chatId = update.message.chat.id;
    const firstName = update.message.from?.first_name || 'Crab';
    sendMessage(chatId,
      `🦀 Welcome to ClawRisk Arena, ${firstName}!\n\n` +
      `⚔ Territory warfare with crabs. RISK meets crypto.\n\n` +
      `Deploy troops, attack enemies, conquer the 10x10 grid.\n` +
      `Capture 60 spots to dominate and win ETH!\n\n` +
      `Tap the button below to play 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🦀 Play ClawRisk Arena', web_app: { url: getWebAppUrl() } }
          ]]
        }
      }
    );
  }

  // Handle /help
  if (update.message?.text === '/help') {
    const chatId = update.message.chat.id;
    sendMessage(chatId,
      `🦀 ClawRisk Arena — How to Play\n\n` +
      `1️⃣ Deploy troops on your green spots\n` +
      `2️⃣ Select a spot → tap adjacent enemy to attack\n` +
      `3️⃣ RISK-style dice combat decides the winner\n` +
      `4️⃣ Capture 60 of 100 spots to win!\n\n` +
      `💰 Join staked arenas to win ETH\n` +
      `🏆 No wallet connect needed — deposit to play\n\n` +
      `Tap below to start 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '⚔ Play Now', web_app: { url: getWebAppUrl() } }
          ]]
        }
      }
    );
  }

  // Handle /play
  if (update.message?.text === '/play') {
    const chatId = update.message.chat.id;
    sendMessage(chatId, `🦀 Let's go!`, {
      reply_markup: {
        inline_keyboard: [[
          { text: '⚔ Play ClawRisk Arena', web_app: { url: getWebAppUrl() } }
        ]]
      }
    });
  }

  // Handle /balance
  if (update.message?.text === '/balance') {
    const chatId = update.message.chat.id;
    const tgId = update.message.from?.id;
    if (tgId) {
      const player = await findPlayerByTelegramId(tgId);
      if (player) {
        sendMessage(chatId,
          `💰 <b>Your Balance</b>\n\n` +
          `ETH: <code>${(player.balance_eth || 0).toFixed(4)} ETH</code>\n` +
          `Shells: <code>${player.balance_shells || 0}</code>\n` +
          `Wins: <code>${player.wins || 0}</code>\n` +
          (player.deposit_address ? `\nDeposit Address:\n<code>${player.deposit_address}</code>` : ''),
          {
            reply_markup: {
              inline_keyboard: [[
                { text: '💰 Open Wallet', web_app: { url: getWebAppUrl() } }
              ]]
            }
          }
        );
      } else {
        sendMessage(chatId, `Play a game first to create your account!`, {
          reply_markup: { inline_keyboard: [[ { text: '🦀 Play Now', web_app: { url: getWebAppUrl() } } ]] }
        });
      }
    }
  }

  // Handle /wallet — send wallet backup (deposit address + private key)
  if (update.message?.text === '/wallet') {
    const chatId = update.message.chat.id;
    const tgId = update.message.from?.id;
    if (tgId) {
      const player = await findPlayerByTelegramId(tgId);
      if (player && player.deposit_address && player.deposit_index !== undefined && player.deposit_index !== null) {
        // Derive private key from HD wallet
        const mnemonic = process.env.ETH_MNEMONIC;
        if (mnemonic) {
          try {
            const hdNode = ethers.HDNodeWallet.fromMnemonic(
              ethers.Mnemonic.fromPhrase(mnemonic),
              "m/44'/60'/0'/0"
            );
            const child = hdNode.deriveChild(player.deposit_index);
            sendMessage(chatId,
              `🔐 <b>Wallet Backup</b>\n\n` +
              `⚠️ <b>KEEP THIS PRIVATE — DO NOT SHARE</b>\n\n` +
              `<b>Deposit Address (Base L2):</b>\n<code>${player.deposit_address}</code>\n\n` +
              `<b>Private Key:</b>\n<code>${child.privateKey}</code>\n\n` +
              `<b>Balance:</b> ${(player.balance_eth || 0).toFixed(4)} ETH\n\n` +
              `Save this somewhere safe. You can import this key into MetaMask or any wallet to access your funds directly.`
            );
          } catch (e) {
            sendMessage(chatId, `Error generating wallet backup. Contact support.`);
          }
        } else {
          sendMessage(chatId, `Wallet system not configured yet.`);
        }
      } else if (player && !player.deposit_address) {
        sendMessage(chatId,
          `You don't have a deposit address yet. Open the wallet in-game to generate one.`,
          { reply_markup: { inline_keyboard: [[ { text: '💰 Open Wallet', web_app: { url: getWebAppUrl() } } ]] } }
        );
      } else {
        sendMessage(chatId, `Play a game first to create your account!`, {
          reply_markup: { inline_keyboard: [[ { text: '🦀 Play Now', web_app: { url: getWebAppUrl() } } ]] }
        });
      }
    }
  }

  res.sendStatus(200);
});

function getWebAppUrl(): string {
  const base = process.env.WEBAPP_URL || 'https://romantic-curiosity-production-f21e.up.railway.app';
  return base + '/';
}

async function sendMessage(chatId: number, text: string, extra?: any) {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) return;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        ...extra,
      }),
    });
  } catch (e) {
    console.error('Failed to send TG message:', e);
  }
}
