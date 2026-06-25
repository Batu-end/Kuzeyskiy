import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../queue.js';

// --- LOOP ---
export const loop = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Repeat the current track or the whole queue')
    .addStringOption(opt =>
      opt.setName('mode')
        .setDescription('What to repeat')
        .setRequired(true)
        .addChoices(
          { name: 'off', value: 'off' },
          { name: 'track', value: 'track' },
          { name: 'queue', value: 'queue' },
        )
    ),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
    }

    const mode = interaction.options.getString('mode');
    queue.loop = mode;

    const label = { off: '➡️ Looping off', track: '🔂 Looping the current track', queue: '🔁 Looping the queue' };
    await interaction.reply(label[mode]);
  },
};

// --- SHUFFLE ---
export const shuffle = {
  data: new SlashCommandBuilder()
    .setName('shuffle')
    .setDescription('Shuffle the upcoming tracks'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.tracks.length < 2) {
      return interaction.reply({ content: '❌ Not enough tracks in the queue to shuffle.', ephemeral: true });
    }

    // Fisher–Yates shuffle of the upcoming tracks (current track is untouched).
    for (let i = queue.tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue.tracks[i], queue.tracks[j]] = [queue.tracks[j], queue.tracks[i]];
    }

    await interaction.reply(`🔀 Shuffled **${queue.tracks.length}** tracks.`);
  },
};
