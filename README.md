# ANIMESCAPE

ANIMESCAPE is an anime-inspired music player and radio experience. It serves a curated local catalog of anime openings, endings, hype, emotional, romance, and night tracks, with optional live YouTube search.

## Features

- Browser-based music player with play, pause, next, previous, shuffle, repeat, seek, and volume controls
- Searchable playlist drawer
- Seeded local anime track catalog that works without API keys
- Optional YouTube Data API search
- Anime-inspired visual effects: snow, rain, sakura, and sparkles
- Wallpaper, quote, listener-count, songs, and playlist JSON endpoints

## Requirements

- Node.js 18 or newer
- npm

## Getting started

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in a browser. The server automatically tries the next port if the configured port is already in use.

For development, use the same server with:

```bash
npm run dev
```

## Configuration

Copy `.env.example` to `.env` if you want live YouTube search:

```env
VITE_YOUTUBE_API_KEY=your_youtube_data_api_key
PORT=3000
```

The local catalog is available without a YouTube key. `VITE_SPOTIFY_CLIENT_ID` and `VITE_SPOTIFY_REDIRECT_URI` are reserved for future Spotify integration and are not required by the current server.

## API endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/config` | Reports catalog and YouTube configuration status |
| `GET /api/songs` | Returns tracks grouped by playlist category |
| `GET /api/playlists` | Returns playlist metadata and track counts |
| `GET /api/youtube/search?query=...` | Searches YouTube when an API key is configured |
| `GET /api/wallpapers` | Returns available wallpaper scenes |
| `GET /api/quotes` | Returns rotating anime-inspired quotes |
| `GET /api/listeners` | Returns a simulated listener count |

## Generate local audio

The optional `songs` script generates WAV assets in `public/audio`:

```bash
npm run songs
```

## Project structure

```text
public/              Frontend HTML, CSS, JavaScript, and audio assets
src/data/             Anime catalog data
src/services/         YouTube and Spotify service helpers
scripts/              Catalog/build utilities
server.js             Express server and API routes
generate-audio.js     Procedural audio asset generator
```

## License and content

This project is a personal/demo application. Anime names, artwork, music, and linked videos belong to their respective owners. Add only content you have permission to distribute or link to.
