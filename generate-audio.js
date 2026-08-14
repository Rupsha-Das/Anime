const fs = require('fs');
const path = require('path');

const SR = 44100;
const OUTDIR = path.join(__dirname, 'public', 'audio');

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

const NOTE = {};
['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach((n, i) => {
  const off = [0, 2, 4, 5, 7, 9, 11][i % 7] + (i < 5 ? 0 : 1);
  // map letter to semitone
});
for (let i = 0; i < 12; i++) NOTE[['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][i]] = i;

function note(name) {
  const letters = Object.keys(NOTE);
  let m = 0;
  const letter = name[0] + (name[1] === '#' || name[1] === 'b' ? name[1] : '');
  const oct = parseInt(name.replace(letter, ''), 10);
  m = (oct + 1) * 12 + (NOTE[letter] || 0) - 12 + 12; // midi
  return midiToFreq(m);
}

// tiny rng
let _seed = 1234567;
function rng() {
  _seed = (_seed * 1103515245 + 12345) % 2147483648;
  return _seed / 2147483648;
}

class Mixer {
  constructor() {
    this.data = new Float32Array(Math.floor(SR * 40));
    this.cursor = 0;
  }
  osc(type, f, t, d, v, opts = {}) {
    const { attack = 0.01, release = 0.4, detune = 0, sweep = 0 } = opts;
    const a = attack, rel = release;
    const n0 = Math.floor(t * SR);
    const n1 = Math.floor((t + d + rel) * SR);
    for (let n = n0; n < n1 && n < this.data.length; n++) {
      const tt = n / SR - t;
      let gain = 1;
      if (tt < a) gain = tt / a;
      const tail = tt - d;
      if (tail > 0) gain *= Math.max(0, 1 - tail / rel);
      if (gain <= 0.001) { this.data[n] = 0; continue; }
      const ff = f + sweep * tt;
      const ph = 2 * Math.PI * (ff * (tt + detune * tt * 0.001));
      let s = 0;
      if (type === 'sine') s = Math.sin(ph);
      else if (type === 'square') s = Math.sin(ph) > 0 ? 1 : -1;
      else if (type === 'saw') s = 2 * ((ph / (2 * Math.PI)) % 1) - 1;
      else if (type === 'tri') s = 2 * Math.abs(2 * ((ph / (2 * Math.PI)) % 1) - 1) - 1;
      else if (type === 'noise') s = rng() * 2 - 1;
      this.data[n] += s * gain * v;
    }
  }
  kick(t, v = 0.9) {
    const n0 = Math.floor(t * SR), n1 = Math.floor((t + 0.4) * SR);
    for (let n = n0; n < n1 && n < this.data.length; n++) {
      const tt = n / SR - t;
      const f = 130 * Math.pow(2, -tt * 9);
      const env = Math.exp(-tt * 9) * v;
      this.data[n] += Math.sin(2 * Math.PI * f * tt) * env;
    }
  }
  hat(t, v = 0.16, open = false) {
    const d = open ? 0.5 : 0.08;
    const n0 = Math.floor(t * SR), n1 = Math.floor((t + d) * SR);
    for (let n = n0; n < n1 && n < this.data.length; n++) {
      const tt = n / SR - t;
      const env = Math.exp(-tt * (open ? 5 : 40)) * v;
      let s = (rng() * 2 - 1);
      s = (s * 0.6 + (rng() * 2 - 1) * 0.4);
      this.data[n] += s * env;
    }
  }
  snare(t, v = 0.4) {
    const n0 = Math.floor(t * SR), n1 = Math.floor((t + 0.22) * SR);
    for (let n = n0; n < n1 && n < this.data.length; n++) {
      const tt = n / SR - t;
      const env = Math.exp(-tt * 16) * v;
      const tone = Math.sin(2 * Math.PI * 190 * tt) * Math.exp(-tt * 30) * 0.5;
      this.data[n] += ((rng() * 2 - 1) * env * 0.8 + tone * v);
    }
  }
  write(file) {
    const len = Math.floor(this.duration() * SR);
    const buf = Buffer.alloc(44 + len * 2);
    buf.write('RIFF', 0);
    buf.writeUInt32LE(36 + len * 2, 4);
    buf.write('WAVE', 8);
    buf.write('fmt ', 12);
    buf.writeUInt32LE(16, 16);
    buf.writeUInt16LE(1, 20);
    buf.writeUInt16LE(1, 22);
    buf.writeUInt32LE(SR, 24);
    buf.writeUInt32LE(SR * 2, 28);
    buf.writeUInt16LE(2, 32);
    buf.writeUInt16LE(16, 34);
    buf.write('data', 36);
    buf.writeUInt32LE(len * 2, 40);
    let peak = 0;
    for (let i = 0; i < len; i++) {
      const v = this.data[i];
      if (Math.abs(v) > peak) peak = Math.abs(v);
    }
    const g = peak > 0.98 ? 0.98 / peak : 1;
    for (let i = 0; i < len; i++) {
      let s = Math.max(-1, Math.min(1, this.data[i] * g));
      buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
    }
    fs.writeFileSync(file, buf);
  }
  duration() {
    let last = 0;
    for (let i = this.data.length - 1; i >= 0; i--) {
      if (Math.abs(this.data[i]) > 0.001) { last = i / SR + 0.4; break; }
    }
    return last;
  }
}

// ---------- Track 1: SAKURA OPENING (C major, bright, 120 BPM) ----------
function trackOp() {
  const m = new Mixer();
  const bpm = 120, beat = 60 / bpm;
  const prog = [
    [60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]
  ];
  const mel = [72, 76, 79, 81, 79, 76, 72, 79, 76, 74, 72, 74, 76, 79, 81, 84];
  for (let bar = 0; bar < 16; bar++) {
    const chord = prog[bar % 4];
    const root = chord[0];
    for (let b = 0; b < 4; b++) {
      const t = (bar * 4 + b) * beat;
      chord.forEach(c => m.osc('square', midiToFreq(c), t, beat * 0.9, 0.05, { attack: 0.005, release: 0.15, detune: 6 }));
      m.osc('sine', midiToFreq(root - 24), t, beat * 3.8, 0.18, { attack: 0.04, release: 0.4 });
      m.kick(t, 0.7);
      if (b % 2 === 1) m.hat(t, 0.1);
      if (b === 2) m.snare(t, 0.25);
    }
    for (let i = 0; i < 8; i++) {
      const t = (bar * 4) * beat + i * beat * 0.5;
      const mnote = mel[(bar * 8 + i) % mel.length] + 12;
      m.osc('tri', midiToFreq(mnote), t, beat * 0.48, 0.12, { attack: 0.01, release: 0.2 });
    }
  }
  return m;
}

// ---------- Track 2: BALLAD OF TWO (A minor, slow, piano-ish) ----------
function trackBallad() {
  const m = new Mixer();
  const bpm = 70, beat = 60 / bpm;
  const prog = [
    [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]
  ];
  const mel = [72, 71, 69, 69, 67, 69, 71, 72, 74, 72, 71, 69, 71, 72, 69, 67];
  for (let bar = 0; bar < 8; bar++) {
    const chord = prog[bar % 4];
    chord.forEach(c => m.osc('sine', midiToFreq(c), bar * 4 * beat, beat * 6, 0.1, { attack: 0.1, release: 1.2 }));
    m.osc('tri', midiToFreq(chord[0] - 12), bar * 4 * beat, beat * 6, 0.25, { attack: 0.2, release: 1.5 });
    for (let i = 0; i < 8; i++) {
      const t = bar * 4 * beat + i * beat * 0.5;
      m.osc('sine', midiToFreq(chord[i % 3] + 12), t, beat * 0.45, 0.06, { attack: 0.02, release: 0.6 });
    }
    for (let i = 0; i < 4; i++) {
      const t = bar * 4 * beat + i * beat;
      m.osc('tri', midiToFreq(mel[(bar * 4 + i) % mel.length]), t, beat * 2.2, 0.14, { attack: 0.02, release: 1.4 });
    }
  }
  return m;
}

// ---------- Track 3: MIDNIGHT DRIVE (synthwave, 92 BPM) ----------
function trackNight() {
  const m = new Mixer();
  const bpm = 92, beat = 60 / bpm;
  const prog = [
    [57, 60, 64], [53, 57, 60], [48, 52, 55], [50, 53, 57]
  ];
  const bassSeq = [33, 40, 45, 52];
  for (let bar = 0; bar < 12; bar++) {
    const chord = prog[bar % 4];
    chord.forEach(c => m.osc('saw', midiToFreq(c), bar * 4 * beat, beat * 8, 0.035, { attack: 0.3, release: 1.2, detune: 9 }));
    m.osc('sine', midiToFreq(chord[0] - 24), bar * 4 * beat, beat * 8, 0.2, { attack: 0.05, release: 0.6 });
    for (let b = 0; b < 8; b++) {
      const t = bar * 4 * beat + b * beat * 0.5;
      const bp = bassSeq[(b % bassSeq.length)];
      m.osc('saw', midiToFreq(bp), t, beat * 0.4, 0.13, { attack: 0.005, release: 0.2 });
      if (b % 4 === 0) m.kick(t, 0.75);
      if (b % 2 === 0) m.hat(t, 0.09);
      if (b % 8 === 4) m.snare(t, 0.3);
    }
    const slam = [76, 79, 81, 79, 76, 74, 71, 74, 76, 79, 84, 79, 76, 74, 71, 69];
    for (let i = 0; i < 8; i++) {
      const t = bar * 4 * beat + i * beat * 0.5;
      if (i % 2 === 0) m.osc('square', midiToFreq(slam[(bar * 8 + i) % slam.length] + 12), t, beat * 0.45, 0.07, { attack: 0.005, release: 0.25 });
    }
  }
  return m;
}

// ---------- Track 4: LEVEL UP (E minor, driving, 138 BPM) ----------
function trackTraining() {
  const m = new Mixer();
  const bpm = 138, beat = 60 / bpm;
  const chords = [40, 36, 43, 38];
  const power = (root) => [root, root + 12, root + 7 + 12];
  const riff = [64, 67, 71, 74, 71, 67, 64, 62, 64, 67, 71, 74, 76, 74, 71, 67];
  for (let bar = 0; bar < 16; bar++) {
    const root = chords[bar % 4];
    power(root).forEach(c => m.osc('saw', midiToFreq(c + 12), bar * 4 * beat, beat * 4, 0.05, { attack: 0.02, release: 0.3, detune: 7 }));
    for (let b = 0; b < 8; b++) {
      const t = bar * 4 * beat + b * beat * 0.5;
      m.osc('square', midiToFreq(root + 12), t, beat * 0.4, 0.1, { attack: 0.004, release: 0.18 });
      if (b % 4 === 0) m.kick(t, 0.85);
      if (b % 4 === 2) m.snare(t, 0.32);
      if (b % 2 === 1) m.hat(t, 0.07);
    }
    for (let i = 0; i < 8; i++) {
      const t = bar * 4 * beat + i * beat * 0.5;
      m.osc('tri', midiToFreq(riff[(bar * 8 + i) % riff.length] + 12), t, beat * 0.4, 0.11, { attack: 0.005, release: 0.2 });
    }
  }
  return m;
}

// ---------- Track 5: VILLAIN'S ANTHEM (D minor, dark, 96 BPM) ----------
function trackVillain() {
  const m = new Mixer();
  const bpm = 96, beat = 60 / bpm;
  const lows = [38, 33, 35, 36];
  const stab = [62, 65, 69, 62, 65, 69, 65, 62, 58, 60, 62, 65, 69, 72];
  for (let bar = 0; bar < 8; bar++) {
    const root = lows[bar % 4];
    m.osc('saw', midiToFreq(root - 12), bar * 4 * beat, beat * 4, 0.11, { attack: 0.25, release: 0.9, detune: 4 });
    m.osc('sine', midiToFreq(root), bar * 4 * beat, beat * 4, 0.28, { attack: 0.08, release: 0.6 });
    for (let b = 0; b < 4; b++) {
      const t = bar * 4 * beat + b * beat;
      if (b === 0 || b === 2) m.kick(t, 0.6);
      for (let s = 0; s < 3; s++) m.osc('square', midiToFreq(stab[(bar * 4 + b) % stab.length] + 12), t + beat * 0.5 + s * 0.02, beat * 0.9, 0.045, { attack: 0.01, release: 0.35 });
      m.hat(t + beat * 0.5, 0.06, true);
    }
  }
  return m;
}

// ---------- Track 6: FESTIVAL FIREWORKS (G major, joyful, 128 BPM) ----------
function trackFestival() {
  const m = new Mixer();
  const bpm = 128, beat = 60 / bpm;
  const prog = [
    [55, 59, 62], [50, 55, 59], [57, 60, 64], [52, 55, 62]
  ];
  const mel = [79, 81, 83, 81, 79, 81, 79, 76, 79, 76, 74, 76, 79, 81, 79, 74];
  const bells = [96, 100, 103, 108];
  for (let bar = 0; bar < 12; bar++) {
    const chord = prog[bar % 4];
    chord.forEach(c => m.osc('tri', midiToFreq(c - 12), bar * 4 * beat, beat * 4, 0.16, { attack: 0.02, release: 0.5 }));
    for (let b = 0; b < 8; b++) {
      const t = bar * 4 * beat + b * beat * 0.5;
      m.osc('sine', midiToFreq(chord[b % 3] + 12), t, beat * 0.4, 0.07, { attack: 0.005, release: 0.3 });
      if (b % 4 === 0) m.kick(t, 0.5);
      if (b % 2 === 1) m.hat(t, 0.14);
      if (b % 8 === 4) m.snare(t, 0.2);
    }
    for (let i = 0; i < 8; i++) {
      const t = bar * 4 * beat + i * beat / 2;
      m.osc('tri', midiToFreq(mel[(bar * 8 + i) % mel.length]), t, beat * 0.6, 0.13, { attack: 0.005, release: 0.45 });
    }
    const bt = bar * 4 * beat + 3 * beat;
    m.osc('sine', midiToFreq(bells[bar % bells.length]), bt, beat * 0.9, 0.14, { attack: 0.01, release: 1 });
  }
  return m;
}

if (!fs.existsSync(OUTDIR)) fs.mkdirSync(OUTDIR, { recursive: true });

const tracks = [
  ['sakura-opening', trackOp],
  ['ballad-of-two', trackBallad],
  ['midnight-drive', trackNight],
  ['level-up', trackTraining],
  ['villain-anthem', trackVillain],
  ['festival-fireworks', trackFestival]
];

console.log('Generating anime soundtrack...');
for (const [name, fn] of tracks) {
  const m = fn();
  const file = path.join(OUTDIR, name + '.wav');
  m.write(file);
  console.log('  -> ' + name + '.wav  (' + Math.round(m.duration()) + 's, ' + fs.statSync(file).size + ' bytes)');
}
console.log('Done. Tracks ready in public/audio/');