import { OL } from "./utils";

export class PopUp extends Phaser.GameObjects.Group {
  constructor(scene) {
    super(scene);
    this.GIF_OFFSET = 100;
    this.popup = scene.add.image(
      OL.world.width / 2,
      OL.world.height / 2,
      "popup"
    );
    this.popup.setOrigin(0.5, 0.5);
    this.popup.setDepth(11);
    this.popup.setVisible(false);
    this.popup.setScrollFactor(0);

    this.x = scene.add
      .image(this.popup.x + 160, this.popup.y - 190, "x")
      .setInteractive({ useHandCursor: true });
    this.x.on("pointerdown", () => {
      scene.scene.get("Controls").events.emit("closeEvent");
      this.close();
    });
    this.x.setOrigin(0, 0);
    this.x.setDepth(12);
    this.x.setVisible(false);
    this.x.setScrollFactor(0);

    this.title = scene.add.text(this.popup.x, this.popup.y - 190, "lounge", {
      fontFamily: "Arial",
      fontStyle: "bold",
      color: "#000000",
      fontSize: "16px",
    });
    this.title.setOrigin(0.5, 0);
    this.title.setDepth(12);
    this.title.setVisible(false);
    this.title.setScrollFactor(0);

    this.textBody = scene.add.text(this.popup.x, this.popup.y, "", {
      fontFamily: "Arial",
      fontStyle: "bold",
      fontSize: "32px",
      color: "#000000",
      wordWrap: {
        width: 320,
        useAdvancedWrap: true,
      },
      align: "center",
    });
    this.textBody.setOrigin(0.5, 0.5);
    this.textBody.setDepth(12);
    this.textBody.setVisible(false);
    this.textBody.setScrollFactor(0);

    this.button = scene.add
      .image(this.popup.x - 10, this.popup.y + 100, "greenButton")
      .setInteractive({ useHandCursor: true });
    this.button.on("pointerdown", () => this.buttonClicked(scene));
    this.button.setOrigin(0.5, 0.5);
    this.button.setDepth(11);
    this.button.setVisible(false);
    this.button.setScrollFactor(0);
    this.buttonText = scene.add.text(
      this.popup.x - 10,
      this.popup.y + 100,
      "",
      {
        fontFamily: "Arial",
        fontSize: "16px",
        color: "#000000",
        wordWrap: {
          width: 320,
          useAdvancedWrap: true,
        },
        align: "center",
      }
    );
    this.buttonText.setOrigin(0.5, 0.5);
    this.buttonText.setDepth(13);
    this.buttonText.setVisible(false);
    this.buttonText.setScrollFactor(0);

    if (OL.IS_MOBILE) {
      this.controls = scene.add
        .image(OL.world.width / 2, OL.world.height / 2, "mobileControls")
        .setDepth(12)
        .setOrigin(0.5, 0.5)
        .setVisible(false);
    } else {
      this.controls = scene.add
        .image(OL.world.width / 2, OL.world.height / 2, "desktopControls")
        .setDepth(12)
        .setOrigin(0.5, 0.5)
        .setVisible(false);
    }

    scene.add
      .dom(OL.world.width / 2, OL.world.height / 2 - 30)
      .createFromCache("gifViewer")
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5);
    document.getElementById("gif-viewer").style.display = "none";

    scene.scene.get("DigitalPlanet").events.off("playerLoaded");
    scene.scene
      .get("DigitalPlanet")
      .events.on("playerLoaded", (playerSprite) => {
        this.loadPlayerIcon(scene, playerSprite);
        this.setSprite(scene, playerSprite.texture);
      });
    return this;
  }

  loadPlayerIcon(scene, playerSprite) {
    if (this.playerIcon) {
      this.playerIcon.destroy();
    }
    this.playerIcon = scene.add
      .image(OL.world.width - 37, 22, playerSprite.texture, 12)
      .setInteractive({ useHandCursor: true });
    this.playerIcon.setScale(2);
    this.playerIcon.setDepth(12);
    this.playerIcon.setScrollFactor(0);
    this.playerIcon.setVisible(true);
    this.playerIcon.off("pointerdown");
    this.playerIcon.on("pointerdown", () =>
      this.displayLookPopup("look 👀", playerSprite.texture)
    );
  }

  buttonClicked(scene) {
    switch (this.buttonText.text) {
      case "bury":
        scene.events.emit("buryConfirmed");
        break;
      default:
        scene.events.emit("lookChange");
    }
    this.close();
  }

  displayControls() {
    this.title.setText("controls");
    this.title.setVisible(true);
    this.popup.setVisible(true);
    this.x.setVisible(true);
    this.controls.setVisible(true);
  }

  displayBuryPopup() {
    this.display("bury", "bury your coins here?");
    this.displayButton("bury");
  }

  displayLookPopup(title, text) {
    this.sprite.setVisible(true);
    this.display(title, text);
    this.displayButton("change");
  }

  buryClicked(scene) {
    scene.events.emit("buryConfirmed");
    this.close();
  }

  display(title, text, gif) {
    this.title.setText(title);
    this.textBody.setText(text);
    this.popup.setVisible(true);
    this.x.setVisible(true);
    this.title.setVisible(true);
    this.textBody.setVisible(true);
    if (this.sprite.anims) {
      this.sprite.anims.play("down");
    }
    if (gif) {
      this.textlowered = true;
      this.textBody.setPosition(
        this.textBody.x,
        this.textBody.y + this.GIF_OFFSET
      );
      if (gif === "dead") {
        document.getElementById("shownGif").src =
          "assets/gifs/death-gifs/" + OL.getRandomInt(0, 79) + ".gif";
      } else if (gif === "treasure") {
        document.getElementById("shownGif").src =
          "assets/gifs/treasure-gifs/" + OL.getRandomInt(0, 46) + ".gif";
      }
      document.getElementById("gif-viewer").style.display = "block";
    }
  }

  displayButton(label) {
    this.button.setVisible(true);
    this.buttonText.setVisible(true);
    this.buttonText.setText(label);
  }

  close() {
    this.popup.setVisible(false);
    this.x.setVisible(false);
    this.title.setVisible(false);
    this.textBody.setVisible(false);
    this.button.setVisible(false);
    this.buttonText.setVisible(false);
    this.sprite.setVisible(false);
    this.controls.setVisible(false);
    if (this.sprite.anims) {
      this.sprite.anims.stop();
    }
    let gifViewer = document.getElementById("gif-viewer");
    if (gifViewer.style.display === "block") {
      gifViewer.style.display = "none";
      this.textBody.setPosition(
        this.textBody.x,
        this.textBody.y - this.GIF_OFFSET
      );
    }
  }

  setSprite(scene, texture) {
    if (this.sprite) {
      this.sprite.destroy();
    }
    this.sprite = scene.add
      .sprite(this.popup.x - 10, this.popup.y - 64, texture)
      .setOrigin(0.5, 0.5);

    this.sprite.anims.create({
      key: "down",
      frameRate: OL.WALKING_FRAMERATE - 4,
      frames: this.sprite.anims.generateFrameNumbers(texture, {
        frames: [0, 1, 0, 2],
      }),
      repeat: -1,
    });

    this.sprite.setVisible(false);
    this.sprite.setScale(2);
    this.sprite.setDepth(12);
  }
}
