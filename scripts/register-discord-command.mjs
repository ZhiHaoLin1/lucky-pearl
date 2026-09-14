import { readFileSync } from 'fs';

// Minimal .env.local parser — avoids adding a dependency just for this one-off script.
const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
const env = {};
for (const line of envText.split('\n')) {
  const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (match) env[match[1]] = match[2];
}

const applicationId = env.DISCORD_APPLICATION_ID;
const botToken = env.DISCORD_BOT_TOKEN;
const guildId = env.DISCORD_GUILD_ID;

if (!applicationId || !botToken) {
  console.error('Missing DISCORD_APPLICATION_ID or DISCORD_BOT_TOKEN in .env.local');
  process.exit(1);
}

const command = {
  name: 'fulfilled',
  description: 'Mark a pending withdrawal request as completed',
  type: 1,
  options: [
    {
      name: 'request',
      description: 'Which pending withdrawal to mark completed',
      type: 3,
      required: true,
      autocomplete: true,
    },
  ],
};

const url = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(url, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${botToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify([command]),
});

const body = await response.json();
console.log('Status:', response.status);
console.log('Scope:', guildId ? `guild ${guildId} (instant)` : 'global (can take up to ~1 hour to appear)');
console.log(JSON.stringify(body, null, 2));
