import { Key } from "./Player";

export const PLAYERITEM = {
  gun: 1,
  shovel: 2,
  bury: 3,
  beer: 4,
  controller: 5,
  water: 6,
  pizza: 7,
  bong: 8,
};

export class Coin extends Phaser.Physics.Matter.Sprite {
  constructor(scene, itemId, x, y) {
    super(scene.matter.world, x, y, "coin");

    this.itemId = itemId;
    this.setCollisionCategory(null);
    scene.add.existing(this);

    this.anims.create({
      key: "spin",
      frameRate: 8,
      frames: this.anims.generateFrameNumbers("coin", {
        frames: [4, 4, 4, 4, 0, 1, 2, 3, 4, 5, 6, 7, 6, 5],
      }),
      repeat: -1,
    });

    this.anims.play("spin");
    return this;
  }
}

export class Sparkle extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y) {
    super(scene.matter.world, x, y, "sparkle");

    this.setCollisionCategory(null);
    scene.add.existing(this);

    this.anims.create({
      key: "sparkle",
      frameRate: 12,
      frames: this.anims.generateFrameNumbers("sparkle", {
        frames: [0, 1, 2, 3, 4, 5],
      }),
      repeat: 0,
    });

    this.anims.play("sparkle");

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.destroy();
      scene.matter.world.remove(this);
    });
    return this;
  }
}

export class SmokePuff extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y) {
    super(scene.matter.world, x, y, "smoke");

    this.setCollisionCategory(null);
    scene.add.existing(this);

    this.anims.create({
      key: "smoke",
      frameRate: 6,
      frames: this.anims.generateFrameNumbers("smoke", {
        frames: [0, 1, 2, 3, 4, 5],
      }),
      repeat: 0,
    });

    this.anims.play("smoke");

    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.destroy();
      scene.matter.world.remove(this);
    });
    return this;
  }
}

export class Heart extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y) {
    super(scene.matter.world, x, y, "heart");

    this.setCollisionCategory(null);
    scene.add.existing(this);

    this.anims.create({
      key: "spin",
      frameRate: 6,
      frames: this.anims.generateFrameNumbers("heart", {
        frames: [0, 0, 0, 0, 1, 2, 3],
      }),
      repeat: -1,
    });

    this.anims.play("spin");
    return this;
  }
}

export class BulletItem extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y) {
    super(scene.matter.world, x, y, "bullet");

    this.setCollisionCategory(null);
    scene.add.existing(this).setStatic(true).setScale(1);

    this.anims.create({
      key: "float",
      frameRate: 8,
      frames: this.anims.generateFrameNumbers("bullet", {
        frames: [1, 4, 5, 4, 1, 6, 7, 6],
      }),
      repeat: -1,
    });

    this.anims.play("float");

    return this;
  }
}

export const ITEMTYPE = {
  heart: 1,
  coin: 2,
  bullet: 3,
};

export class MapItem extends Phaser.Physics.Matter.Sprite {
  constructor(scene, itemId, x, y, type) {
    let result;
    switch (type) {
      case ITEMTYPE.heart:
        result = new Heart(scene, x, y);
        break;
      case ITEMTYPE.coin:
        result = new Coin(scene, itemId, x, y);
        break;
      case ITEMTYPE.bullet:
        result = new BulletItem(scene, x, y);
        break;
    }
    result.itemId = itemId;
    return result;
  }
}

export class Bullet extends Phaser.Physics.Matter.Sprite {
  constructor(scene, bulletId, x, y, direction) {
    super(scene.matter.world, x, y, "bullet");
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
    let frame,
      pos = { x: x, y: y };
    switch (direction) {
      case Key.s:
        frame = 0;
        break;
      case Key.d:
        frame = 1;
        break;
      case Key.w:
        frame = 2;
        break;
      case Key.a:
        frame = 3;
        break;
    }
    super(scene.matter.world, pos.x, pos.y, "gunflash");
    this.setFrame(frame);
    this.setCollisionCategory(null);
    scene.add.existing(this);

    setTimeout(() => {
      scene.matter.world.remove(this);
      this.destroy();
    }, 200);

    return this;
  }
}
