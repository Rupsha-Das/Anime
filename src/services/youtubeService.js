export const YOUTUBE_QUERY_SEEDS = [
  'anime opening songs',
  'anime ending songs',
  'best anime openings',
  'best anime endings',
  'Naruto opening',
  'One Piece opening',
  'Attack on Titan opening',
  'Demon Slayer opening',
  'Jujutsu Kaisen opening',
  'Your Name soundtrack',
  'A Silent Voice soundtrack',
  'Sword Art Online opening',
  'My Hero Academia opening',
  'Bleach opening',
  'Dragon Ball opening'
];

export async function searchAnimeSongs(query) {
  const response = await fetch(`/api/youtube/search?query=${encodeURIComponent(query)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Could not reach the music library.');
  }
  const payload = await response.json();
  return payload.tracks || [];
}

export async function getVideoDetails(videoIds) {
  if (!videoIds.length) return [];
  const response = await fetch(`/api/youtube/details?videoIds=${encodeURIComponent(videoIds.join(','))}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Could not load video details.');
  }
  const payload = await response.json();
  return payload.tracks || [];
}

export async function searchAnimePlaylist(query) {
  return searchAnimeSongs(query);
}
