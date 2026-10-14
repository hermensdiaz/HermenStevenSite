// Efectos de sonido sintetizados con WebAudio (no requiere archivos de audio).
export default class Sfx {
  constructor(scene) {
    this.ctx = scene.sound && scene.sound.context ? scene.sound.context : null;
    this.vol = 0.55;
    this.noiseBuf = null;
    this.last = {};
  }

  _ok() {
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  _gate(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now;
    return true;
  }

  tone({ f = 440, to = null, d = 0.1, type = 'square', v = 0.1, delay = 0 }) {
    if (!this._ok()) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + d);
    g.gain.setValueAtTime(v * this.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + d + 0.02);
  }

  noise({ d = 0.1, v = 0.1, hp = 500, delay = 0 }) {
    if (!this._ok()) return;
    const c = this.ctx, t = c.currentTime + delay;
    if (!this.noiseBuf) {
      this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain();
    g.gain.setValueAtTime(v * this.vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + d + 0.02);
  }

  shoot()      { if (this._gate('shoot', 40)) { this.tone({ f: 620, to: 170, d: 0.12, v: 0.09 }); this.noise({ d: 0.05, v: 0.05, hp: 2200 }); } }
  empty()      { if (this._gate('empty', 120)) this.tone({ f: 140, d: 0.06, type: 'square', v: 0.08 }); }
  reload()     { this.tone({ f: 300, to: 200, d: 0.06, v: 0.08 }); this.tone({ f: 420, to: 260, d: 0.06, v: 0.08, delay: 0.35 }); this.tone({ f: 260, to: 180, d: 0.08, v: 0.08, delay: 0.7 }); }
  reloadDone() { this.tone({ f: 500, to: 900, d: 0.12, type: 'triangle', v: 0.1 }); }
  swing()      { this.noise({ d: 0.16, v: 0.12, hp: 900 }); this.tone({ f: 240, to: 90, d: 0.14, type: 'sawtooth', v: 0.05 }); }
  hit()        { if (this._gate('hit', 30)) { this.tone({ f: 200, to: 80, d: 0.09, type: 'square', v: 0.08 }); this.noise({ d: 0.05, v: 0.06, hp: 1500 }); } }
  kill()       { if (this._gate('kill', 30)) { this.tone({ f: 380, to: 90, d: 0.25, type: 'sawtooth', v: 0.09 }); this.noise({ d: 0.18, v: 0.08, hp: 400 }); } }
  hurt()       { this.tone({ f: 180, to: 60, d: 0.3, type: 'sawtooth', v: 0.14 }); this.noise({ d: 0.2, v: 0.1, hp: 300 }); }
  dash()       { this.noise({ d: 0.18, v: 0.09, hp: 1200 }); this.tone({ f: 300, to: 700, d: 0.15, type: 'triangle', v: 0.06 }); }
  pickup()     { this.tone({ f: 660, d: 0.08, type: 'triangle', v: 0.1 }); this.tone({ f: 990, d: 0.14, type: 'triangle', v: 0.1, delay: 0.08 }); }
  enemyShot()  { if (this._gate('eshot', 80)) this.tone({ f: 340, to: 520, d: 0.1, type: 'sine', v: 0.07 }); }
  gameOver()   { this.tone({ f: 330, to: 60, d: 1.0, type: 'sawtooth', v: 0.14 }); this.noise({ d: 0.6, v: 0.1, hp: 200 }); }
}
