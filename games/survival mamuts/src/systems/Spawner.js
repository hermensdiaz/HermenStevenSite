import MamutEnemy from '../entities/MamutEnemy.js';
import BarritaEnemy from '../entities/BarritaEnemy.js';
import { GAME_W, GAME_H } from '../config.js';

/** Genera enemigos aleatoriamente SIEMPRE fuera del área que ve la cámara. Nivel infinito. */
export default class Spawner {
  constructor(scene) {
    this.scene = scene;
    this.next = 0;
  }

  initial() {
    for (let i = 0; i < 7; i++) this.spawn(i % 3 === 2 ? 'barrita' : 'mamut', 0);
  }

  /** Punto aleatorio fuera de la vista (con margen) alrededor del jugador. */
  outsidePoint() {
    const p = this.scene.player;
    const left = p.x - GAME_W / 2, right = p.x + GAME_W / 2;
    const top = p.y - GAME_H / 2, bottom = p.y + GAME_H / 2;
    const m = Phaser.Math.Between(150, 330);
    switch (Phaser.Math.Between(0, 3)) {
      case 0: return { x: Phaser.Math.Between(left - m, right + m), y: top - m };
      case 1: return { x: Phaser.Math.Between(left - m, right + m), y: bottom + m };
      case 2: return { x: left - m, y: Phaser.Math.Between(top - m, bottom + m) };
      default: return { x: right + m, y: Phaser.Math.Between(top - m, bottom + m) };
    }
  }

  spawn(kind, diff) {
    const pt = this.outsidePoint();
    const E = kind === 'barrita' ? BarritaEnemy : MamutEnemy;
    const e = new E(this.scene, pt.x, pt.y, diff);
    this.scene.enemies.add(e);
    return e;
  }

  update(time) {
    const s = this.scene;
    const t = (time - s.startTime) / 1000;
    const diff = t / 60;
    const cap = Math.min(48, 8 + Math.floor(t / 7));
    const interval = Math.max(320, 1300 - t * 9);

    // Los que quedan muy lejos se reciclan (se vuelven a generar cerca, fuera de cámara)
    const p = s.player;
    s.enemies.getChildren().forEach((e) => {
      if (e.active && !e.dead && Phaser.Math.Distance.Between(e.x, e.y, p.x, p.y) > 1500) s.removeEnemy(e);
    });

    if (time < this.next) return;
    if (s.enemies.countActive() >= cap) { this.next = time + 300; return; }

    const barritaChance = 0.3 + Math.min(0.25, t / 400);
    const n = (t > 40 && Math.random() < 0.3) ? 2 : 1;
    for (let i = 0; i < n; i++) this.spawn(Math.random() < barritaChance ? 'barrita' : 'mamut', diff);
    this.next = time + interval * Phaser.Math.FloatBetween(0.6, 1.2);
  }
}
