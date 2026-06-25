import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue, setGuildVolume } from '../queue.js';

// --- VOLUME ---
export const volume = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume (1–100)')
    .addIntegerOption(opt =>
      opt.setName('level')
        .setDescription('Volume level (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    const level = interaction.options.getInteger('level');

    // Remember it per-guild so it persists across rejoins.
    setGuildVolume(interaction.guildId, level);

    // Apply to the live track / current queue if there is one.
    const queue = getQueue(interaction.guildId);
    if (queue) {
      queue.volume = level;
      if (queue.resource?.volume) queue.resource.volume.setVolume(level / 100);
    }

    await interaction.reply(`🔊 Volume set to **${level}%**`);
  },
};

// --- NOW PLAYING ---
export const nowplaying = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show the currently playing song'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);

    if (!queue || !queue.current) {
      return interaction.reply({ content: '❌ Nothing is playing right now.', ephemeral: true });
    }

    const track = queue.current;

    const embed = new EmbedBuilder()
      .setTitle('🎵 Now Playing')
      .setDescription(`**${track.title}**${track.duration ? ` — ${track.duration}` : ''}`)
      .addFields(
        { name: 'Requested by', value: track.requestedBy, inline: true },
        { name: 'Volume', value: `${queue.volume}%`, inline: true },
        { name: 'Queue', value: `${queue.tracks.length} tracks remaining`, inline: true },
      )
      .setColor(0x1DB954)
      .setURL(track.url);

    await interaction.reply({ embeds: [embed] });
  },
};
