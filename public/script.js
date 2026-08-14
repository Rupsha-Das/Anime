(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  const weatherButtons = $$('.weather-btn');
  const playlistPanel = $('#playlistPanel');
  const trackList = $('#trackList');
  const audio = $('#audio');
  const playBtn = $('#playBtn');
  const npTitle = $('#npTitle');
  const npArtist = $('#npArtist');
  const npFill = $('#npFill');
  const npCur = $('#npCur');
  const npDur = $('#npDur');
  const listenerCount = $('#listenerCount');
  const playlistCloseBtn = $('[data-action="playlist-close"]');

  let playlists = {};
  let songCatalog = [];
  let currentKey = null;
  let currentIndex = 0;
  let currentMode = 'snow';
  let currentTrackRow = null;
  let playlistOpen = false;
  let currentFile = '';

  const FX = {
    snow: [],
    rain: [],
    sakura: [],
    sparkles: [],
  };

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
    if (currentMode === 'clear') {
      requestAnimationFrame(tickFx);
      return;
    }

    const list = FX[currentMode];
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      if (currentMode === 'snow') {
        p.ph += .02;
        p.y += p.s;
        p.x += Math.sin(p.ph) * p.drift;
        ctx.fillStyle = 'rgba(255,255,255,.88)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (currentMode === 'rain') {
        p.y += p.s;
        p.x += 1.1;
        ctx.strokeStyle = 'rgba(130, 190, 255, .5)';
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - 4, p.y - p.l);
        ctx.stroke();
      } else if (currentMode === 'sakura') {
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
      } else if (currentMode === 'sparkles') {
        p.ph += .03;
        const alpha = (Math.sin(p.ph) + 1) / 2;
        ctx.fillStyle = `rgba(255, 221, 170, ${.2 + alpha * .55})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (p.y > H + 30 || p.x > W + 30) {
        list.splice(i, 1);
        spawn(currentMode);
      }
    }

    while (list.length < COUNT[currentMode]) spawn(currentMode);
    requestAnimationFrame(tickFx);
  }

  function setWeather(mode) {
    currentMode = mode;
    weatherButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.fx === mode));
  }

  function setPlaylistOpen(open) {
    playlistOpen = open;
    playlistPanel.classList.toggle('open', open);
    playlistPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.style.overflow = 'hidden';
  }

  function togglePlaylist() {
    setPlaylistOpen(!playlistOpen);
  }

  async function loadListeners() {
    try {
      const response = await fetch('/api/listeners');
      const data = await response.json();
      listenerCount.textContent = Number(data.count || 0).toLocaleString();
    } catch {
      // Leave the last known value on screen if the request fails.
    }
  }

  function fmt(time) {
    return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
  }

  function updateProgress() {
    if (!audio.duration || Number.isNaN(audio.duration)) return;
    npFill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
    npCur.textContent = fmt(audio.currentTime);
    npDur.textContent = fmt(audio.duration);
  }

  async function loadPlaylists() {
    const response = await fetch('/api/songs');
    playlists = await response.json();
    const firstKey = Object.keys(playlists)[0];
    if (!firstKey) return;

    songCatalog = getAllSongs();
    renderTracks(firstKey);
    const firstSong = songCatalog[0] || playlists[firstKey]?.songs?.[0];
    if (firstSong) {
      npTitle.textContent = firstSong.title;
      npArtist.textContent = firstSong.artist;
    }
  }

  function getAllSongs() {
    const seen = new Set();
    const songs = [];
    Object.entries(playlists).forEach(([playlistKey, playlist]) => {
      playlist.songs.forEach(song => {
        if (seen.has(song.file)) return;
        seen.add(song.file);
        songs.push({ ...song, playlistKey });
      });
    });
    return songs;
  }

  function renderTracks(key) {
    const playlist = playlists[key];
    if (!playlist) return;

    currentKey = key;
    songCatalog = getAllSongs();
    trackList.innerHTML = songCatalog.map((song, index) => `
      <article class="track-item ${song.file === currentFile ? 'active' : ''}" data-index="${index}" data-file="${song.file}" data-title="${song.title}" data-playlist="${song.playlistKey}">
        <div class="track-num">${String(index + 1).padStart(2, '0')}</div>
        <div class="track-info">
          <strong>${song.title}</strong>
          <span>${song.artist}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="track-dur">${song.duration}</span>
          <button class="track-play" aria-label="Play ${song.title}">▶</button>
        </div>
      </article>
    `).join('');

    $$('.track-item', trackList).forEach(item => {
      const play = () => playTrack(item.dataset.file, item.dataset.title, item.dataset.playlist, Number(item.dataset.index), item);
      item.addEventListener('click', play);
      $('.track-play', item).addEventListener('click', e => {
        e.stopPropagation();
        play();
      });
    });
  }

  function setActiveRow(row) {
    $$('.track-item', trackList).forEach(item => item.classList.remove('active'));
    if (row) row.classList.add('active');
  }

  function playTrack(file, title, key, index, row) {
    currentKey = key;
    currentIndex = index;
    currentTrackRow = row;
    currentFile = file;
    audio.src = `/api/audio/${file}`;
    npTitle.textContent = title;
    npArtist.textContent = 'ANIMESCAPE';
    setActiveRow(row);
    audio.play().then(() => {
      playBtn.textContent = '❚❚';
    }).catch(() => {});
  }

  function nextTrack() {
    if (!songCatalog.length) return;
    const nextIndex = (currentIndex + 1) % songCatalog.length;
    const nextSong = songCatalog[nextIndex];
    playTrack(nextSong.file, nextSong.title, nextSong.playlistKey, nextIndex, $$('.track-item', trackList)[nextIndex]);
  }

  function prevTrack() {
    if (!songCatalog.length) return;
    const nextIndex = (currentIndex - 1 + songCatalog.length) % songCatalog.length;
    const nextSong = songCatalog[nextIndex];
    playTrack(nextSong.file, nextSong.title, nextSong.playlistKey, nextIndex, $$('.track-item', trackList)[nextIndex]);
  }

  $$('[data-action]').forEach(button => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'playlist-toggle') togglePlaylist();
      if (action === 'playlist-close') setPlaylistOpen(false);
      if (action === 'play-first') {
        const firstKey = Object.keys(playlists)[0];
        const firstSong = playlists[firstKey]?.songs?.[0];
        if (firstKey && firstSong) {
          renderTracks(firstKey);
          playTrack(firstSong.file, firstSong.title, firstKey, 0, $$('.track-item', trackList)[0]);
        }
      }
    });
  });

  weatherButtons.forEach(button => {
    button.addEventListener('click', () => setWeather(button.dataset.fx));
  });

  if (playlistCloseBtn) {
    playlistCloseBtn.addEventListener('click', () => setPlaylistOpen(false));
  }

  resize();
  window.addEventListener('resize', resize);
  tickFx();

  loadListeners();
  window.setInterval(loadListeners, 5000);

  $('#prevBtn').addEventListener('click', prevTrack);
  $('#nextBtn').addEventListener('click', nextTrack);
  $('#shuffleBtn').addEventListener('click', () => {
    if (!songCatalog.length) return;
    const nextIndex = Math.floor(Math.random() * songCatalog.length);
    const nextSong = songCatalog[nextIndex];
    playTrack(nextSong.file, nextSong.title, nextSong.playlistKey, nextIndex, $$('.track-item', trackList)[nextIndex]);
  });
  $('#repeatBtn').addEventListener('click', () => {
    if (audio.src) audio.currentTime = 0;
  });
  playBtn.addEventListener('click', () => {
    if (!audio.src) {
      const firstKey = Object.keys(playlists)[0];
      const firstSong = playlists[firstKey]?.songs?.[0];
      if (firstKey && firstSong) playTrack(firstSong.file, firstSong.title, firstKey, 0, $$('.track-item', trackList)[0]);
      return;
    }
    if (audio.paused) {
      audio.play();
      playBtn.textContent = '❚❚';
    } else {
      audio.pause();
      playBtn.textContent = '▶';
    }
  });

  audio.addEventListener('play', () => { playBtn.textContent = '❚❚'; });
  audio.addEventListener('pause', () => { playBtn.textContent = '▶'; });
  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('timeupdate', updateProgress);
  audio.addEventListener('loadedmetadata', updateProgress);

  loadPlaylists().catch(() => {
    trackList.innerHTML = '<div class="track-item"><div class="track-info"><strong>Could not load songs</strong><span>Check the server</span></div></div>';
  });

  setPlaylistOpen(false);
})();