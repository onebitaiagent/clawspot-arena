#!/bin/bash
# ClawSpot Arena — Telegram Bot Setup
# Run this after getting your bot token from @BotFather
#
# Usage:
#   ./setup-bot.sh YOUR_BOT_TOKEN YOUR_WEBAPP_URL
#
# Example:
#   ./setup-bot.sh 123456:ABC-DEF https://romantic-curiosity-production-f21e.up.railway.app

TOKEN=$1
URL=$2

if [ -z "$TOKEN" ] || [ -z "$URL" ]; then
  echo "Usage: ./setup-bot.sh <BOT_TOKEN> <WEBAPP_URL>"
  echo "Example: ./setup-bot.sh 123456:ABC https://your-app.up.railway.app"
  exit 1
fi

echo "Setting up ClawSpot Arena bot..."
echo ""

# 1. Set webhook
echo "1. Setting webhook..."
curl -s "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -d "url=${URL}/api/bot/webhook" \
  -d "allowed_updates=[\"message\",\"callback_query\"]" | python -m json.tool 2>/dev/null || echo "(set)"
echo ""

# 2. Set bot commands
echo "2. Setting commands..."
curl -s "https://api.telegram.org/bot${TOKEN}/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start ClawSpot Arena"},
      {"command": "play", "description": "Open the game"},
      {"command": "balance", "description": "Check your ETH balance"},
      {"command": "help", "description": "How to play"}
    ]
  }' | python -m json.tool 2>/dev/null || echo "(set)"
echo ""

# 3. Set bot description
echo "3. Setting description..."
curl -s "https://api.telegram.org/bot${TOKEN}/setMyDescription" \
  -d "description=Territory warfare with crabs. Deploy troops, attack enemies, conquer the grid. Win ETH on Base L2. No wallet connect needed." | python -m json.tool 2>/dev/null || echo "(set)"
echo ""

# 4. Set short description
curl -s "https://api.telegram.org/bot${TOKEN}/setMyShortDescription" \
  -d "short_description=RISK meets crypto. Conquer territory with crabs, win ETH." | python -m json.tool 2>/dev/null || echo "(set)"
echo ""

# 5. Configure Menu Button (Mini App launcher)
echo "4. Setting menu button..."
curl -s "https://api.telegram.org/bot${TOKEN}/setChatMenuButton" \
  -H "Content-Type: application/json" \
  -d "{
    \"menu_button\": {
      \"type\": \"web_app\",
      \"text\": \"Play\",
      \"web_app\": {\"url\": \"${URL}/play.html\"}
    }
  }" | python -m json.tool 2>/dev/null || echo "(set)"
echo ""

echo "Done! Your bot is configured."
echo ""
echo "Next steps:"
echo "  1. Set env vars on Railway:"
echo "     railway vars set TG_BOT_TOKEN=${TOKEN}"
echo "     railway vars set WEBAPP_URL=${URL}"
echo ""
echo "  2. Open your bot in Telegram and send /start"
echo "  3. Tap the 'Play' button to launch the Mini App"
