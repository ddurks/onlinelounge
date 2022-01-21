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

export class BulletItem extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y) {
        super(scene.matter.world, x, y, 'bullet');
        
        scene.add.existing(this).setStatic(true).setScale(2);

        this.anims.create({
            key: 'spin',
            frameRate: 8,
            frames: this.anims.generateFrameNumbers('bullet', { frames: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3]}),
            repeat: -1
        });

        this.anims.play('spin');

        return this;
    }
}

export const ITEMTYPE = {
    'heart': 0,
    'coin': 1,
    'bullet': 2
}

export class MapItem extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, type) {
        switch (type) {
            case ITEMTYPE.heart:
                return new Heart(scene, x, y);
            case ITEMTYPE.coin:
                return new Coin(scene, x, y);
            case ITEMTYPE.bullet:
                return new BulletItem(scene, x, y);
        }
    }
}

export class Bullet extends Phaser.Physics.Matter.Sprite {
    constructor(scene, bulletId, x, y, direction) {
        super(scene.matter.world, x, y, 'bullet');
        scene.add.existing(this);
        this.bulletId = bulletId;
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

export class GunFlash extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, direction) {
        let frame, pos = {x: x, y: y};
        switch (direction) {
            case Key.s:
                frame = 0;
                break;
            case Key.d:
                frame = 1;
                break;
            case Key.w:
                frame = 2
                break;
            case Key.a:
                frame = 3;
                break;
        }
        super(scene.matter.world, pos.x, pos.y, 'gunflash');
        this.setFrame(frame);
        this.setCollisionCategory(null);
        scene.add.existing(this);

        setTimeout(() => {
            scene.matter.world.remove(this);
            this.destroy();
        }, 200)

        return this;
    }
}