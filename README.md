# 🎵 Private Discord Music Bot

A self-hosted Discord music bot with YouTube and Spotify support. Since it's private (just your servers), it won't get rate-limited or shut down like public bots.

---

## Prerequisites

Install these before anything else:

| Tool | Download |
|------|----------|
| **Node.js 18+** | https://nodejs.org |
| **FFmpeg** | See below |
| **yt-dlp** | https://github.com/yt-dlp/yt-dlp/releases |

### Installing FFmpeg

**Windows:**
1. Download from https://www.gyan.dev/ffmpeg/builds/ (get `ffmpeg-release-essentials.zip`)
2. Extract and add the `bin` folder to your system PATH
3. Test: `ffmpeg -version`

**Mac:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt install ffmpeg
```

### Installing yt-dlp

**Windows:** Download `yt-dlp.exe` from releases and put it somewhere in your PATH (e.g. `C:\Windows\System32`)

**Mac/Linux:**
```bash
sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
sudo chmod +x /usr/local/bin/yt-dlp
```

---

## Discord Bot Setup

1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it anything
3. Go to **Bot** tab → click **Add Bot**
4. Under **Token** → click **Reset Token** and copy it
5. Under **Privileged Gateway Intents**, enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent (optional, not needed)
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Use Slash Commands`
7. Copy the generated URL, open it, and invite the bot to your server

---

## Bot Configuration

```bash
# 1. Clone or download this folder, then:
npm install

# 2. Copy the example env file
cp .env.example .env

# 3. Fill in .env with your values:
#    DISCORD_TOKEN  — from the Bot tab in developer portal
#    CLIENT_ID      — from General Information → Application ID
#    GUILD_ID       — right-click your server → Copy Server ID
#                     (enable Developer Mode in Discord settings first)
```

---

## Running the Bot

```bash
# Step 1: Register slash commands (only need to do this once, or after adding new commands)
npm run deploy

# Step 2: Start the bot
npm start
```

To keep it running 24/7 on a server, use **PM2**:
```bash
npm install -g pm2
pm2 start npm --name "music-bot" -- start
pm2 save
pm2 startup   # Follow the printed instructions to auto-start on reboot
```

---

## Commands

| Command | Description |
|---------|-------------|
| `/play <query>` | Play a song — accepts YouTube URLs, Spotify links, or search terms |
| `/skip` | Skip the current song |
| `/pause` | Pause playback |
| `/resume` | Resume playback |
| `/stop` | Stop and clear the queue |
| `/queue` | Show the current queue |
| `/volume <1-100>` | Set volume (takes effect next track) |
| `/nowplaying` | Show info about the current track |

### Supported Input Formats
- YouTube video URLs
- YouTube playlist URLs
- Spotify track URLs (`open.spotify.com/track/...`)
- Spotify playlist URLs (`open.spotify.com/playlist/...`)
- Spotify album URLs (`open.spotify.com/album/...`)
- Plain search terms (e.g. `bohemian rhapsody queen`)

---

## Keeping yt-dlp Updated

YouTube occasionally changes things and yt-dlp needs updates. Run this monthly or when YouTube stops working:

```bash
# Mac/Linux
sudo yt-dlp -U

# Windows (run as admin)
yt-dlp -U
```

---

## Troubleshooting

**Bot joins but no audio plays:**
- Make sure FFmpeg is installed and in PATH (`ffmpeg -version` should work)
- Make sure yt-dlp is installed (`yt-dlp --version`)

**"Unknown interaction" or commands don't show up:**
- Re-run `npm run deploy` — it can take up to 1 hour for commands to appear globally, but guild commands (what this uses) appear instantly

**Spotify tracks not found:**
- yt-dlp resolves Spotify by searching YouTube. Very new or obscure tracks may not match perfectly. Try searching by name instead.

**Bot keeps disconnecting:**
- Check your network/VPS stability
- Use PM2 to auto-restart: `pm2 start npm -- start`
