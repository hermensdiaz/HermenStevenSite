import { GAME_W, GAME_H, PLAYER, ENEMY, DEPTH } from '../config.js';
import { generateTextures } from '../systems/Textures.js';
import Sfx from '../systems/Sfx.js';
import Spawner from '../systems/Spawner.js';
import Player from '../entities/Player.js';
import { mulberry32, TEXT_FONT } from '../utils/helpers.js';

const CHUNK = 640;
const DECO_KEYS = ['sprk0', 'sprk1', 'sprk2', 'sprk3', 'sprk4', 'dcandy0', 'dcandy1', 'dcandy2', 'swirl', 'cookie'];

export default class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    generateTextures(this);
    const cam = this.cameras.main;

    // Estado de la partida
    this.over = false;
    this.now = 0;
    this.startTime = null;
    this.elapsed = 0;
    this.streak = 0;
    this.runBest = 0;
    this.kills = 0;
    this.best = this.loadBest();
    this.graveyard = [];
    this.chunks = new Map();
    this.sfx = new Sfx(this);

    // Suelo infinito: tileSprite fijo a la pantalla que se desplaza con la cámara
    this.floor = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'floor')
      .setOrigin(0).setScrollFactor(0).setDepth(DEPTH.FLOOR);

    this.enemies = this.add.group();
    this.playerBullets = this.physics.add.group();
    this.enemyShots = this.physics.add.group();
    this.hearts = this.physics.add.group();

    this.makeEmitters();
    this.player = new Player(this, 0, 0);
    this.spawner = new Spawner(this);

    cam.setBackgroundColor('#120a16');
    cam.centerOn(0, 0);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.fadeIn(400);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,Q,R,C,SPACE,SHIFT');
    this.cursors = this.input.keyboard.createCursorKeys();
    this.input.mouse.disableContextMenu();

    this.wireCollisions();
    this.updateChunks();
    this.spawner.initial();

    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.layoutAll, this);
    this.events.once('shutdown', () => {
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.layoutAll, this);
      this.scene.stop('UIScene');
    });

    this.scene.launch('UIScene');
  }

  /* ------------------------------------------------------------------ */
  makeEmitters() {
    const mk = (tex, cfg) => this.add.particles(0, 0, tex, { emitting: false, ...cfg }).setDepth(DEPTH.FX);
    this.fxChoc = mk('crumb', {
      lifespan: { min: 300, max: 750 }, speed: { min: 90, max: 360 }, scale: { start: 1.3, end: 0 },
      tint: [0x3d1f10, 0x6e3519, 0xa66a40, 0x25120a], rotate: { min: 0, max: 360 },
    });
    this.fxBerry = mk('crumb', {
      lifespan: { min: 300, max: 750 }, speed: { min: 90, max: 340 }, scale: { start: 1.3, end: 0 },
      tint: [0xff4f70, 0xff8fa6, 0xc41e44, 0xffe27a],
    });
    this.fxSpark = mk('spark', {
      lifespan: { min: 150, max: 350 }, speed: { min: 60, max: 260 }, scale: { start: 1.1, end: 0 },
      blendMode: 'ADD', tint: [0xffffff, 0xbfe6ff, 0xffe9a8],
    });
    this.fxTrail = mk('crumb', {
      lifespan: 260, speed: 0, scale: { start: 0.9, end: 0 }, tint: [0x7a3f1f, 0x59c3ff],
    });
  }

  wireCollisions() {
    const p = this.player;
    // Phaser puede entregar los argumentos en cualquier orden entre grupos: se identifican por contenido.
    const pick = (a, b, test) => (test(a) ? [a, b] : [b, a]);
    const isFighter = (o) => !!o.o;

    this.physics.add.collider(this.enemies, this.enemies);
    this.physics.add.collider(
      p, this.enemies,
      (a, b) => this.onContact(p, a === p ? b : a),
      () => !p.dashing,
      this,
    );

    this.physics.add.overlap(this.playerBullets, this.enemies, (a, b) => {
      const [e, bullet] = pick(a, b, isFighter);
      if (!bullet.active || !e.active || e.dead) return;
      const ang = bullet.rotation;
      bullet.disableBody(true, true);
      this.damageEnemy(e, PLAYER.bulletDmg, ang, 90);
    });

    this.physics.add.overlap(p, this.enemyShots, (a, b) => {
      const shot = a === p ? b : a;
      if (!shot.active || p.dashing) return;
      shot.disableBody(true, true);
      this.fxBerry.explode(8, shot.x, shot.y);
      p.takeHit(ENEMY.barrita.shotDmg, shot.x, shot.y);
    });

    this.physics.add.overlap(p, this.hearts, (a, b) => {
      const h = a === p ? b : a;
      if (!h.active) return;
      h.disableBody(true, true);
      p.hp = Math.min(p.maxHp, p.hp + 15);
      this.sfx.pickup();
      this.fxSpark.explode(10, h.x, h.y);
      this.popup(p.x, p.y - 50, '+15', '#6bff95', 22);
    });
  }

  /* ------------------------------------------------------------------ */
  update(time, delta) {
    this.now = time;
    if (this.startTime === null) this.startTime = time;
    this.elapsed = (time - this.startTime) / 1000;

    this.graveyard.forEach((g) => { if (g.scene) g.destroy(); });
    this.graveyard.length = 0;
    if (this.over) return;

    const cam = this.cameras.main;
    const ptr = this.input.activePointer;
    ptr.updateWorldPoint(cam);
    const k = this.keys, c = this.cursors, JD = Phaser.Input.Keyboard.JustDown;

    const inp = {
      left: k.A.isDown || c.left.isDown,
      right: k.D.isDown || c.right.isDown,
      up: k.W.isDown || c.up.isDown,
      down: k.S.isDown || c.down.isDown,
      fire: k.Q.isDown || ptr.leftButtonDown(),
      reload: JD(k.R),
      switch: JD(k.C),
      dash: JD(k.SHIFT) || JD(k.SPACE),
      px: ptr.worldX,
      py: ptr.worldY,
    };

    this.player.tick(time, delta, inp);
    this.enemies.getChildren().forEach((e) => { if (e.active && !e.dead) e.tick(time, delta, this.player); });
    this.spawner.update(time);
    this.updateProjectiles(time);
    this.updateHearts(time);
    this.updateChunks();

    // La cámara se adelanta un poco hacia donde apunta el mouse
    cam.setFollowOffset(-(ptr.x - GAME_W / 2) * 0.16, -(ptr.y - GAME_H / 2) * 0.16);
  }

  /** Corre después de la física: acomoda brazos, piernas, ojos... y el suelo. */
  layoutAll(time, delta) {
    this.player.layoutParts(time, delta);
    this.enemies.getChildren().forEach((e) => { if (e.active && !e.dead) e.layoutParts(time, delta); });
    const cam = this.cameras.main;
    this.floor.tilePositionX = cam.scrollX;
    this.floor.tilePositionY = cam.scrollY;
  }

  /* ------------------------------------------------------------------ */
  fireBullet(x, y, angle, time) {
    const b = this.playerBullets.create(x, y, 'bullet');
    b.setRotation(angle).setDepth(DEPTH.BULLET);
    b.body.setCircle(5, 3, 0);
    this.physics.velocityFromRotation(angle, PLAYER.bulletSpeed, b.body.velocity);
    b.expire = time + PLAYER.bulletLife;
  }

  fireEnemyShot(x, y, angle) {
    const s = this.enemyShots.create(x, y, 'jam');
    s.setDepth(DEPTH.BULLET);
    s.body.setCircle(7, 5, 5);
    this.physics.velocityFromRotation(angle, 300, s.body.velocity);
    s.expire = this.now + 2600;
    this.sfx.enemyShot();
  }

  updateProjectiles(time) {
    [...this.playerBullets.getChildren()].forEach((b) => {
      if (!b.active || time > b.expire) { b.destroy(); return; }
      if (((time / 16) | 0) % 2 === 0) this.fxTrail.emitParticleAt(b.x, b.y, 1);
    });
    [...this.enemyShots.getChildren()].forEach((s) => {
      if (!s.active) { s.destroy(); return; }
      if (time > s.expire) { this.fxBerry.explode(5, s.x, s.y); s.destroy(); }
    });
  }

  /* ------------------------------------------------------------------ */
  meleeHit(p, aim) {
    const range = PLAYER.batRange;
    let hit = 0;
    this.enemies.getChildren().slice().forEach((e) => {
      if (!e.active || e.dead) return;
      const dx = e.x - p.x, dy = e.y - p.y;
      if (Math.hypot(dx, dy) > range + e.o.radius) return;
      const ang = Math.atan2(dy, dx);
      if (Math.abs(Phaser.Math.Angle.Wrap(ang - aim)) > PLAYER.batArc) return;
      this.damageEnemy(e, PLAYER.batDmg, ang, 520);
      hit++;
    });
    // El bate también desvía la mermelada
    [...this.enemyShots.getChildren()].forEach((s) => {
      if (!s.active) return;
      const dx = s.x - p.x, dy = s.y - p.y;
      if (Math.hypot(dx, dy) > range + 20) return;
      if (Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - aim)) > PLAYER.batArc) return;
      this.fxSpark.explode(6, s.x, s.y);
      s.disableBody(true, true);
    });
    if (hit) this.cameras.main.shake(110, 0.006);
  }

  damageEnemy(e, dmg, ang, knock) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash();
    e.kickback(ang, knock);
    this.fxSpark.explode(4, e.x, e.y);
    this.sfx.hit();
    this.popup(e.x, e.y - e.vr - 8, '-' + dmg, dmg > 1 ? '#ffd166' : '#ffffff', dmg > 1 ? 22 : 15);
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e) {
    const fx = e.o.kind === 'barrita' ? this.fxBerry : this.fxChoc;
    fx.explode(26, e.x, e.y);
    this.fxSpark.explode(8, e.x, e.y);
    this.sfx.kill();
    this.streak++;
    this.kills++;
    if (this.streak > this.runBest) this.runBest = this.streak;
    if (this.streak > this.best) this.best = this.streak;
    if (Math.random() < 0.12) this.dropHeart(e.x, e.y);
    if (this.streak % 10 === 0) {
      const p = this.player;
      this.dropHeart(p.x + Phaser.Math.Between(-50, 50), p.y + Phaser.Math.Between(-50, 50));
      this.popup(p.x, p.y - 70, '¡RACHA x' + this.streak + '!', '#ffd166', 28);
    }
    this.cameras.main.shake(90, 0.004);
    this.removeEnemy(e);
  }

  removeEnemy(e) {
    e.dead = true;
    e.setActive(false);
    e.body.enable = false;
    e.hideAll();
    this.graveyard.push(e);
  }

  onContact(pl, en) {
    if (en.dead || this.now < en.nextHit) return;
    en.nextHit = this.now + 1000;
    en.attackAnim = this.now + 300;
    pl.takeHit(en.o.dmg, en.x, en.y);
  }

  onPlayerHurt() {
    this.streak = 0;
    this.cameras.main.shake(200, 0.012);
    this.cameras.main.flash(120, 255, 70, 70);
  }

  /* ------------------------------------------------------------------ */
  dropHeart(x, y) {
    const h = this.hearts.create(x, y, 'heart');
    h.setDepth(DEPTH.ACTOR - 10 + y);
    h.expire = this.now + 12000;
    this.tweens.add({ targets: h, scale: 1.25, duration: 450, yoyo: true, repeat: -1 });
  }

  updateHearts(time) {
    const p = this.player;
    [...this.hearts.getChildren()].forEach((h) => {
      if (!h.active) { h.destroy(); return; }
      if (time > h.expire) { h.destroy(); return; }
      if (h.expire - time < 3000) h.setAlpha(Math.floor(time / 120) % 2 ? 0.3 : 1);
      const d = Phaser.Math.Distance.Between(h.x, h.y, p.x, p.y);
      if (d < 150) this.physics.moveToObject(h, p, 280);
      else h.body.setVelocity(0, 0);
    });
  }

  /* ------------------------------------------------------------------ */
  /** Decoración infinita generada por "chunks" deterministas alrededor del jugador. */
  updateChunks() {
    const p = this.player;
    const cx = Math.floor(p.x / CHUNK), cy = Math.floor(p.y / CHUNK);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const key = (cx + dx) + ',' + (cy + dy);
        if (!this.chunks.has(key)) this.chunks.set(key, this.createChunk(cx + dx, cy + dy));
      }
    }
    for (const [key, items] of this.chunks) {
      const [x, y] = key.split(',').map(Number);
      if (Math.abs(x - cx) > 3 || Math.abs(y - cy) > 3) {
        items.forEach((i) => i.destroy());
        this.chunks.delete(key);
      }
    }
  }

  createChunk(cx, cy) {
    const rng = mulberry32(((cx * 73856093) ^ (cy * 19349663)) >>> 0);
    const n = 7 + Math.floor(rng() * 6);
    const items = [];
    for (let i = 0; i < n; i++) {
      const key = DECO_KEYS[Math.floor(rng() * DECO_KEYS.length)];
      const im = this.add.image(cx * CHUNK + rng() * CHUNK, cy * CHUNK + rng() * CHUNK, key)
        .setDepth(DEPTH.DECO)
        .setRotation(rng() * 6.28)
        .setAlpha(0.45 + rng() * 0.4)
        .setScale(0.8 + rng() * 0.9);
      items.push(im);
    }
    return items;
  }

  popup(x, y, str, color = '#ffffff', size = 16) {
    const t = this.add.text(x, y, str, {
      fontFamily: TEXT_FONT, fontSize: size + 'px', color, fontStyle: 'bold',
      stroke: '#1a0b12', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(DEPTH.FX + 1);
    this.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /* ------------------------------------------------------------------ */
  gameOver() {
    if (this.over) return;
    this.over = true;
    const p = this.player;
    p.dead = true;
    p.hideAll();
    p.body.enable = false;
    this.fxChoc.explode(70, p.x, p.y);
    this.fxSpark.explode(28, p.x, p.y);
    this.sfx.gameOver();
    this.cameras.main.shake(500, 0.02);
    this.enemies.getChildren().forEach((e) => { if (e.body) e.body.setVelocity(0, 0); });
    this.playerBullets.clear(true, true);
    this.enemyShots.clear(true, true);
    this.saveBest();

    const stats = { kills: this.kills, runBest: this.runBest, best: this.best, time: this.elapsed };
    this.time.delayedCall(1300, () => this.cameras.main.fadeOut(500, 0, 0, 0));
    this.time.delayedCall(1850, () => this.scene.start('GameOverScene', stats));
  }

  loadBest() {
    try { return parseInt(localStorage.getItem('mamut_best_streak'), 10) || 0; } catch (e) { return 0; }
  }

  saveBest() {
    try { localStorage.setItem('mamut_best_streak', String(this.best)); } catch (e) { /* sin almacenamiento */ }
  }
}
