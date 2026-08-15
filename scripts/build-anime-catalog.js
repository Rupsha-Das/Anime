const fs = require('fs');
const path = require('path');
const yts = require('yt-search');

const MAX_DURATION_SECONDS = 600;
const MIN_DURATION_SECONDS = 75;

const bannedTitlePatterns = [
  /\bmix\b/i,
  /\bplaylist\b/i,
  /\bcompilation\b/i,
  /\bmedley\b/i,
  /\b1\s*hour\b/i,
  /\b2\s*hours?\b/i,
  /\b3\s*hours?\b/i,
  /\bbest\s+of\b/i,
  /\bcollection\b/i,
  /\bradio\b/i,
  /\blofi\b/i,
  /\bfull\s+album\b/i,
  /\balbum\b/i,
  /\bextended\b/i,
  /\bremix\b/i,
  /\bamv\b/i,
  /\breaction\b/i,
  /\btop\s*10\b/i,
  /\ball\s+openings\b/i,
  /\ball\s+endings\b/i,
  /\bopening\s+collection\b/i,
  /\bending\s+collection\b/i,
  /\bsped\s*up\b/i,
  /\bslowed\b/i
];

const seeds = [
  { category: 'opening', anime: 'Naruto', song: 'Haruka Kanata', artistHint: 'Asian Kung-Fu Generation', query: 'Haruka Kanata Asian Kung-Fu Generation official' },
  { category: 'opening', anime: 'Naruto Shippuden', song: 'Sign', artistHint: 'FLOW', query: 'FLOW Sign official music video' },
  { category: 'opening', anime: 'Naruto Shippuden', song: 'Blue Bird', artistHint: 'Ikimono Gakari', query: 'Ikimono Gakari Blue Bird official' },
  { category: 'opening', anime: 'Naruto Shippuden', song: 'Silhouette', artistHint: 'KANA-BOON', query: 'KANA-BOON Silhouette official' },
  { category: 'opening', anime: 'Naruto Shippuden', song: 'Diver', artistHint: 'NICO Touches the Walls', query: 'NICO Touches the Walls Diver official' },
  { category: 'opening', anime: 'Naruto Shippuden', song: 'Lovers', artistHint: '7!!', query: '7!! Lovers official' },
  { category: 'opening', anime: 'One Piece', song: 'We Are!', artistHint: 'Hiroshi Kitadani', query: 'Hiroshi Kitadani We Are official' },
  { category: 'opening', anime: 'One Piece', song: 'We Go!', artistHint: 'Hiroshi Kitadani', query: 'Hiroshi Kitadani We Go official' },
  { category: 'opening', anime: 'One Piece', song: 'Hope', artistHint: 'Namie Amuro', query: 'Namie Amuro Hope One Piece official' },
  { category: 'opening', anime: 'One Piece', song: 'Paint', artistHint: 'I Dont Like Mondays', query: 'I Dont Like Mondays Paint official' },
  { category: 'opening', anime: 'One Piece', song: 'Over the Top', artistHint: 'Hiroshi Kitadani', query: 'Over the Top Hiroshi Kitadani official' },
  { category: 'opening', anime: 'Bleach', song: 'Asterisk', artistHint: 'ORANGE RANGE', query: 'ORANGE RANGE Asterisk official' },
  { category: 'opening', anime: 'Bleach', song: 'Rolling Star', artistHint: 'YUI', query: 'YUI Rolling Star official' },
  { category: 'opening', anime: 'Bleach', song: 'Ranbu no Melody', artistHint: 'SID', query: 'SID Ranbu no Melody official' },
  { category: 'opening', anime: 'Bleach', song: 'After Dark', artistHint: 'ASIAN KUNG-FU GENERATION', query: 'After Dark Asian Kung-Fu Generation official' },
  { category: 'opening', anime: 'Bleach', song: 'Velonica', artistHint: 'Aqua Timez', query: 'Aqua Timez Velonica official' },
  { category: 'opening', anime: 'Attack on Titan', song: 'Guren no Yumiya', artistHint: 'Linked Horizon', query: 'Linked Horizon Guren no Yumiya official' },
  { category: 'opening', anime: 'Attack on Titan', song: 'Shinzou wo Sasageyo', artistHint: 'Linked Horizon', query: 'Shinzou wo Sasageyo Linked Horizon official' },
  { category: 'opening', anime: 'Attack on Titan', song: 'Red Swan', artistHint: 'YOSHIKI feat. HYDE', query: 'Red Swan YOSHIKI HYDE official' },
  { category: 'opening', anime: 'Attack on Titan', song: 'Boku no Sensou', artistHint: 'Shinsei Kamattechan', query: 'Boku no Sensou Shinsei Kamattechan official' },
  { category: 'opening', anime: 'Attack on Titan', song: 'The Rumbling', artistHint: 'SiM', query: 'SiM The Rumbling official' },
  { category: 'opening', anime: 'Demon Slayer', song: 'Gurenge', artistHint: 'LiSA', query: 'LiSA Gurenge official music video' },
  { category: 'opening', anime: 'Demon Slayer', song: 'Zankyosanka', artistHint: 'Aimer', query: 'Aimer Zankyosanka official' },
  { category: 'opening', anime: 'Demon Slayer', song: 'Kizuna no Kiseki', artistHint: 'MAN WITH A MISSION x milet', query: 'Kizuna no Kiseki official' },
  { category: 'opening', anime: 'Jujutsu Kaisen', song: 'Kaikai Kitan', artistHint: 'Eve', query: 'Eve Kaikai Kitan official' },
  { category: 'opening', anime: 'Jujutsu Kaisen', song: 'VIVID VICE', artistHint: 'Who-ya Extended', query: 'Who-ya Extended VIVID VICE official' },
  { category: 'opening', anime: 'Jujutsu Kaisen', song: 'SPECIALZ', artistHint: 'King Gnu', query: 'King Gnu SPECIALZ official' },
  { category: 'opening', anime: 'My Hero Academia', song: 'Peace Sign', artistHint: 'Kenshi Yonezu', query: 'Kenshi Yonezu Peace Sign official' },
  { category: 'opening', anime: 'My Hero Academia', song: 'Odd Future', artistHint: 'UVERworld', query: 'UVERworld Odd Future official' },
  { category: 'opening', anime: 'My Hero Academia', song: 'The Day', artistHint: 'Porno Graffitti', query: 'Porno Graffitti The Day official' },
  { category: 'opening', anime: 'Sword Art Online', song: 'crossing field', artistHint: 'LiSA', query: 'LiSA crossing field official' },
  { category: 'opening', anime: 'Sword Art Online', song: 'IGNITE', artistHint: 'Eir Aoi', query: 'Eir Aoi IGNITE official' },
  { category: 'opening', anime: 'Tokyo Ghoul', song: 'unravel', artistHint: 'TK from Ling tosite sigure', query: 'TK unravel official' },
  { category: 'opening', anime: 'Death Note', song: 'The WORLD', artistHint: 'NIGHTMARE', query: 'NIGHTMARE The WORLD official' },
  { category: 'opening', anime: 'Death Note', song: 'What\'s up, people?!', artistHint: 'MAXIMUM THE HORMONE', query: 'MAXIMUM THE HORMONE whats up people official' },
  { category: 'opening', anime: 'Hunter x Hunter', song: 'Departure', artistHint: 'Masatoshi Ono', query: 'Masatoshi Ono Departure official' },
  { category: 'opening', anime: 'Fullmetal Alchemist Brotherhood', song: 'Again', artistHint: 'YUI', query: 'YUI Again official' },
  { category: 'opening', anime: 'Fullmetal Alchemist Brotherhood', song: 'Period', artistHint: 'Chemistry', query: 'Chemistry Period official' },
  { category: 'opening', anime: 'Haikyuu', song: 'Imagination', artistHint: 'SPYAIR', query: 'SPYAIR Imagination official' },
  { category: 'opening', anime: 'Haikyuu', song: 'Phoenix', artistHint: 'BURNOUT SYNDROMES', query: 'Burnout Syndromes Phoenix official' },
  { category: 'opening', anime: 'Chainsaw Man', song: 'KICK BACK', artistHint: 'Kenshi Yonezu', query: 'Kenshi Yonezu KICK BACK official' },
  { category: 'opening', anime: 'SPY x FAMILY', song: 'Mixed Nuts', artistHint: 'Official Hige Dandism', query: 'Official Hige Dandism Mixed Nuts official' },
  { category: 'opening', anime: 'SPY x FAMILY', song: 'Kura Kura', artistHint: 'Ado', query: 'Ado Kura Kura official' },
  { category: 'opening', anime: 'Solo Leveling', song: 'LEveL', artistHint: 'SawanoHiroyuki[nZk]:TOMORROW X TOGETHER', query: 'SawanoHiroyuki LEveL official' },
  { category: 'opening', anime: 'Dragon Ball Z', song: 'Cha-La Head-Cha-La', artistHint: 'Hironobu Kageyama', query: 'Cha-La Head-Cha-La Hironobu Kageyama official' },

  { category: 'ending', anime: 'Naruto', song: 'Wind', artistHint: 'Akeboshi', query: 'Akeboshi Wind official' },
  { category: 'ending', anime: 'Naruto Shippuden', song: 'For You', artistHint: 'AZU', query: 'AZU For You official' },
  { category: 'ending', anime: 'One Piece', song: 'Memories', artistHint: 'Maki Otsuki', query: 'Maki Otsuki Memories official' },
  { category: 'ending', anime: 'Bleach', song: 'Life is Like a Boat', artistHint: 'Rie fu', query: 'Rie fu Life is Like a Boat official' },
  { category: 'ending', anime: 'Attack on Titan', song: 'Akuma no Ko', artistHint: 'Ai Higuchi', query: 'Ai Higuchi Akuma no Ko official' },
  { category: 'ending', anime: 'Demon Slayer', song: 'from the edge', artistHint: 'FictionJunction feat. LiSA', query: 'from the edge LiSA official' },
  { category: 'ending', anime: 'Jujutsu Kaisen', song: 'LOST IN PARADISE', artistHint: 'ALI', query: 'ALI LOST IN PARADISE official' },
  { category: 'ending', anime: 'My Hero Academia', song: 'Kokai no Uta', artistHint: 'Sayuri', query: 'Sayuri Kokai no Uta official' },
  { category: 'ending', anime: 'Sword Art Online', song: 'Yume Sekai', artistHint: 'Haruka Tomatsu', query: 'Haruka Tomatsu Yume Sekai official' },
  { category: 'ending', anime: 'Tokyo Ghoul', song: 'Seijatachi', artistHint: 'People In The Box', query: 'People In The Box Seijatachi official' },
  { category: 'ending', anime: 'Death Note', song: 'Alumina', artistHint: 'Nightmare', query: 'Nightmare Alumina official' },
  { category: 'ending', anime: 'Hunter x Hunter', song: 'Just Awake', artistHint: 'Fear, and Loathing in Las Vegas', query: 'Just Awake Fear and Loathing official' },
  { category: 'ending', anime: 'Fullmetal Alchemist Brotherhood', song: 'Uso', artistHint: 'SID', query: 'SID Uso official' },
  { category: 'ending', anime: 'Haikyuu', song: 'Tenchi Gaeshi', artistHint: 'NICO Touches the Walls', query: 'Tenchi Gaeshi NICO Touches the Walls official' },

  { category: 'hype', anime: 'One Piece', song: 'OVER THE TOP', artistHint: 'Hiroshi Kitadani', query: 'OVER THE TOP Hiroshi Kitadani official' },
  { category: 'hype', anime: 'Attack on Titan', song: 'The Rumbling', artistHint: 'SiM', query: 'The Rumbling SiM official' },
  { category: 'hype', anime: 'Jujutsu Kaisen', song: 'SPECIALZ', artistHint: 'King Gnu', query: 'SPECIALZ King Gnu official' },
  { category: 'hype', anime: 'Demon Slayer', song: 'Kizuna no Kiseki', artistHint: 'MAN WITH A MISSION x milet', query: 'Kizuna no Kiseki official' },
  { category: 'hype', anime: 'My Hero Academia', song: 'Odd Future', artistHint: 'UVERworld', query: 'UVERworld Odd Future official' },
  { category: 'hype', anime: 'Blue Lock', song: 'Chaos ga Kiwamaru', artistHint: 'UNISON SQUARE GARDEN', query: 'UNISON SQUARE GARDEN Chaos ga Kiwamaru official' },
  { category: 'hype', anime: 'Fire Force', song: 'Inferno', artistHint: 'Mrs. GREEN APPLE', query: 'Mrs GREEN APPLE Inferno official' },
  { category: 'hype', anime: 'Dr. Stone', song: 'Good Morning World!', artistHint: 'Burnout Syndromes', query: 'Good Morning World Burnout Syndromes official' },

  { category: 'emotional', anime: 'Your Lie in April', song: 'Orange', artistHint: '7!!', query: '7!! Orange official' },
  { category: 'emotional', anime: 'Violet Evergarden', song: 'Sincerely', artistHint: 'TRUE', query: 'TRUE Sincerely official' },
  { category: 'emotional', anime: 'A Silent Voice', song: 'Koi wo Shita no wa', artistHint: 'aiko', query: 'aiko Koi wo Shita no wa official' },
  { category: 'emotional', anime: 'Anohana', song: 'secret base', artistHint: 'ZONE', query: 'ZONE secret base official' },
  { category: 'emotional', anime: 'Clannad After Story', song: 'Torch', artistHint: 'Lia', query: 'Lia Torch official' },
  { category: 'emotional', anime: 'Angel Beats', song: 'Ichiban no Takaramono', artistHint: 'LiSA', query: 'LiSA Ichiban no Takaramono official' },

  { category: 'romance', anime: 'Your Name', song: 'Zenzenzense', artistHint: 'RADWIMPS', query: 'RADWIMPS Zenzenzense official' },
  { category: 'romance', anime: 'Your Name', song: 'Nandemonaiya', artistHint: 'RADWIMPS', query: 'RADWIMPS Nandemonaiya official' },
  { category: 'romance', anime: 'Horimiya', song: 'Iro Kousui', artistHint: 'YOASOBI', query: 'Kami wa Saikoro wo Furanai Iro Kousui official' },
  { category: 'romance', anime: 'Kaguya-sama', song: 'Love Dramatic', artistHint: 'Masayuki Suzuki', query: 'Masayuki Suzuki Love Dramatic official' },
  { category: 'romance', anime: 'Fruits Basket', song: 'Again', artistHint: 'Beverly', query: 'Beverly Again Fruits Basket official' },

  { category: 'night', anime: 'Call of the Night', song: 'Yofukashi no Uta', artistHint: 'Creepy Nuts', query: 'Creepy Nuts Yofukashi no Uta official' },
  { category: 'night', anime: 'Monogatari Series', song: 'Renai Circulation', artistHint: 'Kana Hanazawa', query: 'Kana Hanazawa Renai Circulation official' },
  { category: 'night', anime: 'Cowboy Bebop', song: 'The Real Folk Blues', artistHint: 'Mai Yamane', query: 'Mai Yamane The Real Folk Blues official' },
  { category: 'night', anime: 'Samurai Champloo', song: 'Shiki no Uta', artistHint: 'MINMI', query: 'MINMI Shiki no Uta official' },
  { category: 'night', anime: 'Suzume', song: 'Suzume', artistHint: 'Toaka', query: 'Toaka Suzume official' },
];

function toSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function hasBadTitle(title) {
  return bannedTitlePatterns.some((pattern) => pattern.test(title));
}

function normalizeTrack(video, seed) {
  const title = (video.title || '').trim();
  const artist = (video.author && video.author.name ? video.author.name : 'Artist information unavailable').trim();

  return {
    id: `${seed.category}-${toSlug(seed.song)}-${video.videoId}`,
    title,
    artist,
    anime: seed.anime,
    category: seed.category,
    youtubeVideoId: video.videoId,
    youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
    thumbnail: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
    durationSeconds: Number(video.seconds),
    source: 'youtube'
  };
}

function isValidVideo(video) {
  if (!video || !video.videoId || !/^[A-Za-z0-9_-]{11}$/.test(video.videoId)) return false;
  if (!video.title || hasBadTitle(video.title)) return false;
  if (!video.thumbnail) return false;
  const seconds = Number(video.seconds);
  if (!Number.isFinite(seconds) || seconds < MIN_DURATION_SECONDS || seconds > MAX_DURATION_SECONDS) return false;
  return true;
}

async function pickTrack(seed, existingVideoIds) {
  const result = await yts(seed.query);
  const candidates = (result.videos || []).filter(isValidVideo);

  for (const video of candidates) {
    if (existingVideoIds.has(video.videoId)) continue;
    const normalizedTitle = video.title.toLowerCase();
    if (!normalizedTitle.includes(seed.song.toLowerCase().split(' ')[0])) continue;

    existingVideoIds.add(video.videoId);
    return normalizeTrack(video, seed);
  }

  return null;
}

async function main() {
  const tracks = [];
  const seenVideoIds = new Set();

  for (const seed of seeds) {
    try {
      const track = await pickTrack(seed, seenVideoIds);
      if (track) {
        tracks.push(track);
        console.log(`OK: ${track.title} (${track.durationSeconds}s) [${track.category}]`);
      } else {
        console.warn(`MISS: ${seed.query}`);
      }
    } catch (error) {
      console.warn(`ERR: ${seed.query} :: ${error.message}`);
    }
  }

  tracks.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.title.localeCompare(b.title);
  });

  const output = `const animeTracks = ${JSON.stringify(tracks, null, 2)};\n\nmodule.exports = { animeTracks };\n`;

  const outFile = path.join(__dirname, '..', 'src', 'data', 'animeTracks.js');
  fs.writeFileSync(outFile, output, 'utf8');

  console.log(`\nWrote ${tracks.length} tracks to ${outFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
