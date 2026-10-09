// "Every great game begins with a single scene. Let's make this one unforgettable!"
export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init() {
        // Initialize scene
    }

    preload() {
        // Load assets
        this.load.image('background', 'assets/images/background.jpg');

    }

    create() {
        // Create game objects
        const gameW = this.scale.width;
        const gameH = this.scale.height;
        this.add.image(gameW/2, gameH/2, 'background');
    }

}
