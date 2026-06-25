import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const help = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all music commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🎵 Music Bot Commands')
      .setColor(0x5865F2)
      .setDescription('Accepts YouTube links, Spotify links, or plain search terms.')
      .addFields(
        { name: '/play `<query>`', value: 'Play a song or add it to the queue' },
        { name: '/skip', value: 'Skip the current song' },
        { name: '/pause', value: 'Pause playback' },
        { name: '/resume', value: 'Resume playback' },
        { name: '/stop', value: 'Stop, clear the queue, and leave' },
        { name: '/queue', value: 'Show the upcoming tracks' },
        { name: '/nowplaying', value: 'Show the current track' },
        { name: '/volume `<1-100>`', value: 'Set the playback volume (live)' },
        { name: '/loop `<off|track|queue>`', value: 'Repeat the current track or the whole queue' },
        { name: '/shuffle', value: 'Shuffle the upcoming tracks' },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
