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
        this.load.image('cup', 'assets/images/cup.png');
        // this.load.image('mamut', 'assets/images/mamut_crema.png');
        this.load.atlas('mamuts', 'assets/spritesheets/any_mamuts.png', 'assets/spritesheets/mamuts_spritesheet.json');

    }

    create() {
        // Create game objects
        const gameW = this.scale.width;
        const gameH = this.scale.height;

        // add player cup
        this.add.image(gameW/2, gameH/2, 'background');
        this.cup = this.physics.add.image(gameW/2, gameH - 80, 'cup');
        // this.cup.scaleX = 0.1;
        // this.cup.scaleY = 0.1;
        this.cup.body.setAllowGravity(false).setCollideWorldBounds(true);
        this.cupGlow = this.cup.postFX.addGlow(0xffffff, 3, 0);

        // input
        this.cursorKeys = this.input.keyboard.createCursorKeys();

        this.mamutsFrames = this.textures.get("mamuts").getFrameNames();
        this.mamutsGroup = this.physics.add.group([]);
        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this.spawnRandomMamut, 
            callbackScope: this,
        })

        this.physics.add.overlap(this.cup, this.mamutsGroup, this.handleCupMamutsCollision, null, this);
        

    }

    update() {
        if(this.cursorKeys.left.isDown) {
            this.cup.setVelocityX(-400);
        } else if(this.cursorKeys.right.isDown) {
            this.cup.setVelocityX(400);
        } else {
            this.cup.setVelocityX(0);
        }

        this.mamutsGroup.getChildren().forEach((child) => {
            if(!child.active) {
                return; 
            }
            if(child.y > this.scale.height + 10) {
                child.setActive(false).setVisible(false);
            }
        });
    }
    spawnRandomMamut() {
        // const mamutsFrame = Phaser.Utils.Array.GetRandom(this.mamutsFrames);
        const mamuts = this.mamutsGroup.getFirstDead(true, Phaser.Math.RND.between(50, this.scale.width - 50), -20, 'mamuts');
        mamuts
            .setScale(0.5)
            .setActive(true)
            .setVisible(true)
            .setVelocity(0)
            .setFrame(Phaser.Utils.Array.GetRandom(this.mamutsFrames))
            .enableBody();
        // this.physics.add.image(Phaser.Math.RND.between(50, this.scale.width - 50), -20, 'mamuts', Phaser.Utils.Array.GetRandom(this.mamutsFrames)).setScale(0.5);
        console.log(this.mamutsGroup.getChildren().length);
    }

    handleCupMamutsCollision(cup, mamuts) {
        // console.log(mamuts);
        mamuts.disableBody(true, true);
    }
}
