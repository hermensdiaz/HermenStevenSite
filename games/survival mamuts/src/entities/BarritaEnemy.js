import Fighter from './Fighter.js';
import { ENEMY } from '../config.js';

/** Barrita de fresa: mantiene distancia, rodea al jugador y dispara mermelada. */
export default class BarritaEnemy extends Fighter {
  constructor(scene, x, y, diff = 0) {
    const c = ENEMY.barrita;
    super(scene, x, y, {
      body: 'body_bar', radius: c.radius, vr: c.vr, hp: c.hp + Math.floor(diff / 2),
      aura: 'aura_red', auraScale: 0.85, limb: 'b', eye: 'eye_evil', brow: true,
      eyeScale: 0.8, limbScale: 0.8, rotateBody: true, hpBar: true, dmg: c.dmg, kind: 'barrita',
    });
    this.speed = c.speed * (1 + Math.min(0.4, diff * 0.06)) * Phaser.Math.FloatBetween(0.9, 1.1);
    this.strafeDir = Math.random() < 0.5 ? 1 : -1;
    this.strafeFlip = scene.now + Phaser.Math.Between(1000, 2500);
    this.nextShot = scene.now + Phaser.Math.Between(900, 2200);
    this.chargeEnd = 0;
    this.charging = false;
    this.nextHit = 0;
    this.attackAnim = 0;
    this.aim = Phaser.Math.FloatBetween(-3, 3);
  }

  tick(time, delta, player) {
    if (this.dead) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);
    this.aim = Phaser.Math.Angle.RotateTo(this.aim, ang, 0.14);

    let target = (time < this.attackAnim) ? 1 : 0;
    if (this.charging) target = 0.8;
    this.lunge += (target - this.lunge) * 0.25;
    this.auraBoost = this.charging ? 1.4 : 1;

    if (time < this.knockUntil) { this.body.velocity.scale(0.93); return; }

    if (time > this.strafeFlip) {
      this.strafeDir *= -1;
      this.strafeFlip = time + Phaser.Math.Between(1200, 2600);
    }

    const nx = dx / dist, ny = dy / dist;
    let vx, vy;
    if (dist > 330) { vx = nx * this.speed; vy = ny * this.speed; }
    else if (dist < 210) { vx = -nx * this.speed; vy = -ny * this.speed; }
    else { vx = -ny * this.speed * 0.8 * this.strafeDir; vy = nx * this.speed * 0.8 * this.strafeDir; }
    this.body.setVelocity(vx, vy);

    if (!this.charging && time >= this.nextShot && dist < 560) {
      this.charging = true;
      this.chargeEnd = time + 350;
    }
    if (this.charging && time >= this.chargeEnd) {
      this.charging = false;
      this.nextShot = time + Phaser.Math.Between(2000, 3400);
      this.scene.fireEnemyShot(
        this.x + Math.cos(this.aim) * 30, this.y + Math.sin(this.aim) * 30, this.aim,
      );
    }
  }
}
