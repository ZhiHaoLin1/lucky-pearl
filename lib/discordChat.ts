import { db } from './db';
import { isGuestConversation } from './chat';

const DISCORD_API = process.env.DISCORD_API_BASE || 'https://discord.com/api/v10';

// Custom ids on the Reply button and the modal both carry the conversation id.
export const REPLY_BUTTON_PREFIX = 'chat-reply:';
export const REPLY_MODAL_PREFIX = 'chat-modal:';

export function isChatBotConfigured() {
  return Boolean(process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHAT_CHANNEL_ID);
}

export async function conversationLabel(conversationId: string): Promise<string> {
  if (isGuestConversation(conversationId)) {
    return `Guest …${conversationId.slice(-4)}`;
  }
  const result = await db.execute({ sql: 'SELECT full_name FROM users WHERE id = ?', args: [conversationId] });
  return result.rows[0] ? String(result.rows[0].full_name) : 'Unknown customer';
}

/**
 * Posts a customer's chat message into the support channel with a Reply button.
 * Returns false if the bot isn't set up or Discord rejects it, so the caller can fall back.
 */
export async function postCustomerMessageToDiscord(options: {
  conversationId: string;
  label: string;
  details: string; // e.g. "Gold member · email"
  text: string;
}): Promise<boolean> {
  if (!isChatBotConfigured()) return false;
  const customId = REPLY_BUTTON_PREFIX + options.conversationId;
  if (customId.length > 100) return false;

  try {
    const response = await fetch(`${DISCORD_API}/channels/${process.env.DISCORD_CHAT_CHANNEL_ID}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        // Customer text must never be able to ping @everyone / roles / users.
        allowed_mentions: { parse: [] },
        embeds: [
          {
            color: 0xd4af37,
            title: `💬 ${options.label}`,
            description: options.text.slice(0, 1000),
            footer: { text: options.details.slice(0, 200) },
          },
        ],
        components: [
          {
            type: 1,
            components: [{ type: 2, style: 1, label: 'Reply', emoji: { name: '↩️' }, custom_id: customId }],
          },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
