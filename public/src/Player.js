import { OL } from "./utils";
import { PLAYERITEM } from "./Items";

export const Key = {
  w: 0,
  a: 1,
  s: 2,
  d: 3,
};

export class Player extends Phaser.Physics.Matter.Sprite {
  constructor(scene, x, y, texture, username) {
    super(scene.matter.world, x, y, texture);

    scene.add.existing(this);
    this.bodyWidth = 20;
    this.bodyHeight = 30;
    this.setBody({
      type: "rectangle",
      width: this.bodyWidth,
      height: this.bodyHeight,
    });
    this.setFrictionAir(0.2);
    this.keysPressed = [0, 0, 0, 0];
    this.setFixedRotation();
    this.setMass(1);
    this.setOrigin(0.5, 0.5);

    this.anims.create({
      key: "down",
      frameRate: OL.WALKING_FRAMERATE,
      frames: this.anims.generateFrameNumbers(texture, {
        frames: [0, 1, 0, 2],
      }),
      repeat: -1,
    });
    this.anims.create({
      key: "left",
      frameRate: OL.WALKING_FRAMERATE,
      frames: this.anims.generateFrameNumbers(texture, {
        frames: [9, 10, 9, 11],
      }),
      repeat: -1,
    });
    this.anims.create({
      key: "right",
      frameRate: OL.WALKING_FRAMERATE,
      frames: this.anims.generateFrameNumbers(texture, {
        frames: [3, 4, 3, 5],
      }),
      repeat: -1,
    });
    this.anims.create({
      key: "up",
      frameRate: OL.WALKING_FRAMERATE,
      frames: this.anims.generateFrameNumbers(texture, {
        frames: [6, 7, 6, 8],
      }),
      repeat: -1,
    });
    this.anims.create({
      key: "icon",
      frameRate: 0,
      frames: this.anims.generateFrameNumbers(texture, { frames: [12] }),
      repeat: 0,
    });

    this.fit = texture;
    this.username = username;
    this.size = 32;
    this.msg = "";
    this.msg_duration = 0;
    this.typing = false;
    this.direction = Key.s;

    this.usernameText = this.generateUsernameText(scene, this);
    this.speakText = this.generateSpeakText(scene, this);
    this.typingIcon = this.generateTypingIcon(scene, this);

    this.generateItems(scene, this);

    this.scene = scene;
    return this;
  }

  generateItems(scene, player) {
    this.gun = scene.add
      .sprite(player.x - 12, player.y + 8, "gun", 0)
      .setVisible(false);
    this.shovel = scene.add
      .sprite(player.x - 12, player.y + 8, "shovel", 0)
      .setVisible(false);
    this.beer = scene.add
      .sprite(player.x - 12, player.y + 8, "beer")
      .setVisible(false);
    this.bong = scene.add
      .sprite(player.x - 12, player.y + 8, "bong")
      .setVisible(false);
    this.water = scene.add
      .sprite(player.x - 12, player.y + 8, "water")
      .setVisible(false);
    this.pizza = scene.add
      .sprite(player.x - 12, player.y + 8, "pizza")
      .setVisible(false);
    this.controller = scene.add
      .sprite(player.x - 12, player.y + 8, "controller")
      .setVisible(false);
    this.item = this.gun;
  }

  createPlayerMarker() {
    this.playermarker = this.scene.add.sprite(
      this.x,
      this.y - (this.size * 2) / 3,
      "playermarker"
    );

    this.playermarker.anims.create({
      key: "float",
      frameRate: 8,
      frames: this.anims.generateFrameNumbers("playermarker", {
        frames: [0, 0, 0, 0, 1, 2, 3],
      }),
      repeat: -1,
    });

    this.playermarker.play("float");
  }

  generateSpeakText(scene, player) {
    var speakText = scene.add
      .text(player.x, player.y - player.size, "", {
        fontFamily: "Arial",
        fontSize: "16px",
        wordWrap: {
          width: 400,
          useAdvancedWrap: true,
        },
        align: "center",
      })
      .setStroke("#000000", 3)
      .setOrigin(0.5, 0);
    return speakText;
  }

  generateTypingIcon(scene, player) {
    var typingIcon = scene.add.sprite(
      player.x + player.size / 2,
      player.y - player.size,
      "typingIcon"
    );

    typingIcon.anims.create({
      key: "typing",
      frameRate: 3,
      frames: typingIcon.anims.generateFrameNumbers("typingIcon", {
        frames: [0, 1, 2, 3],
      }),
      repeat: -1,
    });

    typingIcon.anims.play("typing");
    typingIcon.setActive(false).setVisible(false);

    return typingIcon;
  }

  generateUsernameText(scene, player) {
    var usernameText = scene.add
      .text(player.x + 2, player.y, player.username, {
        fontFamily: "Arial",
        fontStyle: "bold",
        color: "#A9A9A9",
        fontSize: "20px",
      })
      .setStroke("#000000", 3)
      .setOrigin(0.5, 0)
      .setAlign("center");
    return usernameText;
  }

  animForPlayerFromVelocity() {
    if (this.body.velocity.x > 0) {
      this.anims.play("right", true);
      this.direction = Key.d;
    } else if (this.body.velocity.x < 0) {
      this.anims.play("left", true);
      this.direction = Key.a;
    } else if (this.body.velocity.y > 0) {
      this.anims.play("down", true);
      this.direction = Key.s;
    } else if (this.body.velocity.y < 0) {
      this.anims.play("up", true);
      this.direction = Key.w;
    } else {
      this.anims.pause();
    }
  }

  updateFromData(playerData) {
    if (playerData.health <= 0) {
      this.faint();
    } else {
      if (playerData.gun === true || playerData.gun === false) {
        this.setHoldItem(playerData.gun);
      }
      this.setPosition(playerData.x, playerData.y);
      if (playerData.currentInputs) {
        if (playerData.currentInputs[Key.a] === 1) {
          this.anims.play("left", true);
          this.direction = Key.a;
        }
        if (playerData.currentInputs[Key.d] === 1) {
          this.anims.play("right", true);
          this.direction = Key.d;
        }
        if (playerData.currentInputs[Key.w] === 1) {
          this.anims.play("up", true);
          this.direction = Key.w;
        }
        if (playerData.currentInputs[Key.s] === 1) {
          this.anims.play("down", true);
          this.direction = Key.s;
        }
        if (
          !playerData.currentInputs[Key.w] &&
          !playerData.currentInputs[Key.a] &&
          !playerData.currentInputs[Key.s] &&
          !playerData.currentInputs[Key.d]
        ) {
          this.anims.pause();
        }
      }
    }
  }

  updatePlayerStuff() {
    if (this.body) {
      this.speakText.x = this.x;
      this.speakText.y = this.y - (3 * this.size) / 2;

      this.typingIcon.x = this.x + this.size / 2;
      this.typingIcon.y = this.y - this.size;

      this.usernameText.x = this.x;
      this.usernameText.y = this.y + this.size / 2;

      this.updateHeldItemPosition(this.item, true);

      if (this.playermarker) {
        this.playermarker.x = this.x;
        this.playermarker.y = this.y - (this.size * 2) / 3;
      }
    }
  }

  updateHeldItemPosition(item, dynamic) {
    if (item.visible) {
      if (this.direction === Key.s) {
        item.x = this.x - 12;
        item.y = this.y + 8;
        if (dynamic) {
          item.setFrame(0);
        }
      } else if (this.direction === Key.d) {
        item.x = this.x + 14;
        item.y = this.y + 8;
        if (dynamic) {
          item.setFrame(1);
        }
      } else if (this.direction === Key.w) {
        item.x = this.x - 12;
        item.y = this.y + 8;
        if (dynamic) {
          item.setFrame(2);
        }
      } else if (this.direction === Key.a) {
        item.x = this.x - 14;
        item.y = this.y + 8;
        if (dynamic) {
          item.setFrame(3);
        }
      }
    }
  }

  flinch() {
    this.setFrame(13);
  }

  faint() {
    this.setFrame(14);
  }

  startTyping() {
    this.typingIcon.setActive(true).setVisible(true);
    this.typing = true;
  }

  setHoldItem(playerItem) {
    this.item.setVisible(false);
    switch (playerItem) {
      case PLAYERITEM.gun:
        this.item = this.gun.setVisible(true);
        break;
      case PLAYERITEM.shovel:
        this.item = this.shovel.setVisible(true);
        break;
      case PLAYERITEM.beer:
        this.item = this.beer.setVisible(true);
        break;
      case PLAYERITEM.bong:
        this.item = this.bong.setVisible(true);
        break;
      case PLAYERITEM.water:
        this.item = this.water.setVisible(true);
        break;
      case PLAYERITEM.pizza:
        this.item = this.pizza.setVisible(true);
        break;
      case PLAYERITEM.controller:
        this.item = this.controller.setVisible(true);
        break;
    }
    this.updatePlayerStuff();
  }

  setMsg(text) {
    this.msg = text;
    this.msg_duration = 0;
    this.speakText.setText(this.msg);
    this.typingIcon.setActive(false).setVisible(false);
    this.typing = false;
  }

  msgDecayHandler(delta) {
    if (this.msg !== "") {
      if (this.msg_duration > OL.MSG_MAXTIME) {
        this.msg = "";
        this.speakText.setText(this.msg);
        this.msg_duration = 0;
      } else {
        this.msg_duration += delta;
      }
    }
  }

  destroyStuff() {
    this.speakText.destroy();
    this.usernameText.destroy();
    this.typingIcon.destroy();
    this.item.destroy();
    if (this.playermarker) {
      this.playermarker.destroy();
    }
  }
}
