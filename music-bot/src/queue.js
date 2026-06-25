import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  joinVoiceChannel,
} from '@discordjs/voice';
import ytDlp from 'yt-dlp-exec';
import { spawn } from 'child_process';
import { fetch } from 'undici';
import spotifyUrlInfo from 'spotify-url-info';

const spotify = spotifyUrlInfo(fetch);

console.log('[BOOT] diagnostics build loaded from:', import.meta.url);

// Per-guild music queue state. Lives here (not index.js) so command modules can
// import it without creating a circular dependency on the entry point.
export const queues = new Map();

// Per-guild volume preference, kept OUTSIDE the queue so it survives the bot
// leaving and rejoining (the queue is destroyed on /stop and idle auto-leave).
const guildVolumes = new Map();

export function setGuildVolume(guildId, level) {
  guildVolumes.set(guildId, level);
}

export function getQueue(guildId) {
  return queues.get(guildId);
}

// Shared "add to queue and start if idle" logic used by both the /play command
// and the auto-detect-link message handler. Joins the voice channel if needed.
export async function enqueue({ guild, voiceChannel, textChannel, query, requestedBy }) {
  const tracks = await resolveTrack(query, requestedBy);

  let queue = getQueue(guild.id);
  if (!queue) {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });
    queue = createQueue(guild.id, connection, textChannel);
  }

  queue.tracks.push(...tracks);
  const started = !queue.playing;
  if (started) playNext(guild.id);

  return { tracks, started };
}

export function createQueue(guildId, connection, textChannel) {
  const player = createAudioPlayer();

  const queue = {
    connection,
    player,
    textChannel,
    tracks: [],        // Array of { title, url, duration, requestedBy }
    current: null,
    resource: null,    // active AudioResource (for live volume)
    process: null,     // active ffmpeg child process (so we can kill it cleanly)
    volume: guildVolumes.get(guildId) ?? 80, // remembered across rejoins
    loop: 'off',       // 'off' | 'track' | 'queue'
    skipped: false,    // set by /skip so loop doesn't replay the skipped track
    playing: false,
  };

  connection.subscribe(player);

  // --- TEMPORARY DIAGNOSTICS: log every voice state change ---
  player.on('stateChange', (o, n) => {
    console.log(`🎚️  player: ${o.status} → ${n.status}  (${new Date().toISOString().slice(11, 19)})`);
  });
  connection.on('stateChange', (o, n) => {
    console.log(`🔌  connection: ${o.status} → ${n.status}  (${new Date().toISOString().slice(11, 19)})`);
  });
  // --- end diagnostics ---

  player.on(AudioPlayerStatus.Idle, () => {
    const finished = queue.current;
    queue.current = null;
    queue.resource = null;
    if (queue.process) { try { queue.process.kill('SIGKILL'); } catch {} queue.process = null; }

    // Re-queue the finished track per loop mode (unless it was explicitly skipped).
    if (finished && !queue.skipped) {
      if (queue.loop === 'track') queue.tracks.unshift(finished);
      else if (queue.loop === 'queue') queue.tracks.push(finished);
    }
    queue.skipped = false;

    if (queue.tracks.length > 0) {
      playNext(guildId);
    } else {
      queue.playing = false;
      setTimeout(() => {
        const q = queues.get(guildId);
        if (q && !q.playing) {
          q.connection.destroy();
          queues.delete(guildId);
        }
      }, 60_000); // Leave after 60s of silence
    }
  });

  player.on('error', (err) => {
    console.error('Player error:', err.message);
    queue.current = null;
    queue.resource = null;
    if (queue.tracks.length > 0) playNext(guildId);
  });

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      connection.destroy();
      queues.delete(guildId);
    }
  });

  queues.set(guildId, queue);
  return queue;
}

export async function playNext(guildId) {
  const queue = queues.get(guildId);
  if (!queue || queue.tracks.length === 0) return;

  const track = queue.tracks.shift();
  queue.current = track;
  queue.playing = true;

  try {
    const { stream, process } = await getAudioStream(track);
    queue.process = process;

    const resource = createAudioResource(stream, {
      inputType: StreamType.Raw,   // 48kHz stereo PCM from ffmpeg
      inlineVolume: true,          // enables live /volume
    });
    resource.volume.setVolume(queue.volume / 100);
    queue.resource = resource;

    queue.player.play(resource);

    queue.textChannel.send(
      `🎵 Now playing: **${track.title}** ${track.duration ? `(${track.duration})` : ''}\n` +
      `Requested by: ${track.requestedBy}`
    ).catch(() => {});
  } catch (err) {
    console.error('Playback error:', err.message);
    queue.textChannel.send(`❌ Failed to play **${track.title}**, skipping...`).catch(() => {});
    if (queue.process) { try { queue.process.kill('SIGKILL'); } catch {} queue.process = null; }
    queue.current = null;
    queue.resource = null;
    if (queue.tracks.length > 0) playNext(guildId);
  }
}

// Download the whole compressed audio file FIRST, at full speed, then transcode
// the buffered bytes to PCM for Discord. This decouples the download from
// realtime playback: if we streamed instead, playback backpressure would pause
// yt-dlp's download, YouTube would throttle/close the idle connection after
// ~60s, and (since a pipe can't resume) the track would cut out. Buffering the
// file up front means nothing ever throttles the download.
// Accepts a video URL or a `ytsearch1:...` target.
export async function getAudioStream(track) {
  const audio = await downloadAudio(track.url); // Buffer of compressed audio

  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error',
    '-i', 'pipe:0',
    '-vn',
    '-f', 's16le',   // raw 48kHz stereo PCM for Discord
    '-ar', '48000',
    '-ac', '2',
    'pipe:1',
  ], { stdio: ['pipe', 'pipe', 'ignore'] });

  ffmpeg.on('error', () => {});
  ffmpeg.stdin.on('error', () => {}); // EPIPE if killed early
  ffmpeg.stdin.end(audio);            // hand ffmpeg the full file; it paces itself

  return { stream: ffmpeg.stdout, process: ffmpeg };
}

// Run yt-dlp to completion, collecting the audio into memory. Draining stdout as
// fast as it arrives means yt-dlp never stalls, so YouTube never throttles it.
function downloadAudio(url) {
  return new Promise((resolve, reject) => {
    const ytdlp = spawn('yt-dlp', [
      url,
      '-f', 'bestaudio/best',
      '-o', '-',
      '--no-playlist',
      '--quiet',
      '--no-warnings',
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    const chunks = [];
    let err = '';
    ytdlp.stdout.on('data', (c) => chunks.push(c));
    ytdlp.stderr.on('data', (d) => { err += d; });
    ytdlp.on('error', reject);
    ytdlp.on('close', (code) => {
      if (code === 0 && chunks.length) resolve(Buffer.concat(chunks));
      else reject(new Error(`yt-dlp failed: ${err.slice(0, 200) || `exit ${code}`}`));
    });
  });
}

export async function resolveTrack(query, requestedBy) {
  // --- Spotify: resolve real track names, then play them via YouTube search ---
  if (query.includes('spotify.com')) {
    const data = await spotify.getTracks(query);
    const items = (Array.isArray(data) ? data : [data]).filter(Boolean).slice(0, 50);
    if (items.length === 0) throw new Error('No tracks found on that Spotify link.');

    return items.map((t) => {
      const artist = t.artists?.[0]?.name || t.subtitle || '';
      const q = `${artist} ${t.name}`.trim();
      return {
        title: artist ? `${artist} - ${t.name}` : t.name,
        url: `ytsearch1:${q}`, // yt-dlp resolves this to a YouTube result at play time
        duration: t.duration ? formatDuration(t.duration / 1000) : null,
        requestedBy,
      };
    });
  }

  const isUrl = query.startsWith('http://') || query.startsWith('https://');

  // --- YouTube playlist ---
  if (isUrl && query.includes('list=')) {
    const info = await ytDlp(query, {
      dumpSingleJson: true,
      flatPlaylist: true,
      noWarnings: true,
    });
    if (info.entries) {
      return info.entries.slice(0, 50).map((entry) => ({
        title: entry.title,
        url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
        duration: formatDuration(entry.duration),
        requestedBy,
      }));
    }
  }

  // --- Single video URL or plain search term ---
  const target = isUrl ? query : `ytsearch1:${query}`;
  const info = await ytDlp(target, {
    dumpSingleJson: true,
    noPlaylist: true,
    noWarnings: true,
  });

  const entry = info.entries ? info.entries[0] : info;
  if (!entry) throw new Error('No results found.');

  return [{
    title: entry.title,
    url: entry.webpage_url || entry.url || target,
    duration: formatDuration(entry.duration),
    requestedBy,
  }];
}

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}
