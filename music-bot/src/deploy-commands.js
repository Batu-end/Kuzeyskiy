// Run this once to register your slash commands:
//   node src/deploy-commands.js

import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];

const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const mod = await import(pathToFileURL(join(__dirname, 'commands', file)).href);
  for (const value of Object.values(mod)) {
    if (value && value.data) {
      commands.push(value.data.toJSON());
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

console.log(`Registering ${commands.length} slash commands...`);

const data = await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands },
);

console.log(`✅ Registered ${data.length} commands to guild ${process.env.GUILD_ID}`);
