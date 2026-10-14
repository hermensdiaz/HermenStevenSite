import Fighter from './Fighter.js';
import { ENEMY } from '../config.js';

/** Mamut malvado: persigue y se lanza en embestida. */
export default class MamutEnemy extends Fighter {
  constructor(scene, x, y, diff = 0) {
    const c = ENEMY.mamut;
    super(scene, x, y, {
      body: 'body_evil', radius: c.radius, vr: c.vr, hp: c.hp + Math.floor(diff / 1.5),
      aura: 'aura_red', auraScale: 1.05, limb: 'e', eye: 'eye_evil', brow: true, eyeScale: 1.1,
      hpBar: true, dmg: c.dmg, kind: 'mamut',
    });
    this.speed = c.speed * (1 + Math.min(0.45, diff * 0.07)) * Phaser.Math.FloatBetween(0.9, 1.1);
    this.state = 'chase';
    this.stateEnd = 0;
    this.nextLunge = scene.now + Phaser.Math.Between(1500, 3500);
    this.nextHit = 0;
    this.attackAnim = 0;
    this.aim = Phaser.Math.FloatBetween(-3, 3);
  }

  tick(time, delta, player) {
    if (this.dead) return;
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy) || 1;
    const ang = Math.atan2(dy, dx);

    let target = 0;
    if (time < this.attackAnim || this.state === 'lunge') target = 1;
    if (this.state === 'windup') target = 0.8;
    this.lunge += (target - this.lunge) * 0.25;
    this.auraBoost = this.state === 'windup' ? 1.35 : 1;

    if (this.state !== 'lunge') this.aim = Phaser.Math.Angle.RotateTo(this.aim, ang, 0.1);

    if (time < this.knockUntil) { this.body.velocity.scale(0.93); return; }

    switch (this.state) {
      case 'chase':
        this.body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
        if (dist < 270 && dist > 110 && time > this.nextLunge) {
          this.state = 'windup';
          this.stateEnd = time + 380;
        }
        break;
      case 'windup':
        this.body.velocity.scale(0.8);
        if (time >= this.stateEnd) {
          this.state = 'lunge';
          this.stateEnd = time + 300;
          this.aim = ang;
          this.body.setVelocity(Math.cos(ang) * this.speed * 3.6, Math.sin(ang) * this.speed * 3.6);
        }
        break;
      case 'lunge':
        if (time >= this.stateEnd) {
          this.state = 'chase';
          this.nextLunge = time + Phaser.Math.Between(2500, 4500);
        }
        break;
    }
  }
}
