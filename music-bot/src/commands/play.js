import { SlashCommandBuilder } from 'discord.js';
import { enqueue } from '../queue.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song or playlist')
    .addStringOption(opt =>
      opt.setName('query')
        .setDescription('YouTube URL, Spotify URL, or search terms')
        .setRequired(true)
    ),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You need to be in a voice channel!', ephemeral: true });
    }

    const perms = voiceChannel.permissionsFor(interaction.client.user);
    if (!perms.has('Connect') || !perms.has('Speak')) {
      return interaction.reply({ content: '❌ I need permission to join and speak in your voice channel.', ephemeral: true });
    }

    await interaction.deferReply();

    const query = interaction.options.getString('query');

    try {
      const { tracks, started } = await enqueue({
        guild: interaction.guild,
        voiceChannel,
        textChannel: interaction.channel,
        query,
        requestedBy: interaction.user.toString(),
      });

      if (tracks.length === 1) {
        await interaction.editReply(
          started
            ? `▶️ Starting: **${tracks[0].title}**`
            : `✅ Added to queue: **${tracks[0].title}** ${tracks[0].duration ? `(${tracks[0].duration})` : ''}`
        );
      } else {
        await interaction.editReply(
          `✅ Added **${tracks.length} tracks** to the queue.`
        );
      }
    } catch (err) {
      console.error('Play error:', err);
      await interaction.editReply(`❌ Couldn't find or play that. Try a different search or URL.\n\`${err.message}\``);
    }
  },
};
