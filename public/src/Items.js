import { Key } from './Player';

export class Coin extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y) {
        super(scene.matter.world, x, y, 'coin');

        scene.add.existing(this);

        this.anims.create({
            key: 'spin',
            frameRate: 8,
            frames: this.anims.generateFrameNumbers('coin', { frames: [4, 4, 4, 4, 0, 1, 2, 3, 4, 5, 6, 7, 6, 5]}),
            repeat: -1
        });

        this.anims.play('spin');
        return this;
    }
}

export class Heart extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y) {
        super(scene.matter.world, x, y, 'heart');

        scene.add.existing(this);

        this.anims.create({
            key: 'spin',
            frameRate: 4,
            frames: this.anims.generateFrameNumbers('heart', { frames: [0, 0, 0, 0, 1, 2, 3]}),
            repeat: -1
        });

        this.anims.play('spin');
        return this;
    }
}

export class Bullet extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, direction) {
        super(scene.matter.world, x, y, 'bullet');
        scene.add.existing(this);
        this.direction = direction;
        switch (this.direction) {
            case Key.s:
                this.setFrame(0);
                break;
            case Key.d:
                this.setFrame(1);
                break;
            case Key.w:
                this.setFrame(2);
                break;
            case Key.a:
                this.setFrame(3);
                break;
        }
        return this;
    }
}