import { GAME_W, GAME_H, PLAYER } from '../config.js';
import { textStyle, formatTime } from '../utils/helpers.js';

const TIERS = [
  [35, '¡DIOS DEL CACAO!', '#ff4d6d'],
  [20, '¡LEYENDA DULCE!', '#ff7a3d'],
  [10, '¡IMPARABLE!', '#ffb13d'],
  [5, '¡EN LLAMAS!', '#ffd166'],
];

/** HUD: vida, munición, arma activa, racha, esquiva y radar. Corre en paralelo a GameScene. */
export default class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  create() {
    this.gs = this.scene.get('GameScene');
    this.g = this.add.graphics();
    this.lastStreak = 0;

    // Vida
    this.add.image(36, 38, 'heart').setScale(1.4);
    this.hpText = this.add.text(70 + 140, 39, '', textStyle(15)).setOrigin(0.5);
    this.add.text(70, 66, 'ESQUIVA [SHIFT]', textStyle(11, '#9fd8ff', { strokeThickness: 3 }));

    // Munición
    this.ammoText = this.add.text(34, 624, '', textStyle(44, '#fff1c9'));
    this.reloadText = this.add.text(34, 600, '', textStyle(16, '#9fd8ff'));
    this.ammoIcons = [];
    for (let i = 0; i < PLAYER.mag; i++) {
      this.ammoIcons.push(this.add.image(44 + i * 21, 696, 'bullet').setScale(1.2));
    }
    this.add.text(34, 560, 'RECARGAR [R]', textStyle(12, '#ffffff', { strokeThickness: 3 })).setAlpha(0.7);

    // Armas
    this.slotGun = this.add.image(1130, 650, 'gun').setScale(1.5);
    this.slotBat = this.add.image(1210, 650, 'bat').setScale(0.75).setRotation(-0.4);
    this.add.text(1130, 692, 'Q / CLIC', textStyle(11, '#ffffff', { strokeThickness: 3 })).setOrigin(0.5);
    this.add.text(1210, 692, 'C = cambiar', textStyle(11, '#ffffff', { strokeThickness: 3 })).setOrigin(0.5);

    // Racha
    this.streakLabel = this.add.text(GAME_W / 2, 12, 'RACHA', textStyle(18, '#ffd166')).setOrigin(0.5, 0);
    this.streakNum = this.add.text(GAME_W / 2, 66, '0', textStyle(64, '#ffffff', { strokeThickness: 8 })).setOrigin(0.5);
    this.streakTier = this.add.text(GAME_W / 2, 112, '', textStyle(20, '#ffd166')).setOrigin(0.5, 0);
    this.subText = this.add.text(GAME_W / 2, 140, '', textStyle(14, '#d9c7ff', { strokeThickness: 3 })).setOrigin(0.5, 0);
    this.lostText = this.add.text(GAME_W / 2, 190, '', textStyle(22, '#ff6b6b')).setOrigin(0.5).setAlpha(0);

    this.emptyText = this.add.text(GAME_W / 2, 590, 'SIN BALAS · RECARGA CON [R]', textStyle(26, '#ff6b6b')).setOrigin(0.5).setVisible(false);

    // Radar
    this.timeText = this.add.text(1180, 196, '', textStyle(16, '#ffffff')).setOrigin(0.5);

    this.hint = this.add.text(GAME_W / 2, GAME_H - 14, 'WASD mover · Q / clic disparar · R recargar · C bate · SHIFT esquivar', textStyle(13, '#ffffff', { strokeThickness: 3 }))
      .setOrigin(0.5).setAlpha(0.85);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 12000, duration: 1500 });
  }

  update(time) {
    const gs = this.gs, p = gs.player;
    if (!p) return;
    const g = this.g;
    g.clear();

    /* Vida */
    const pct = Phaser.Math.Clamp(p.hp / p.maxHp, 0, 1);
    const col = pct > 0.5 ? 0x4cd964 : pct > 0.25 ? 0xffcc00 : 0xff3b30;
    g.fillStyle(0x000000, 0.6).fillRoundedRect(66, 24, 288, 30, 8);
    g.fillStyle(col, pct < 0.25 && Math.floor(time / 200) % 2 ? 0.55 : 1).fillRoundedRect(70, 28, 280 * pct, 22, 6);
    g.lineStyle(2, 0xffffff, 0.5).strokeRoundedRect(66, 24, 288, 30, 8);
    this.hpText.setText(Math.ceil(p.hp) + ' / ' + p.maxHp);

    /* Esquiva */
    g.fillStyle(0x000000, 0.5).fillRect(70, 80, 140, 8);
    g.fillStyle(p.dashPct >= 1 ? 0x59c3ff : 0x2a5f80).fillRect(71, 81, 138 * p.dashPct, 6);

    /* Munición */
    this.ammoText.setText(p.ammo + ' / ' + PLAYER.mag);
    this.ammoText.setColor(p.ammo === 0 ? '#ff6b6b' : '#fff1c9');
    this.ammoIcons.forEach((ic, i) => ic.setAlpha(i < p.ammo ? 1 : 0.18));
    if (p.reloading) {
      this.reloadText.setText('RECARGANDO...');
      g.fillStyle(0x000000, 0.6).fillRect(34, 676, 260, 6);
      g.fillStyle(0x59c3ff).fillRect(35, 677, 258 * p.reloadPct, 4);
    } else this.reloadText.setText('');
    this.emptyText.setVisible(p.ammo === 0 && !p.reloading && p.mode === 'gun' && Math.floor(time / 250) % 2 === 0);

    /* Armas */
    const slot = (x, on) => {
      g.fillStyle(0x000000, 0.45).fillRoundedRect(x - 36, 618, 72, 56, 10);
      g.lineStyle(3, on ? 0x59c3ff : 0x55455f, on ? 1 : 0.7).strokeRoundedRect(x - 36, 618, 72, 56, 10);
    };
    slot(1130, p.mode === 'gun');
    slot(1210, p.mode === 'bat');
    this.slotGun.setAlpha(p.mode === 'gun' ? 1 : 0.4);
    this.slotBat.setAlpha(p.mode === 'bat' ? 1 : 0.4);

    /* Racha */
    const st = gs.streak;
    if (st > this.lastStreak) {
      this.tweens.add({ targets: this.streakNum, scale: { from: 1.6, to: 1 }, duration: 200, ease: 'Back.easeOut' });
    } else if (st === 0 && this.lastStreak >= 3) {
      this.lostText.setText('¡RACHA PERDIDA! (' + this.lastStreak + ')').setAlpha(1).setY(190);
      this.tweens.add({ targets: this.lostText, alpha: 0, y: 170, duration: 1100, delay: 300 });
    }
    this.lastStreak = st;

    const tier = TIERS.find((t) => st >= t[0]);
    this.streakNum.setText(String(st)).setColor(tier ? tier[2] : '#ffffff');
    this.streakTier.setText(tier ? tier[1] : '').setColor(tier ? tier[2] : '#ffffff');
    this.subText.setText('Récord: ' + gs.best + '   ·   Bajas: ' + gs.kills);

    /* Radar */
    const cx = 1180, cy = 104, R = 76, range = 1100, k = R / range;
    g.fillStyle(0x000000, 0.45).fillCircle(cx, cy, R);
    g.lineStyle(2, 0x59c3ff, 0.85).strokeCircle(cx, cy, R);
    g.lineStyle(1, 0x59c3ff, 0.3).strokeCircle(cx, cy, R / 2);
    g.lineStyle(1, 0xffffff, 0.35).strokeRect(cx - (GAME_W * k) / 2, cy - (GAME_H * k) / 2, GAME_W * k, GAME_H * k);
    gs.enemies.getChildren().forEach((e) => {
      if (!e.active || e.dead) return;
      let dx = (e.x - p.x) * k, dy = (e.y - p.y) * k;
      const d = Math.hypot(dx, dy);
      let a = 1;
      if (d > R - 4) { dx = (dx / d) * (R - 4); dy = (dy / d) * (R - 4); a = 0.5; }
      g.fillStyle(e.o.kind === 'barrita' ? 0xff8fa6 : 0xff3b3b, a).fillCircle(cx + dx, cy + dy, e.o.kind === 'barrita' ? 2.5 : 3.5);
    });
    g.fillStyle(0x59c3ff).fillCircle(cx, cy, 4);
    this.timeText.setText('Tiempo ' + formatTime(gs.elapsed));
  }
}
