import { mulberry32 } from '../utils/helpers.js';

const gfx = (scene) => scene.make.graphics({ x: 0, y: 0, add: false });

function canvasTex(scene, key, w, h, fn) {
  const t = scene.textures.createCanvas(key, w, h);
  fn(t.getContext('2d'), w, h);
  t.refresh();
}

function radial(scene, key, size, stops) {
  canvasTex(scene, key, size, size, (ctx) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

export function generateTextures(scene) {
  if (scene.textures.exists('floor')) return;
  bodies(scene);
  limbs(scene);
  faces(scene);
  weapons(scene);
  projectiles(scene);
  auras(scene);
  floorTile(scene);
  deco(scene);
}

/* ---------- Cuerpos ---------- */
function bodies(scene) {
  const tx = scene.textures;
  const hasImg = tx.exists('mamut');

  const draw = (key, size, overlay) => {
    canvasTex(scene, key, size, size, (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
      ctx.clip();
      if (hasImg) {
        ctx.drawImage(tx.get('mamut').getSourceImage(), 0, 0, size, size);
      } else {
        // Respaldo si no carga la imagen: galleta de chocolate procedural
        const g = ctx.createRadialGradient(size * 0.4, size * 0.35, 2, size / 2, size / 2, size / 2);
        g.addColorStop(0, '#a0583a'); g.addColorStop(0.6, '#6b2f1a'); g.addColorStop(1, '#3b170b');
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.ellipse(size * 0.38, size * 0.3, size * 0.22, size * 0.1, -0.5, 0, Math.PI * 2); ctx.fill();
      }
      if (overlay) {
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, size, size);
      }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
      ctx.stroke();
    });
  };
  draw('body_player', 64);
  draw('body_evil', 72, 'rgba(200,30,80,0.45)');

  // Barrita de fresa
  const g = gfx(scene);
  g.fillStyle(0x8f1530).fillRoundedRect(0, 2, 64, 34, 12);
  g.fillStyle(0xff4f70).fillRoundedRect(2, 3, 60, 30, 11);
  g.fillStyle(0xff8fa6).fillRoundedRect(6, 6, 52, 8, 4);
  g.fillStyle(0xfff1c9).fillRoundedRect(6, 22, 52, 6, 3);
  [[14, 18], [24, 16], [34, 19], [44, 17], [52, 20], [20, 10], [40, 11]].forEach(([x, y]) => {
    g.fillStyle(0xffe27a).fillCircle(x, y, 1.6);
  });
  g.fillStyle(0xc41e44).fillRect(0, 9, 5, 18);
  g.fillRect(59, 9, 5, 18);
  g.generateTexture('body_bar', 64, 38);
  g.destroy();
}

/* ---------- Brazos y piernas ---------- */
function limbs(scene) {
  const mk = (key, w, h, c1, c2) => {
    const g = gfx(scene);
    g.fillStyle(c1).fillEllipse(w / 2, h / 2, w, h);
    g.fillStyle(c2, 0.8).fillEllipse(w / 2 - 1, h / 2 - 2, w * 0.55, h * 0.4);
    g.lineStyle(2, 0x000000, 0.35).strokeEllipse(w / 2, h / 2, w - 1, h - 1);
    g.generateTexture(key, w, h);
    g.destroy();
  };
  [['p', 0x4a2012, 0x8a4b2e], ['e', 0x6e1a3a, 0xb83a66], ['b', 0xb0203f, 0xff8fa6]].forEach(([k, c1, c2]) => {
    mk('arm_' + k, 24, 15, c1, c2);
    mk('leg_' + k, 26, 16, c1, c2);
  });
}

/* ---------- Ojos y cejas ---------- */
function faces(scene) {
  let g = gfx(scene);
  g.fillStyle(0xffffff).fillCircle(7, 7, 6.5);
  g.fillStyle(0x111111).fillCircle(9.5, 7, 3.2);
  g.generateTexture('eye', 14, 14); g.destroy();

  g = gfx(scene);
  g.fillStyle(0xffe9a0).fillCircle(7, 7, 6.5);
  g.fillStyle(0xd10024).fillCircle(9.5, 7, 3.6);
  g.generateTexture('eye_evil', 14, 14); g.destroy();

  g = gfx(scene);
  g.fillStyle(0x2a0a14).fillRoundedRect(0, 0, 18, 5, 2);
  g.generateTexture('brow', 18, 5); g.destroy();
}

/* ---------- Armas ---------- */
function weapons(scene) {
  let g = gfx(scene);
  // Pistola de chocolate
  g.fillStyle(0x3d1f10).fillRoundedRect(0, 4, 26, 10, 3);
  g.fillStyle(0x7a3f1f).fillRoundedRect(1, 5, 24, 6, 3);
  g.fillStyle(0xb06a3c).fillRect(3, 6, 16, 2);
  g.fillStyle(0x2a140a).fillRoundedRect(24, 6, 16, 6, 2);
  g.fillStyle(0x59c3ff).fillRect(36, 6, 3, 6);
  g.fillStyle(0x3d1f10).fillRoundedRect(4, 12, 8, 6, 2);
  g.generateTexture('gun', 40, 18); g.destroy();

  // Bate de chocolate
  g = gfx(scene);
  g.fillStyle(0x5a2a17).fillRoundedRect(0, 5.5, 26, 5, 2);
  g.fillStyle(0xffd166).fillRect(4, 5.5, 3, 5);
  g.fillRect(10, 5.5, 3, 5);
  g.fillStyle(0x6e3519).fillRoundedRect(22, 1, 50, 14, 7);
  g.fillStyle(0xb06a3c, 0.9).fillRoundedRect(28, 3, 38, 4, 2);
  g.fillStyle(0xfff3da).fillRect(42, 1, 3, 14);
  g.fillRect(54, 2, 3, 12);
  g.generateTexture('bat', 72, 16); g.destroy();

  // Estela del golpe
  g = gfx(scene);
  g.lineStyle(14, 0xffffff, 0.9);
  g.beginPath(); g.arc(110, 110, 96, -1.3, 1.3, false); g.strokePath();
  g.lineStyle(6, 0xffffff, 0.5);
  g.beginPath(); g.arc(110, 110, 82, -1.2, 1.2, false); g.strokePath();
  g.generateTexture('slash', 220, 220); g.destroy();
}

/* ---------- Proyectiles y varios ---------- */
function projectiles(scene) {
  let g = gfx(scene);
  g.fillStyle(0x3d1f10).fillEllipse(8, 5, 16, 10);
  g.fillStyle(0x7a3f1f).fillEllipse(8, 5, 13, 7);
  g.fillStyle(0xc88a5a, 0.9).fillEllipse(6, 3, 6, 3);
  g.generateTexture('bullet', 16, 10); g.destroy();

  g = gfx(scene);
  g.fillStyle(0xff2e4d, 0.28).fillCircle(12, 12, 12);
  g.fillStyle(0xff2e4d).fillCircle(12, 12, 7);
  g.fillStyle(0xffb3c0).fillCircle(10, 10, 2.5);
  g.generateTexture('jam', 24, 24); g.destroy();

  g = gfx(scene);
  g.fillStyle(0xffffff).fillCircle(4, 4, 4);
  g.generateTexture('crumb', 8, 8); g.destroy();

  radial(scene, 'spark', 24, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);

  g = gfx(scene);
  g.fillStyle(0xff4d6d).fillCircle(8, 8, 7).fillCircle(18, 8, 7).fillTriangle(1.5, 10, 24.5, 10, 13, 23);
  g.fillStyle(0xffffff, 0.6).fillCircle(6, 6, 2.2);
  g.generateTexture('heart', 26, 24); g.destroy();
}

/* ---------- Auras (azul = bueno, roja = malo) ---------- */
function auras(scene) {
  radial(scene, 'aura_blue', 160, [
    [0, 'rgba(140,210,255,0.95)'], [0.35, 'rgba(70,150,255,0.6)'],
    [0.7, 'rgba(40,100,255,0.22)'], [1, 'rgba(40,100,255,0)'],
  ]);
  radial(scene, 'aura_red', 160, [
    [0, 'rgba(255,150,130,0.95)'], [0.35, 'rgba(255,70,70,0.6)'],
    [0.7, 'rgba(255,30,50,0.24)'], [1, 'rgba(255,30,50,0)'],
  ]);
}

/* ---------- Suelo y decoración ---------- */
function floorTile(scene) {
  const g = gfx(scene);
  const rng = mulberry32(7);
  g.fillStyle(0x23142a).fillRect(0, 0, 256, 256);
  g.fillStyle(0x2b1a33).fillRect(0, 0, 128, 128);
  g.fillRect(128, 128, 128, 128);
  g.lineStyle(2, 0x3a2445, 0.9);
  g.strokeRect(1, 1, 254, 254);
  g.lineBetween(128, 0, 128, 256);
  g.lineBetween(0, 128, 256, 128);
  for (let i = 0; i < 45; i++) {
    g.fillStyle(rng() > 0.5 ? 0xffffff : 0xff9ecb, 0.1 + rng() * 0.1);
    g.fillCircle(rng() * 256, rng() * 256, 1 + rng() * 1.5);
  }
  g.generateTexture('floor', 256, 256);
  g.destroy();
}

function deco(scene) {
  const cols = [0xff6b9d, 0x6bd6ff, 0xffe066, 0x9dff8a, 0xc59bff];
  cols.forEach((c, i) => {
    const g = gfx(scene);
    g.fillStyle(c).fillRoundedRect(0, 0, 18, 6, 3);
    g.generateTexture('sprk' + i, 18, 6);
    g.destroy();
  });
  [0xff6b9d, 0x6bd6ff, 0xffe066].forEach((c, i) => {
    const g = gfx(scene);
    g.fillStyle(c).fillCircle(8, 8, 8);
    g.fillStyle(0xffffff, 0.55).fillCircle(5.5, 5.5, 2.5);
    g.generateTexture('dcandy' + i, 16, 16);
    g.destroy();
  });
  let g = gfx(scene);
  g.fillStyle(0xff6b9d).fillCircle(24, 24, 24);
  g.fillStyle(0xffffff).fillCircle(24, 24, 18);
  g.fillStyle(0xff6b9d).fillCircle(24, 24, 12);
  g.fillStyle(0xffffff).fillCircle(24, 24, 6);
  g.generateTexture('swirl', 48, 48); g.destroy();

  g = gfx(scene);
  g.fillStyle(0x8a5a35).fillCircle(15, 15, 15);
  g.fillStyle(0x3d1f10).fillCircle(9, 10, 3).fillCircle(19, 8, 2.5).fillCircle(17, 19, 3).fillCircle(8, 20, 2);
  g.generateTexture('cookie', 30, 30); g.destroy();
}
