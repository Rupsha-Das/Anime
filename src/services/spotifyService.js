export function getSpotifyTrackUrl(track) {
  return track?.spotifyUrl || null;
}

export function getSpotifyOpenUrl(track) {
  return getSpotifyTrackUrl(track) || 'https://open.spotify.com';
}
