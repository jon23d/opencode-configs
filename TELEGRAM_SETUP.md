# Telegram Notifications for OpenCode

This feature sends Telegram messages via the Bot API when OpenCode session events occur, such as when a session becomes idle or encounters an error.

## Setup

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts to create a bot
3. BotFather will give you a **Bot Token** (e.g., `123456789:ABCdefGhIjKlMnOpQrStUvWxYz`)

### 2. Get Your Chat ID

1. Start a conversation with your new bot (search for it by username and press **Start**)
2. Send any message to the bot
3. Open this URL in your browser (replace `YOUR_BOT_TOKEN`):
   ```
   https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
   ```
4. Look for `"chat":{"id":123456789}` in the response — that number is your **Chat ID**


> **Tip:** For group chats, add the bot to the group, send a message, and check `getUpdates`. Group chat IDs are typically negative numbers.

### 3. Configure Environment Variables

Set the following environment variables:

```bash
# Required - Your bot token from @BotFather
export TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIjKlMnOpQrStUvWxYz

# Required - The chat ID to send messages to
export TELEGRAM_CHAT_ID=987654321
```


### 4. Restart OpenCode
Opencode will automatically detect these when you start a new session and send you notifications when tasks are complete.