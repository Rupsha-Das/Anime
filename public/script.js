(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const weatherButtons = $$('.weather-btn');
  const playlistPanel = $('#playlistPanel');
  const trackList = $('#trackList');
  const trackSearch = $('#trackSearch');
  const searchBtn = $('#searchBtn');
  const playlistStatus = $('#playlistStatus');
  const playBtn = $('#playBtn');
  const npTitle = $('#npTitle');
  const npArtist = $('#npArtist');
  const npFill = $('#npFill');
  const npCur = $('#npCur');
  const npDur = $('#npDur');
  const listenerCount = $('#listenerCount');
  const playlistCloseBtn = $('[data-action="playlist-close"]');
  const playerThumb = $('.player-thumb');
  const openYoutubeBtn = $('#openYoutubeBtn');
  const volumeBtn = $('#volumeBtn');
  const clockTime = $('#clockTime');
  const profileButton = $('[aria-label="Profile"]');

  const state = {
    playlists: {},
    songCatalog: [],
    currentPlaylist: [],
    currentIndex: 0,
    currentTrack: null,
    currentKey: null,
    currentMode: 'snow',
    playlistOpen: false,
    isPlaying: false,
    volume: 100,
    muted: false,
    provider: 'youtube',
    searchCache: new Map(),
    lastSearch: '',
    playerReady: false,
    ytPlayer: null,
    pendingPlayerAction: null,
    progressTimer: null,
    currentVideoId: null,
    playlistLoading: false,
    clientId: sessionStorage.getItem('animescape-client-id') || `listener-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`,
  };
  sessionStorage.setItem('animescape-client-id', state.clientId);

  const FX = { snow: [], rain: [], sakura: [], sparkles: [] };
  const canvas = document.createElement('canvas');
  canvas.className = 'weather-fx';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  let DPR = 1;

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  function spawn(type) {
    if (type === 'snow') {
      FX.snow.push({ x: Math.random() * W, y: -10, r: 1 + Math.random() * 2.5, s: .5 + Math.random() * .9, drift: .2 + Math.random() * .8, ph: Math.random() * Math.PI * 2 });
    }
    if (type === 'rain') {
      FX.rain.push({ x: Math.random() * W, y: -10, l: 12 + Math.random() * 18, s: 7 + Math.random() * 8 });
    }
    if (type === 'sakura') {
      FX.sakura.push({ x: Math.random() * W, y: -20, r: 3 + Math.random() * 3, s: .6 + Math.random() * .8, rot: Math.random() * Math.PI * 2, spin: (Math.random() - .5) * .1, ph: Math.random() * Math.PI * 2 });
    }
    if (type === 'sparkles') {
      FX.sparkles.push({ x: Math.random() * W, y: Math.random() * H, r: .5 + Math.random() * 1.4, ph: Math.random() * Math.PI * 2 });
    }
  }

  const COUNT = { snow: 80, rain: 120, sakura: 48, sparkles: 72 };

  function tickFx() {
    ctx.clearRect(0, 0, W, H);
    if (state.currentMode === 'clear') {
      requestAnimationFrame(tickFx);
      return;
    }

    const list = FX[state.currentMode];
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (state.currentMode === 'snow') {
        p.ph += .02;
        p.y += p.s;
        p.x += Math.sin(p.ph) * p.drift;
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (state.currentMode === 'rain') {
        p.y += p.s;
        p.x += 1.1;
        ctx.strokeStyle = 'rgba(130, 190, 255, .5)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y - p.l);
        ctx.stroke();
      } else if (state.currentMode === 'sakura') {
        p.ph += .02;
        p.rot += p.spin;
        p.y += p.s;
        p.x += Math.sin(p.ph) * .7;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = 'rgba(255, 174, 214, .92)';
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (state.currentMode === 'sparkles') {
        p.ph += .03;
        const alpha = (Math.sin(p.ph) + 1) / 2;
        ctx.fillStyle = `rgba(255, 221, 170, ${.2 + alpha * .55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.y > H + 30 || p.x > W + 30) {
        list.splice(i, 1);
        spawn(state.currentMode);
      }
    }

    while (list.length < COUNT[state.currentMode]) spawn(state.currentMode);
    requestAnimationFrame(tickFx);
  }

  function setWeather(mode) {
    state.currentMode = mode;
    weatherButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.fx === mode));
  }

  function setPlaylistOpen(open) {
    state.playlistOpen = open;
    playlistPanel.classList.toggle('open', open);
    playlistPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  function togglePlaylist() {
    setPlaylistOpen(!state.playlistOpen);
  }

  async function loadListeners() {
    try {
      const response = await fetch(`/api/listeners?clientId=${encodeURIComponent(state.clientId)}`);
      const data = await response.json();
      listenerCount.textContent = Number(data.count || 0).toLocaleString();
    } catch {
      // Ignore listener errors silently.
    }
  }

  function updateClock() {
    if (!clockTime) return;
    clockTime.textContent = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
  }

  function formatTime(value) {
    const total = Number(value) || 0;
    const minutes = Math.floor(total / 60);
    const seconds = Math.floor(total % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function normalizeTrack(raw, fallbackKey = '') {
    if (!raw || !raw.title) return null;
    const youtubeVideoId = raw.youtubeVideoId || '';
    const duration = Number(raw.duration);
    return {
      id: raw.id || `track-${raw.youtubeVideoId || Math.random().toString(36).slice(2)}`,
      title: raw.title,
      artist: raw.artist || raw.channelTitle || 'Unknown artist',
      album: raw.album || raw.anime || 'Anime track',
      thumbnail: raw.thumbnail || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=600&q=80',
      duration: Number.isFinite(duration) ? duration : 0,
      source: raw.source || 'youtube',
      youtubeVideoId: raw.youtubeVideoId || youtubeVideoId,
      youtubePlaylistId: raw.youtubePlaylistId || '',
      youtubeUrl: raw.youtubeUrl || (youtubeVideoId ? `https://www.youtube.com/watch?v=${youtubeVideoId}` : ''),
      anime: raw.anime || fallbackKey || 'Anime track',
      playlistKey: raw.playlistKey || fallbackKey,
    };
  }

  function flattenTracks(playlists) {
    const combined = [];
    Object.entries(playlists || {}).forEach(([playlistKey, playlist]) => {
      (playlist?.songs || []).forEach(song => {
        const normalized = normalizeTrack({ ...song, playlistKey }, playlistKey);
        if (normalized) combined.push(normalized);
      });
    });
    return combined;
  }

  function setStatus(message, type = 'info', shouldRetry = false) {
    if (!playlistStatus) return;
    const buttonMarkup = shouldRetry ? '<button class="status-retry" data-retry="true">Try again</button>' : '';
    playlistStatus.innerHTML = `${message}${buttonMarkup}`;
    playlistStatus.dataset.type = type;
  }

  function showToast(message) {
    let toast = $('#actionToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'actionToast';
      toast.className = 'action-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove('visible'), 2200);
  }

  function renderSkeleton(count = 3) {
    trackList.innerHTML = Array.from({ length: count }, (_, index) => `
      <article class="track-item" aria-label="Loading track ${index + 1}">
        <div class="track-num">${String(index + 1).padStart(2, '0')}</div>
        <div class="track-thumb skeleton" style="background:rgba(255,255,255,.08);"></div>
        <div class="track-info">
          <strong style="background:rgba(255,255,255,.08);border-radius:999px;height:12px;display:block;width:70%;"></strong>
          <span style="background:rgba(255,255,255,.08);border-radius:999px;height:10px;display:block;width:50%;margin-top:4px;"></span>
        </div>
        <div class="track-actions">
          <span class="track-dur">--:--</span>
          <button class="track-play" aria-label="Loading">▶</button>
        </div>
      </article>
    `).join('');
  }

  function updatePlayerMeta(track) {
    if (!track) return;
    npTitle.textContent = track.title || 'Select a track';
    npArtist.textContent = track.artist || 'Anime music';
    if (playerThumb) {
      playerThumb.style.backgroundImage = `url(${track.thumbnail})`;
      playerThumb.style.backgroundSize = 'cover';
      playerThumb.style.backgroundPosition = 'center';
    }
    if (track.duration) {
      npDur.textContent = formatTime(track.duration);
    }
    npCur.textContent = '0:00';
    npFill.style.width = '0%';
  }

  function setActiveRow(row) {
    $$('.track-item', trackList).forEach(item => item.classList.remove('active'));
    if (row) row.classList.add('active');
  }

  function renderTrackList(tracks) {
    if (!tracks.length) {
      trackList.innerHTML = '<div class="track-item"><div class="track-info"><strong>No real songs found</strong><span>Try a different anime search.</span></div></div>';
      return;
    }

    trackList.innerHTML = tracks.map((track, index) => `
      <article class="track-item ${track.id === state.currentTrack?.id ? 'active' : ''}" data-index="${index}" data-track-id="${track.id}">
        <div class="track-num">${String(index + 1).padStart(2, '0')}</div>
        <img class="track-thumb" src="${track.thumbnail}" alt="${track.title}" />
        <div class="track-info">
          <strong>${track.title}</strong>
          <span>${track.artist}</span>
        </div>
        <div class="track-actions">
          <span class="track-dur">${track.duration ? formatTime(track.duration) : '--:--'}</span>
          <span class="equalizer" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
          </span>
          <button class="track-play" aria-label="Play ${track.title}">▶</button>
        </div>
      </article>
    `).join('');

    $$('.track-item', trackList).forEach(item => {
      const trackId = item.dataset.trackId;
      const track = tracks.find(song => song.id === trackId) || state.currentTrack;
      const play = () => playTrackFromList(track, Number(item.dataset.index), tracks);
      item.addEventListener('click', play);
      const button = $('.track-play', item);
      if (button) {
        button.addEventListener('click', e => {
          e.stopPropagation();
          play();
        });
      }
    });
  }

  async function expandYouTubePlaylist(track) {
    if (!state.ytPlayer || !track?.youtubePlaylistId || state.playlistLoading) return;
    state.playlistLoading = true;
    setStatus('Loading the complete YouTube playlist…', 'info');

    let ids = [];
    for (let attempt = 0; attempt < 20 && !ids.length; attempt += 1) {
      ids = typeof state.ytPlayer.getPlaylist === 'function' ? (state.ytPlayer.getPlaylist() || []) : [];
      if (!ids.length) await new Promise(resolve => setTimeout(resolve, 250));
    }

    if (!ids.length) {
      state.playlistLoading = false;
      setStatus('YouTube did not return the playlist items. Open the playlist on YouTube Music to check access.', 'error');
      return;
    }

    const metadata = await Promise.all(ids.map(async (videoId, index) => {
      try {
        const response = await fetch(`/api/youtube/oembed?videoId=${encodeURIComponent(videoId)}`);
        if (response.ok) {
          const data = await response.json();
          return { id: `youtube-${videoId}`, title: data.title, artist: data.artist, thumbnail: data.thumbnail, youtubeVideoId: videoId, youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`, duration: 0, source: 'youtube-playlist', anime: 'YouTube Music', playlistKey: 'playlist', playlistIndex: index };
        }
      } catch {
        // Keep the video in the list even if metadata is unavailable.
      }
      return { id: `youtube-${videoId}`, title: `Playlist track ${String(index + 1).padStart(2, '0')}`, artist: 'YouTube Music', thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`, youtubeVideoId: videoId, youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`, duration: 0, source: 'youtube-playlist', anime: 'YouTube Music', playlistKey: 'playlist', playlistIndex: index };
    }));

    state.songCatalog = metadata;
    state.currentPlaylist = metadata;
    renderTrackList(metadata);
    state.playlistLoading = false;
    setCurrentTrack(metadata[0], 0, metadata);
    setStatus(`Loaded all ${metadata.length} songs from your YouTube Music playlist.`, 'info');
  }

  function setCurrentTrack(track, index, playlist) {
    state.currentTrack = track;
    state.currentIndex = index;
    if (playlist) state.currentPlaylist = playlist;
    updatePlayerMeta(track);
    const row = $(`.track-item[data-track-id="${track.id}"]`, trackList);
    setActiveRow(row);
  }

  function ensureYouTubeApi(callback) {
    if (window.YT && window.YT.Player) {
      callback();
      return;
    }

    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'youtube-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const ready = () => {
      if (window.YT && window.YT.Player) callback();
    };
    window.onYouTubeIframeAPIReady = ready;
    setTimeout(() => {
      if (window.YT && window.YT.Player) callback();
    }, 1000);
  }

  function createYouTubePlayer() {
    if (!state.ytPlayer && window.YT && window.YT.Player) {
      state.ytPlayer = new YT.Player('youtubePlayer', {
        height: '1',
        width: '1',
        videoId: '',
        playerVars: {
          autoplay: 0,
          controls: 1,
          playsinline: 1,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            state.playerReady = true;
            event.target.setVolume(state.muted ? 0 : state.volume);
            const pendingAction = state.pendingPlayerAction;
            state.pendingPlayerAction = null;
            if (pendingAction) pendingAction(event.target);
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              state.isPlaying = true;
              playBtn.textContent = '❚❚';
            } else if (event.data === YT.PlayerState.PAUSED) {
              state.isPlaying = false;
              playBtn.textContent = '▶';
            } else if (event.data === YT.PlayerState.ENDED) {
              if (!state.currentTrack?.youtubePlaylistId) advanceTrack(1);
            }
          },
          onError: () => {
            setStatus('This track could not be embedded. Trying the next valid result.', 'error');
            advanceTrack(1);
          },
        }
      });
    }
  }

  function applyVolume() {
    if (state.ytPlayer && typeof state.ytPlayer.setVolume === 'function') {
      state.ytPlayer.setVolume(state.muted ? 0 : state.volume);
      state.ytPlayer.mute();
      if (!state.muted) state.ytPlayer.unMute();
    }
  }

  function withReadyYouTube(action) {
    ensureYouTubeApi(() => {
      createYouTubePlayer();
      if (state.playerReady && state.ytPlayer) {
        action(state.ytPlayer);
      } else {
        state.pendingPlayerAction = action;
      }
    });
  }

  function playTrackFromList(track, index, playlist = []) {
    if (!track) return;
    state.currentPlaylist = playlist.length ? playlist : state.songCatalog;
    const safeIndex = Number.isInteger(index) ? index : state.currentPlaylist.findIndex(item => item.id === track.id);
    state.currentIndex = safeIndex >= 0 ? safeIndex : 0;
    setCurrentTrack(track, state.currentIndex, state.currentPlaylist);

    if (!track.youtubeVideoId && !track.youtubePlaylistId) {
      setStatus('This result is missing a playable YouTube ID or playlist.', 'error');
      return;
    }

    withReadyYouTube((player) => {
      if (typeof player.loadPlaylist === 'function' && track.youtubePlaylistId) {
        player.loadPlaylist({ list: track.youtubePlaylistId, index: 0 });
        state.currentVideoId = null;
        applyVolume();
        state.provider = 'youtube';
        setStatus(`Now playing: ${track.title}`, 'info');
        player.playVideo?.();
        expandYouTubePlaylist(track);
      } else if (typeof player.loadVideoById === 'function' && track.youtubeVideoId) {
        player.loadVideoById(track.youtubeVideoId);
        state.currentVideoId = track.youtubeVideoId;
        applyVolume();
        state.provider = 'youtube';
        setStatus(`Now playing: ${track.title}`, 'info');
        setTimeout(() => {
          player.playVideo?.();
        }, 250);
      }
    });
  }

  function advanceTrack(direction) {
    const playlist = state.currentPlaylist.length ? state.currentPlaylist : state.songCatalog;
    if (!playlist.length) return;
    const nextIndex = (state.currentIndex + direction + playlist.length) % playlist.length;
    const nextTrack = playlist[nextIndex];
    if (nextTrack) {
      playTrackFromList(nextTrack, nextIndex, playlist);
    }
  }

  function updateProgressBar() {
    if (!state.ytPlayer || typeof state.ytPlayer.getCurrentTime !== 'function') {
      npFill.style.width = '0%';
      return;
    }
    const currentTime = Number(state.ytPlayer.getCurrentTime()) || 0;
    const duration = Number(state.ytPlayer.getDuration()) || 0;
    if (!duration) return;
    npCur.textContent = formatTime(currentTime);
    npDur.textContent = formatTime(duration);
    npFill.style.width = `${(currentTime / duration) * 100}%`;
  }

  function runSearch(query) {
    const clean = query.trim();
    if (!clean) return;
    if (state.searchCache.has(clean.toLowerCase())) {
      const cached = state.searchCache.get(clean.toLowerCase());
      state.currentPlaylist = cached;
      state.songCatalog = cached;
      renderTrackList(cached);
      setStatus(`Showing results for “${clean}”`, 'info');
      return;
    }

    renderSkeleton(3);
    setStatus('Loading song results...', 'info');

    fetch(`/api/youtube/search?query=${encodeURIComponent(clean)}`)
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.error || 'Could not reach the music library.');
        let results = (payload.tracks || []).map(track => normalizeTrack(track));
        results = results.filter(Boolean);
        if (!results.length) {
          setStatus('No matching anime tracks were found for that search.', 'error');
          trackList.innerHTML = '<div class="track-item"><div class="track-info"><strong>No results</strong><span>Try “One Piece opening” or “anime ending songs”.</span></div></div>';
          return;
        }

        const unique = [];
        const seen = new Set();
        results.forEach(track => {
          if (!track.youtubeVideoId || seen.has(track.youtubeVideoId)) return;
          seen.add(track.youtubeVideoId);
          unique.push(track);
        });

        state.searchCache.set(clean.toLowerCase(), unique);
        state.songCatalog = unique;
        state.currentPlaylist = unique;
        renderTrackList(unique);
        setStatus(`Showing ${unique.length} real results for “${clean}”`, 'info');
        if (unique[0]) {
          state.currentTrack = unique[0];
          updatePlayerMeta(unique[0]);
        }
      })
      .catch(error => {
        console.error(error);
        setStatus("Couldn't reach the music library.", 'error', true);
        trackList.innerHTML = '<div class="track-item"><div class="track-info"><strong>Could not load songs</strong><span>Check the API key configuration.</span></div></div>';
      });
  }

  async function loadPlaylists() {
    try {
      setStatus('Loading real anime tracks...', 'info');
      renderSkeleton(3);
      const response = await fetch('/api/config');
      const config = await response.json();

      if (!config.ready) {
        setStatus('YouTube search is optional; loading the local anime catalog instead.', 'info');
      }

      const songsResponse = await fetch('/api/songs');
      if (!songsResponse.ok) {
        const payload = await songsResponse.json().catch(() => ({}));
        throw new Error(payload.error || 'Could not reach the music library.');
      }

      const playlists = await songsResponse.json();
      state.playlists = playlists;
      const flattened = flattenTracks(playlists);
      state.songCatalog = flattened;
      state.currentPlaylist = flattened;

      if (!flattened.length) {
        setStatus('No real anime tracks are available right now.', 'error');
        trackList.innerHTML = '<div class="track-item"><div class="track-info"><strong>No songs available</strong><span>Use search to find real YouTube results.</span></div></div>';
        return;
      }

      renderTrackList(flattened);
      setStatus('Real anime music loaded.', 'info');
      if (flattened[0]) {
        setCurrentTrack(flattened[0], 0, flattened);
        if (flattened[0].youtubePlaylistId) {
          withReadyYouTube((player) => {
            if (player.cuePlaylist) {
              player.cuePlaylist({ list: flattened[0].youtubePlaylistId, index: 0 });
              expandYouTubePlaylist(flattened[0]);
            }
          });
        }
      }
    } catch (error) {
      console.error(error);
      setStatus("Couldn't reach the music library.", 'error', true);
      trackList.innerHTML = '<div class="track-item"><div class="track-info"><strong>Could not load songs</strong><span>Check the YouTube API key.</span></div></div>';
    }
  }

  function attachEvents() {
    weatherButtons.forEach(button => {
      button.addEventListener('click', () => setWeather(button.dataset.fx));
    });

    const toggleButton = $('[data-action="playlist-toggle"]');
    if (toggleButton) toggleButton.addEventListener('click', togglePlaylist);
    if (playlistCloseBtn) playlistCloseBtn.addEventListener('click', () => setPlaylistOpen(false));

    $('#prevBtn').addEventListener('click', () => advanceTrack(-1));
    $('#nextBtn').addEventListener('click', () => advanceTrack(1));
    $('#shuffleBtn').addEventListener('click', () => {
      if (!state.songCatalog.length) return;
      const randomIndex = Math.floor(Math.random() * state.songCatalog.length);
      const randomTrack = state.songCatalog[randomIndex];
      playTrackFromList(randomTrack, randomIndex, state.songCatalog);
    });
    $('#repeatBtn').addEventListener('click', () => {
      if (state.ytPlayer && typeof state.ytPlayer.seekTo === 'function') {
        state.ytPlayer.seekTo(0, true);
      }
    });
    playBtn.addEventListener('click', () => {
      if (!state.currentTrack && state.songCatalog.length) {
        playTrackFromList(state.songCatalog[0], 0, state.songCatalog);
        return;
      }
      if (!state.ytPlayer) {
        if (state.currentTrack) playTrackFromList(state.currentTrack, state.currentIndex, state.currentPlaylist);
        return;
      }
      if (state.isPlaying) {
        state.ytPlayer.pauseVideo();
        state.isPlaying = false;
        playBtn.textContent = '▶';
      } else {
        state.ytPlayer.playVideo();
        state.isPlaying = true;
        playBtn.textContent = '❚❚';
      }
    });

    volumeBtn.addEventListener('click', () => {
      state.muted = !state.muted;
      applyVolume();
      volumeBtn.textContent = state.muted ? '🔇' : '♪';
    });

    if (openYoutubeBtn) {
      openYoutubeBtn.addEventListener('click', () => {
        const track = state.currentTrack;
        if (!track) return showToast('Select a track first.');
        const url = track.youtubeUrl || (track.youtubeVideoId ? `https://www.youtube.com/watch?v=${track.youtubeVideoId}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.title} ${track.artist}`)}`);
        window.open(url, '_blank', 'noopener,noreferrer');
      });
    }

    if (profileButton) profileButton.addEventListener('click', () => showToast('Profile is coming soon.'));

    trackSearch.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        runSearch(trackSearch.value);
      }
    });

    searchBtn.addEventListener('click', () => runSearch(trackSearch.value));

    playlistStatus.addEventListener('click', event => {
      const target = event.target.closest('[data-retry="true"]');
      if (target) {
        if (trackSearch.value.trim()) {
          runSearch(trackSearch.value);
        } else {
          loadPlaylists();
        }
      }
    });
  }

  function startProgressLoop() {
    clearInterval(state.progressTimer);
    state.progressTimer = setInterval(() => {
      if (state.ytPlayer && state.provider === 'youtube') {
        updateProgressBar();
      }
    }, 250);
  }

  function init() {
    resize();
    window.addEventListener('resize', resize);
    tickFx();
    attachEvents();
    startProgressLoop();
    loadListeners();
    window.setInterval(loadListeners, 5000);
    updateClock();
    window.setInterval(updateClock, 1000);
    setPlaylistOpen(false);
    updatePlayerMeta({
      title: 'Main Character FM',
      artist: 'Anime openings',
      thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=800&q=80',
      duration: 0,
    });
    loadPlaylists();
  }

  init();
})();
