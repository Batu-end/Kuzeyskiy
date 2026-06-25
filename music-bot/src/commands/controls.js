import { SlashCommandBuilder } from 'discord.js';
import { AudioPlayerStatus } from '@discordjs/voice';
import { getQueue, queues } from '../queue.js';

// --- SKIP ---
export const skip = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || !queue.current) {
      return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
    }
    queue.skipped = true; // so loop mode doesn't replay this track
    queue.player.stop();  // triggers Idle → playNext
    await interaction.reply(`⏭️ Skipped **${queue.current.title}**`);
  },
};

// --- STOP ---
export const stop = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop playback and clear the queue'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue) {
      return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
    }
    queue.tracks = [];
    queue.player.stop();
    if (queue.process) { try { queue.process.kill('SIGKILL'); } catch {} }
    queue.connection.destroy();
    queues.delete(interaction.guildId);
    await interaction.reply('⏹️ Stopped and cleared the queue.');
  },
};

// --- PAUSE ---
export const pause = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause playback'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.player.state.status !== AudioPlayerStatus.Playing) {
      return interaction.reply({ content: '❌ Nothing is playing.', ephemeral: true });
    }
    queue.player.pause();
    await interaction.reply('⏸️ Paused.');
  },
};

// --- RESUME ---
export const resume = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume playback'),

  async execute(interaction) {
    const queue = getQueue(interaction.guildId);
    if (!queue || queue.player.state.status !== AudioPlayerStatus.Paused) {
      return interaction.reply({ content: '❌ Nothing is paused.', ephemeral: true });
    }
    queue.player.unpause();
    await interaction.reply('▶️ Resumed.');
  },
};
