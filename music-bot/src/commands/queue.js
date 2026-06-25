import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getQueue } from '../queue.js';

export default {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current queue'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);

    if (!queue || (!queue.current && queue.tracks.length === 0)) {
      return interaction.reply({ content: '❌ The queue is empty.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🎵 Music Queue')
      .setColor(0x5865F2);

    if (queue.current) {
      embed.addFields({
        name: '▶️ Now Playing',
        value: `**${queue.current.title}** ${queue.current.duration ? `(${queue.current.duration})` : ''}\nRequested by ${queue.current.requestedBy}`,
      });
    }

    if (queue.tracks.length > 0) {
      const upNext = queue.tracks.slice(0, 10).map((t, i) =>
        `\`${i + 1}.\` **${t.title}** ${t.duration ? `(${t.duration})` : ''}`
      ).join('\n');

      embed.addFields({
        name: `📋 Up Next (${queue.tracks.length} tracks)`,
        value: upNext + (queue.tracks.length > 10 ? `\n_...and ${queue.tracks.length - 10} more_` : ''),
      });
    }

    const loopLabel = { off: 'off', track: 'track 🔂', queue: 'queue 🔁' }[queue.loop] || 'off';
    embed.setFooter({ text: `Volume: ${queue.volume}%  •  Loop: ${loopLabel}` });

    await interaction.reply({ embeds: [embed] });
  },
};
