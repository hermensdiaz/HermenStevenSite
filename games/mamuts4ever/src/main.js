import { GameScene } from './scenes/GameScene.js';

const config = {
    type: Phaser.AUTO,
    title: 'Overlord Rising',
    description: '',
    parent: 'game-container',
    width: 1200,
    height: 720,
    backgroundColor: '#fff',
    pixelArt: false,
    scene: [
        GameScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                x: 0, y: 50,
            },
            debug: true
        }
    }
}

new Phaser.Game(config);
            