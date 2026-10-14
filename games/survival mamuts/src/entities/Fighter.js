import { DEPTH } from '../config.js';

/**
 * Personaje base (vista cenital): cuerpo con física + aura + piernas + brazos + ojos (+ cejas, arma).
 * Todas las partes se reposicionan cada frame según hacia dónde apunta el personaje (this.aim).
 */
export default class Fighter extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, o) {
    super(scene, x, y, o.body);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.o = o;
    this.vr = o.vr;
    this.hp = this.maxHp = o.hp;
    this.aim = 0;
    this.walk = Math.random() * 6;
    this.recoil = 0;
    this.lunge = 0;
    this.batAngle = 0.6;
    this.auraBoost = 1;
    this.auraPhase = Math.random() * 6.28;
    this.holding = o.holding || 'none';
    this.dead = false;
    this.knockUntil = 0;
    this.armLoc = { rf: 0, rs: o.vr * 0.95, lf: 0, ls: -o.vr * 0.95 };

    const r = o.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);

    const ls = o.limbScale || 1;
    const es = o.eyeScale || 1;
    const mk = (key, s = 1) => scene.add.image(x, y, key).setScale(s);

    this.aura = mk(o.aura, o.auraScale).setBlendMode(Phaser.BlendModes.ADD);
    this.legL = mk('leg_' + o.limb, ls);
    this.legR = mk('leg_' + o.limb, ls);
    this.armL = mk('arm_' + o.limb, ls);
    this.armR = mk('arm_' + o.limb, ls);
    this.eyeL = mk(o.eye, es);
    this.eyeR = mk(o.eye, es);
    if (o.brow) {
      this.browL = mk('brow', es);
      this.browR = mk('brow', es);
    }
    if (o.weapons) {
      this.gun = mk('gun').setOrigin(0.2, 0.5);
      this.bat = mk('bat').setOrigin(0.06, 0.5);
    }
    this.hpGfx = o.hpBar ? scene.add.graphics() : null;

    this.limbs = [this.legL, this.legR, this.armL, this.armR, this.eyeL, this.eyeR,
      this.browL, this.browR, this.gun, this.bat].filter(Boolean);
  }

  /** Reposiciona todas las partes. Se llama desde GameScene en POST_UPDATE (después de la física). */
  layoutParts(time, delta = 0) {
    if (this.dead || !this.scene) return;
    const o = this.o, vr = this.vr;
    const a = this.aim, c = Math.cos(a), s = Math.sin(a);
    const x = this.x, y = this.y;
    const d = DEPTH.ACTOR + y;

    const spd = this.body.speed;
    this.walk += spd * delta * 0.0011;
    const sw = Math.sin(this.walk) * Math.min(1, spd / 90);

    // f = hacia adelante, sd = hacia el costado derecho
    const pos = (img, f, sd, depth, rot) => {
      img.x = x + c * f - s * sd;
      img.y = y + s * f + c * sd;
      img.setDepth(depth);
      if (rot !== undefined) img.rotation = rot;
    };

    this.setDepth(d);
    if (o.rotateBody) this.rotation = a;

    // Aura pulsante
    this.aura.setPosition(x, y).setDepth(d - 3);
    const pulse = 1 + 0.07 * Math.sin(time / 200 + this.auraPhase);
    this.aura.setScale(o.auraScale * pulse * this.auraBoost);
    this.aura.setAlpha(0.8 + 0.15 * Math.sin(time / 260 + this.auraPhase));

    // Piernas (asoman por delante del cuerpo y caminan)
    const lf = vr * 0.72;
    pos(this.legR, lf + sw * vr * 0.28, vr * 0.45, d - 1, a);
    pos(this.legL, lf - sw * vr * 0.28, -vr * 0.45, d - 1, a);

    // Brazos según lo que sostienen
    let tr, tl;
    if (this.holding === 'gun') {
      tr = { f: vr * 0.9 - this.recoil * 0.6, s: vr * 0.22 };
      tl = { f: vr * 1.0 - this.recoil * 0.6, s: -vr * 0.12 };
    } else if (this.holding === 'bat') {
      tr = { f: vr * 0.75, s: vr * 0.7 };
      tl = { f: vr * 0.2 - sw * vr * 0.2, s: -vr * 0.95 };
    } else {
      const L = this.lunge;
      tr = { f: vr * 0.1 - sw * vr * 0.25 + L * vr * 0.85, s: vr * (0.95 - L * 0.4) };
      tl = { f: vr * 0.1 + sw * vr * 0.25 + L * vr * 0.85, s: -vr * (0.95 - L * 0.4) };
    }
    const k = 0.35, A = this.armLoc;
    A.rf += (tr.f - A.rf) * k; A.rs += (tr.s - A.rs) * k;
    A.lf += (tl.f - A.lf) * k; A.ls += (tl.s - A.ls) * k;
    pos(this.armR, A.rf, A.rs, d + 1, a);
    pos(this.armL, A.lf, A.ls, d + 1, a);

    // Cara
    pos(this.eyeR, vr * 0.42, vr * 0.3, d + 3, a);
    pos(this.eyeL, vr * 0.42, -vr * 0.3, d + 3, a);
    if (this.browR) {
      pos(this.browR, vr * 0.62, vr * 0.3, d + 4, a + Math.PI / 2 - 0.45);
      pos(this.browL, vr * 0.62, -vr * 0.3, d + 4, a + Math.PI / 2 + 0.45);
    }

    // Armas
    if (this.gun) {
      this.gun.setVisible(this.holding === 'gun');
      this.bat.setVisible(this.holding === 'bat');
      pos(this.gun, vr * 0.95 - this.recoil, vr * 0.1, d + 2, a);
      pos(this.bat, A.rf, A.rs, d + 2, a + this.batAngle);
    }
    this.recoil *= 0.85;

    // Barra de vida
    if (this.hpGfx) {
      const g = this.hpGfx;
      g.clear();
      if (this.hp < this.maxHp) {
        g.setDepth(d + 20);
        g.fillStyle(0x000000, 0.65).fillRect(x - 23, y - vr - 22, 46, 7);
        g.fillStyle(0xff4d4d).fillRect(x - 21, y - vr - 20, 42 * Math.max(0, this.hp / this.maxHp), 3);
      }
    }
  }

  setLimbAlpha(a) {
    this.setAlpha(a);
    this.limbs.forEach((l) => l.setAlpha(a));
  }

  flash(ms = 90) {
    const imgs = [this, ...this.limbs];
    imgs.forEach((i) => i.setTintFill(0xffffff));
    this.scene.time.delayedCall(ms, () => {
      imgs.forEach((i) => { if (i.scene) i.clearTint(); });
    });
  }

  kickback(angle, force) {
    this.body.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
    this.knockUntil = this.scene.now + 190;
  }

  hideAll() {
    [this, this.aura, ...this.limbs].forEach((p) => p.setVisible(false));
    if (this.hpGfx) this.hpGfx.clear();
  }

  destroy(fromScene) {
    [this.aura, ...(this.limbs || []), this.hpGfx].forEach((p) => { if (p && p.scene) p.destroy(); });
    super.destroy(fromScene);
  }
}
