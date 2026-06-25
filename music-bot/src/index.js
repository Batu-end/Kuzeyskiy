import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';
import { enqueue } from './queue.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,   // receive messages
    GatewayIntentBits.MessageContent,  // read their text (privileged — enable in portal)
  ],
});

// Spotify links pasted into chat — e.g. dragging a song straight out of Spotify.
// Matches track/playlist/album, with optional /intl-xx/ locale prefix.
const SPOTIFY_LINK = /https?:\/\/open\.spotify\.com\/(?:intl-[a-z]+\/)?(?:track|playlist|album)\/[A-Za-z0-9]+/i;

// Slash command collection
client.commands = new Collection();

// Load commands — supports default and named exports
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const mod = await import(pathToFileURL(join(__dirname, 'commands', file)).href);
  for (const [key, value] of Object.entries(mod)) {
    if (value && value.data && value.execute) {
      client.commands.set(value.data.name, value);
    }
  }
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in /${interaction.commandName}:`, err);
    const msg = { content: '❌ Something went wrong.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

// Auto-play when someone drops a Spotify link in chat — no /play needed.
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const match = message.content.match(SPOTIFY_LINK);
  if (!match) return;

  const voiceChannel = message.member?.voice?.channel;
  if (!voiceChannel) {
    message.reply('❌ Join a voice channel first, then paste the link.').catch(() => {});
    return;
  }

  const perms = voiceChannel.permissionsFor(message.client.user);
  if (!perms?.has('Connect') || !perms?.has('Speak')) {
    message.reply("❌ I don't have permission to join and speak in your voice channel.").catch(() => {});
    return;
  }

  try {
    await message.react('🎵').catch(() => {});
    const { tracks, started } = await enqueue({
      guild: message.guild,
      voiceChannel,
      textChannel: message.channel,
      query: match[0],
      requestedBy: message.author.toString(),
    });

    const reply =
      tracks.length === 1
        ? (started ? `▶️ Starting: **${tracks[0].title}**` : `✅ Added to queue: **${tracks[0].title}**`)
        : `✅ Added **${tracks.length} tracks** to the queue.`;
    message.reply(reply).catch(() => {});
  } catch (err) {
    console.error('Auto-play error:', err);
    message.reply("❌ Couldn't play that Spotify link.").catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
