import { GAME_W, GAME_H } from '../config.js';
import { textStyle, formatTime } from '../utils/helpers.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }

  init(data) { this.stats = data || {}; }

  create() {
    const s = this.stats;
    this.floor = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'floor').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1a0008, 0.55).setOrigin(0);

    const t = this.add.text(GAME_W / 2, 150, '¡TE DERRETISTE!', textStyle(92, '#ff6b81', { strokeThickness: 12 })).setOrigin(0.5);
    this.tweens.add({ targets: t, scale: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const lines = [
      `Bajas: ${s.kills || 0}`,
      `Mejor racha de esta partida: ${s.runBest || 0}`,
      `Récord de racha: ${s.best || 0}`,
      `Tiempo sobrevivido: ${formatTime(s.time || 0)}`,
    ];
    this.add.text(GAME_W / 2, 330, lines.join('\n'), textStyle(32, '#fff1c9', { align: 'center', lineSpacing: 14 })).setOrigin(0.5);

    const retry = this.add.text(GAME_W / 2, 540, 'REINTENTAR (ENTER / clic)', textStyle(30, '#ffd166')).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const menu = this.add.text(GAME_W / 2, 600, 'Menú principal (ESC)', textStyle(20, '#9fd8ff')).setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: retry, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });

    const again = () => this.scene.start('GameScene');
    const toMenu = () => this.scene.start('Start');
    retry.on('pointerdown', again);
    menu.on('pointerdown', toMenu);
    this.input.keyboard.once('keydown-ENTER', again);
    this.input.keyboard.once('keydown-SPACE', again);
    this.input.keyboard.once('keydown-ESC', toMenu);
    this.cameras.main.fadeIn(400);
  }

  update(time, delta) {
    this.floor.tilePositionX += delta * 0.01;
  }
}
