# 🎵 Music Bot

Private self-hosted Discord music bot. YouTube + Spotify, search, queue, loop, shuffle.

## Requirements

- **Node 18+**
- **ffmpeg** and **yt-dlp** on PATH:
  ```bash
  brew install ffmpeg yt-dlp      # macOS
  # Linux: sudo apt install ffmpeg && pipx install yt-dlp
  ```

## Discord setup

1. [Developer Portal](https://discord.com/developers/applications) → **New Application** → **Bot**.
2. Copy: **token** (Bot tab), **Application ID** (General Info), and your **Server ID** (right-click server → Copy ID, needs Developer Mode).
3. Bot tab → **Privileged Gateway Intents** → enable **Message Content Intent** (required for pasting Spotify links).
4. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands`, perms `Connect` `Speak` `Send Messages` → open URL → invite.

## Config

```bash
npm install
cp .env.example .env     # then fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID
```

## Run

```bash
npm run deploy           # register slash commands (once, or after adding commands)
npm start
```

Keep alive 24/7 with PM2: `pm2 start npm --name music-bot -- start && pm2 save`.

## Commands

`/play <url|search>` · `/skip` · `/pause` · `/resume` · `/stop` · `/queue` · `/nowplaying` · `/volume <1-100>` · `/loop <off|track|queue>` · `/shuffle` · `/help`

Or just **paste/drag a Spotify link** (track, playlist, album) into chat and it auto-plays.

## Notes

- When YouTube playback breaks, update yt-dlp: `yt-dlp -U` (or `brew upgrade yt-dlp`).
- Spotify works with no API key (resolved via YouTube). The `SPOTIFY_*` env vars are optional/unused.
