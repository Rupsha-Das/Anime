const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const AUDIO_DIR = path.join(__dirname, 'public', 'audio');
const PLAYLIST_FILE = path.join(AUDIO_DIR, 'playlist.json');

const FALLBACK_SONGS = {
  opening: {
    title: 'The Opening Theme',
    tag: 'OP THEME',
    accent: '#ff7ec8',
    description: 'Sakura petals, sunlight, and the moment everything begins. Press play on your own intro.',
    songs: [
      { title: 'Suzume', artist: 'ANIMESCAPE', file: 'sakura-opening.wav', duration: '0:34' },
      { title: 'Festival Fireworks', artist: 'ANIMESCAPE', file: 'festival-fireworks.wav', duration: '0:24' },
    ],
  },
  ballad: {
    title: 'The Ballad of Two',
    tag: 'BALLAD ARC',
    accent: '#8be9fd',
    description: 'Soft focus, warm light, and a little bit of forever. The slow scenes of your story.',
    songs: [
      { title: 'Ballad of Two', artist: 'ANIMESCAPE', file: 'ballad-of-two.wav', duration: '0:31' },
    ],
  },
  night: {
    title: 'Midnight Drive',
    tag: 'LATE NIGHT ARC',
    accent: '#bd93f9',
    description: 'Neon reflections on wet asphalt. For the thoughts that only show up after midnight.',
    songs: [
      { title: 'Midnight Drive', artist: 'ANIMESCAPE', file: 'midnight-drive.wav', duration: '0:35' },
    ],
  },
  training: {
    title: 'Level Up',
    tag: 'TRAINING ARC',
    accent: '#ffb86c',
    description: 'Turn the volume up. You have somewhere to be, and the world is not ready for you.',
    songs: [
      { title: 'Level Up', artist: 'ANIMESCAPE', file: 'level-up.wav', duration: '0:29' },
    ],
  },
  villain: {
    title: "Villain's Anthem",
    tag: 'VILLAIN ERA',
    accent: '#ff5555',
    description: 'For the chapter where you stop explaining yourself. The theme plays when you walk in.',
    songs: [
      { title: "Villain's Anthem", artist: 'ANIMESCAPE', file: 'villain-anthem.wav', duration: '0:21' },
    ],
  },
  festival: {
    title: 'Festival Fireworks',
    tag: 'FESTIVAL ARC',
    accent: '#f1fa8c',
    description: 'Lanterns, yukatas, and summer nights. The montage scene nobody can forget.',
    songs: [
      { title: 'Festival Fireworks', artist: 'ANIMESCAPE', file: 'festival-fireworks.wav', duration: '0:24' },
    ],
  },
};

function loadSongs() {
  try {
    if (fs.existsSync(PLAYLIST_FILE)) {
      const raw = fs.readFileSync(PLAYLIST_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (error) {
    console.warn('Could not load playlist.json, using built-in fallback:', error.message);
  }
  return FALLBACK_SONGS;
}

const WALLPAPERS = [
  { id: 1, name: 'Sakura Sunrise', ja: '桜の朝', mood: 'Hopeful', scene: 'sakura' },
  { id: 2, name: 'Neon Tokyo Night', ja: '夜の東京', mood: 'Electric', scene: 'tokyo' },
  { id: 3, name: 'Starlit Shore', ja: '星の浜辺', mood: 'Dreamy', scene: 'beach' },
  { id: 4, name: 'Autumn Promise', ja: '秋の約束', mood: 'Warm', scene: 'autumn' },
  { id: 5, name: 'First Snow', ja: '初雪', mood: 'Quiet', scene: 'winter' },
  { id: 6, name: 'Dawn Over the Peaks', ja: '暁の峰', mood: 'Bold', scene: 'peaks' },
];

const QUOTES = [
  '“Your life deserves an opening theme.”',
  '“Every protagonist starts as a background character.”',
  '“The credits only roll when you stop believing.”',
  '“Plot armor is just confidence in disguise.”',
  '“Some seasons are just the setup for the next one.”',
  '“You are the main character. Act like it.”',
  '“No fillers. Every frame of your life matters.”',
];

let listeners = 4120 + Math.floor(Math.random() * 900);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/songs', (req, res) => {
  res.json(loadSongs());
});

app.get('/api/playlists', (req, res) => {
  res.json(
    Object.entries(loadSongs()).map(([id, p]) => ({
      id,
      title: p.title,
      tag: p.tag,
      accent: p.accent,
      description: p.description,
      count: p.songs.length,
    }))
  );
});

app.get('/api/wallpapers', (req, res) => {
  res.json(WALLPAPERS);
});

app.get('/api/quotes', (req, res) => {
  res.json(QUOTES);
});

app.get('/api/listeners', (req, res) => {
  listeners += Math.floor(Math.random() * 5) - 2;
  if (listeners < 3500) listeners = 4200;
  res.json({ count: listeners });
});

app.get('/api/audio/:file', (req, res) => {
  const file = path.join(AUDIO_DIR, path.basename(req.params.file));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  const stat = fs.statSync(file);
  const range = req.headers.range;
  const fileSize = stat.size;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunk = Math.min(end, fileSize - 1);
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${chunk}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunk - start + 1,
      'Content-Type': 'audio/wav',
    });
    fs.createReadStream(file, { start, end: chunk }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'audio/wav',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(file).pipe(res);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function startServer(port, attempts = 0) {
  const p = Number(port) || 3000;
  const server = app.listen(p, () => {
    console.log(`ANIMESCAPE running at http://localhost:${p}`);
    console.log(`  Playlists API:  http://localhost:${p}/api/playlists`);
    console.log(`  Audio sample:   http://localhost:${p}/api/audio/sakura-opening.wav`);
    console.log(`  Wallpapers API: http://localhost:${p}/api/wallpapers`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE' && attempts < 10) {
      const next = p + 1;
      console.warn(`Port ${p} in use, trying ${next}...`);
      setTimeout(() => startServer(next, attempts + 1), 200);
    } else {
      console.error(err);
      process.exit(1);
    }
  });

  return server;
}

startServer(PORT);
