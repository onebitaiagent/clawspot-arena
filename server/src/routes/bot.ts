import { Router, Request, Response } from 'express';

export const botRouter = Router();

// Telegram webhook endpoint — receives updates from Bot API
botRouter.post('/webhook', (req: Request, res: Response) => {
  const update = req.body;

  // Handle /start command
  if (update.message?.text === '/start') {
    const chatId = update.message.chat.id;
    const firstName = update.message.from?.first_name || 'Crab';
    sendMessage(chatId,
      `🦀 Welcome to ClawSpot Arena, ${firstName}!\n\n` +
      `⚔ Territory warfare with crabs. RISK meets crypto.\n\n` +
      `Deploy troops, attack enemies, conquer the 10x10 grid.\n` +
      `Capture 60 spots to dominate and win ETH!\n\n` +
      `Tap the button below to play 👇`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '🦀 Play ClawSpot Arena', web_app: { url: getWebAppUrl() } }
          ]]
        }
      }
    );
  }

  // Handle /help
  if (update.message?.text === '/help') {
    const chatId = update.message.chat.id;
    sendMessage(chatId,
      `🦀 ClawSpot Arena — How to Play\n\n` +
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
          { text: '⚔ Play ClawSpot Arena', web_app: { url: getWebAppUrl() } }
        ]]
      }
    });
  }

  // Handle /balance
  if (update.message?.text === '/balance') {
    const chatId = update.message.chat.id;
    sendMessage(chatId,
      `💰 Open the game to check your balance and deposit/withdraw ETH.`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '💰 Open Wallet', web_app: { url: getWebAppUrl() } }
          ]]
        }
      }
    );
  }

  res.sendStatus(200);
});

function getWebAppUrl(): string {
  return process.env.WEBAPP_URL || 'https://romantic-curiosity-production-f21e.up.railway.app/play.html';
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
