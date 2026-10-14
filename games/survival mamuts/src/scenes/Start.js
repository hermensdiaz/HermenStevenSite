import { GAME_W, GAME_H } from '../config.js';
import { generateTextures } from '../systems/Textures.js';
import { textStyle } from '../utils/helpers.js';

export default class Start extends Phaser.Scene {
  constructor() { super('Start'); }

  preload() {
    const w = 400;
    this.add.rectangle(GAME_W / 2, GAME_H / 2, w, 18, 0x2b1a33).setStrokeStyle(2, 0xffffff);
    const bar = this.add.rectangle(GAME_W / 2 - w / 2 + 2, GAME_H / 2, 0, 12, 0x59c3ff).setOrigin(0, 0.5);
    this.load.on('progress', (v) => { bar.width = (w - 4) * v; });
    this.load.on('loaderror', (f) => console.warn('No se pudo cargar', f.key, '- se usará un respaldo procedural.'));
    this.load.image('mamut', 'assets/images/mamut.png');
  }

  create() {
    generateTextures(this);
    this.children.removeAll(true);

    this.floor = this.add.tileSprite(0, 0, GAME_W, GAME_H, 'floor').setOrigin(0);
    this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.35).setOrigin(0);

    this.preview(330, 470, { body: 'body_player', aura: 'aura_blue', limb: 'p', eye: 'eye', vr: 32, aS: 0.95, scale: 2.1, flip: false, gun: true });
    this.preview(950, 470, { body: 'body_evil', aura: 'aura_red', limb: 'e', eye: 'eye_evil', vr: 36, aS: 1.05, scale: 2.1, flip: true, brow: true });
    this.preview(1130, 540, { body: 'body_bar', aura: 'aura_red', limb: 'b', eye: 'eye_evil', vr: 24, aS: 0.85, scale: 1.7, flip: true, brow: true, bar: true });

    const title = this.add.text(GAME_W / 2, 120, 'MAMUT', textStyle(120, '#fff1c9', { strokeThickness: 14, stroke: '#3d1f10' }))
      .setOrigin(0.5).setShadow(0, 8, '#000000', 10, true, true);
    this.add.text(GAME_W / 2, 215, 'DULCE APOCALIPSIS', textStyle(38, '#59c3ff', { strokeThickness: 7 })).setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.05, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const play = this.add.text(GAME_W / 2, 300, 'PRESIONA ENTER O HAZ CLIC PARA JUGAR', textStyle(26, '#ffd166')).setOrigin(0.5);
    this.tweens.add({ targets: play, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    const info = [
      'WASD / Flechas: mover      Mouse: apuntar',
      'Q o Clic izquierdo: disparar / golpear      R: recargar',
      'C: cambiar entre pistola y bate de chocolate      SHIFT / ESPACIO: esquivar',
      'Aura AZUL = bueno   ·   Aura ROJA = malvado   ·   Mantén tu racha sin que te golpeen',
    ];
    this.add.text(GAME_W / 2, 600, info.join('\n'), textStyle(17, '#ffffff', { align: 'center', lineSpacing: 8, strokeThickness: 4 })).setOrigin(0.5);

    const go = () => {
      if (this.starting) return;
      this.starting = true;
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameScene'));
    };
    this.input.once('pointerdown', go);
    this.input.keyboard.once('keydown-ENTER', go);
    this.input.keyboard.once('keydown-SPACE', go);
    this.cameras.main.fadeIn(400);
  }

  /** Vista previa estática de un personaje (piernas, cuerpo, brazos, ojos). */
  preview(x, y, c) {
    const vr = c.vr;
    const parts = [];
    const add = (key, px, py, rot = 0, s = 1) => {
      const im = this.add.image(px, py, key).setRotation(rot).setScale(s);
      parts.push(im);
      return im;
    };
    const aura = add(c.aura, 0, 0, 0, c.aS).setBlendMode(Phaser.BlendModes.ADD);
    add('leg_' + c.limb, vr * 0.72, vr * 0.45);
    add('leg_' + c.limb, vr * 0.72, -vr * 0.45);
    const body = add(c.body, 0, 0);
    if (c.bar) body.setFlipX(false);
    add('arm_' + c.limb, vr * 0.9, vr * 0.22);
    add('arm_' + c.limb, vr * 1.0, -vr * 0.12);
    if (c.gun) add('gun', vr * 0.95, vr * 0.1).setOrigin(0.2, 0.5);
    add(c.eye, vr * 0.42, vr * 0.3);
    add(c.eye, vr * 0.42, -vr * 0.3);
    if (c.brow) {
      add('brow', vr * 0.62, vr * 0.3, Math.PI / 2 - 0.45);
      add('brow', vr * 0.62, -vr * 0.3, Math.PI / 2 + 0.45);
    }
    const cont = this.add.container(x, y, parts).setScale(c.scale);
    if (c.flip) cont.setRotation(Math.PI);
    this.tweens.add({ targets: cont, y: y - 14, duration: 900 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: aura, scale: c.aS * 1.12, duration: 700, yoyo: true, repeat: -1 });
  }

  update(time, delta) {
    this.floor.tilePositionX += delta * 0.02;
    this.floor.tilePositionY += delta * 0.01;
  }
}
