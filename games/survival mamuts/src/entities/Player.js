import Fighter from './Fighter.js';
import { PLAYER, DEPTH } from '../config.js';

export default class Player extends Fighter {
  constructor(scene, x, y) {
    super(scene, x, y, {
      body: 'body_player', radius: 26, vr: 32, hp: PLAYER.maxHp,
      aura: 'aura_blue', auraScale: 0.95, limb: 'p', eye: 'eye',
      weapons: true, holding: 'gun',
    });
    this.body.setMass(3);
    this.mode = 'gun';
    this.ammo = PLAYER.mag;
    this.reloading = false;
    this.reloadStart = 0;
    this.reloadEnd = 0;
    this.reloadPct = 0;
    this.nextFire = 0;
    this.nextSwing = 0;
    this.dashUntil = 0;
    this.dashReady = 0;
    this.dashPct = 1;
    this.dashing = false;
    this.dashDir = new Phaser.Math.Vector2(1, 0);
    this.invulnUntil = 0;
    this.ghostAt = 0;
  }

  get sfx() { return this.scene.sfx; }

  tick(time, delta, inp) {
    if (this.dead) return;

    this.aim = Math.atan2(inp.py - this.y, inp.px - this.x);

    if (inp.switch) this.toggleMode();
    if (inp.reload) this.startReload(time);
    if (this.reloading) {
      this.reloadPct = Phaser.Math.Clamp((time - this.reloadStart) / PLAYER.reloadMs, 0, 1);
      if (time >= this.reloadEnd) {
        this.reloading = false;
        this.ammo = PLAYER.mag;
        this.sfx.reloadDone();
      }
    }
    this.dashPct = Phaser.Math.Clamp(1 - (this.dashReady - time) / PLAYER.dashCd, 0, 1);

    // Movimiento
    let mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    let my = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
    const len = Math.hypot(mx, my);
    if (len) { mx /= len; my /= len; }

    if (inp.dash && time >= this.dashReady) {
      this.dashDir.set(len ? mx : Math.cos(this.aim), len ? my : Math.sin(this.aim));
      this.dashUntil = time + PLAYER.dashMs;
      this.dashReady = time + PLAYER.dashCd;
      this.sfx.dash();
    }
    this.dashing = time < this.dashUntil;

    if (this.dashing) {
      this.body.setVelocity(this.dashDir.x * PLAYER.dashSpeed, this.dashDir.y * PLAYER.dashSpeed);
      if (time >= this.ghostAt) {
        this.ghostAt = time + 30;
        const gh = this.scene.add.image(this.x, this.y, 'body_player')
          .setAlpha(0.55).setTint(0x7fc8ff).setDepth(DEPTH.ACTOR + this.y - 5);
        this.scene.tweens.add({ targets: gh, alpha: 0, scale: 1.2, duration: 260, onComplete: () => gh.destroy() });
      }
    } else if (time < this.knockUntil) {
      this.body.velocity.scale(0.9);
    } else {
      const t = PLAYER.accel, sp = PLAYER.speed;
      this.body.setVelocity(
        this.body.velocity.x + (mx * sp - this.body.velocity.x) * t,
        this.body.velocity.y + (my * sp - this.body.velocity.y) * t,
      );
    }

    // Ataque
    if (inp.fire) {
      if (this.mode === 'gun' && time >= this.nextFire) this.shoot(time);
      else if (this.mode === 'bat' && time >= this.nextSwing) this.swingBat(time);
    }

    // Parpadeo al recibir daño
    if (time < this.invulnUntil) this.setLimbAlpha(Math.floor(time / 60) % 2 ? 0.4 : 1);
    else this.setLimbAlpha(1);
  }

  toggleMode() {
    this.mode = this.mode === 'gun' ? 'bat' : 'gun';
    this.holding = this.mode;
    this.scene.sfx.pickup();
  }

  startReload(time) {
    if (this.reloading || this.ammo === PLAYER.mag) return;
    this.reloading = true;
    this.reloadStart = time;
    this.reloadEnd = time + PLAYER.reloadMs;
    this.sfx.reload();
  }

  shoot(time) {
    if (this.reloading) return;
    if (this.ammo <= 0) { this.nextFire = time + 220; this.sfx.empty(); return; }
    const sc = this.scene;
    this.ammo--;
    this.nextFire = time + PLAYER.fireDelay;
    this.recoil = 9;
    const a = this.aim + Phaser.Math.FloatBetween(-0.025, 0.025);
    const mx = this.x + Math.cos(this.aim) * (this.vr + 30);
    const my = this.y + Math.sin(this.aim) * (this.vr + 30);
    sc.fireBullet(mx, my, a, time);
    sc.fxSpark.explode(5, mx, my);
    this.sfx.shoot();
    sc.cameras.main.shake(50, 0.0018);
    this.body.velocity.x -= Math.cos(this.aim) * 40;
    this.body.velocity.y -= Math.sin(this.aim) * 40;
  }

  swingBat(time) {
    const sc = this.scene;
    this.nextSwing = time + PLAYER.batDelay;
    this.batAngle = 1.4;
    sc.tweens.add({
      targets: this, batAngle: -1.3, duration: 110, ease: 'Cubic.easeOut',
      onComplete: () => {
        if (this.scene) sc.tweens.add({ targets: this, batAngle: 0.6, duration: 220, ease: 'Sine.easeInOut' });
      },
    });
    const sl = sc.add.image(this.x, this.y, 'slash').setRotation(this.aim).setTint(0xcfe9ff)
      .setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.FX).setAlpha(0.95).setScale(0.75);
    sc.tweens.add({ targets: sl, scale: 1.1, alpha: 0, duration: 170, onComplete: () => sl.destroy() });
    this.sfx.swing();
    this.body.velocity.x += Math.cos(this.aim) * 200;
    this.body.velocity.y += Math.sin(this.aim) * 200;
    const aim = this.aim;
    sc.time.delayedCall(70, () => { if (!this.dead && this.scene) sc.meleeHit(this, aim); });
  }

  takeHit(dmg, sx, sy) {
    const sc = this.scene, t = sc.now;
    if (this.dead || this.dashing || t < this.invulnUntil) return false;
    this.hp = Math.max(0, this.hp - dmg);
    this.invulnUntil = t + 700;
    this.kickback(Math.atan2(this.y - sy, this.x - sx), 380);
    this.flash(100);
    this.sfx.hurt();
    sc.onPlayerHurt(dmg);
    if (this.hp <= 0) sc.gameOver();
    return true;
  }
}
