import { PopUp } from "./PopUp";
import { TextButton, OL } from "./utils";
import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick.js";
import { PLAYERITEM } from "./Items";
import { Leaderboard } from "./Leaderboard";

export class HealthBar extends Phaser.GameObjects.Group {
  constructor(scene, heartsNum) {
    super(scene);
    this.hearts = new Array();
    let xCurr = OL.world.width - 30;
    for (let i = 0; i < heartsNum; i++) {
      this.hearts.push(scene.add.image(xCurr, 75, "heart", 0).setScale(2));
      this.add(this.hearts[i]);
      xCurr -= 45;
    }
    return this;
  }

  setHealth(number) {
    if (number < 0) {
      number = 0;
    } else if (number > 3) {
      number = 3;
    }
    this.hearts.forEach((heart) => {
      if (number > 0) {
        heart.setVisible(true);
      } else {
        heart.setVisible(false);
      }
      number--;
    });
  }
}

export class Feed extends Phaser.GameObjects.Group {
  constructor(scene, x, y) {
    super(scene);
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.items = new Array();
    this.maxLength = 4;
    this.spacing = 11;
  }

  addLine(text) {
    if (this.items.length === 0) {
      this.addTextItemToTop(text);
    } else if (this.items.length < this.maxLength) {
      this.shiftItems();
      this.addTextItemToTop(text);
    } else {
      let deleteItem = this.items.shift();
      deleteItem.destroy();
      this.shiftItems();
      this.addTextItemToTop(text);
    }
  }

  addTextItemToTop(text) {
    let newText = this.scene.add
      .text(this.x, this.y, text, {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#000000",
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(11);
    setTimeout(() => {
      newText.destroy();
    }, 10000);
    this.items.push(newText);
  }

  shiftItems() {
    this.items.forEach((item) => {
      item.setPosition(item.x, item.y + this.spacing);
    });
  }
}

export class Controls extends Phaser.Scene {
  constructor() {
    super("Controls");

    this.chatText = OL.CHAT_TEXT;
    this.zoomed = false;
    this.prevPopupText = "";
  }

  create() {
    this.camera = this.cameras.main;
    this.createMenuBar();
    var logo = this.add
      .image(-1, -2, "olLogo")
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.events.emit("serverStats"));
    logo.setOrigin(0, 0);
    logo.setDepth(11);

    this.populationText = this.add
      .text(40, 22, "-", {
        fontFamily: "Arial",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#000000",
        wordWrap: {
          width: 320,
          useAdvancedWrap: true,
        },
        align: "center",
      })
      .setDepth(11);
    this.connectionIcon = this.add
      .image(30, -6, "connection", 1)
      .setScale(0.75)
      .setOrigin(0, 0)
      .setDepth(11);

    var leaderboardButton = this.add
      .image(70, -4, "leaderboard")
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.events.emit("getLeaderboard");
      });
    leaderboardButton.setOrigin(0, 0);
    leaderboardButton.setDepth(11);
    var chatIcon = this.add.image(
      OL.world.width - 50,
      OL.world.height - 45,
      "chatIcon",
      0
    );
    chatIcon.setScale(4);
    chatIcon.setDepth(11);
    this.add.existing(chatIcon).setScrollFactor(0);
    this.chatButton = new TextButton(
      this,
      OL.world.width - 65,
      OL.world.height - 67,
      OL.CHAT_TEXT,
      {
        fontFamily: "Arial",
        fontStyle: "bold",
        color: "#000000",
        fontSize: "32px",
      },
      () => this.chat()
    );
    this.chatButton.setDepth(11);
    this.add.existing(this.chatButton).setScrollFactor(0);

    this.add
      .dom(OL.world.width / 2, OL.world.height / 2)
      .createFromCache("chatBox")
      .setScrollFactor(0);
    document.getElementById("chat-box").style.display = "none";
    const MAX_LENGTH = 100;
    document.getElementById("chat-entry").onkeyup = function () {
      document.getElementById("char-count").innerHTML =
        this.value.length + "/" + MAX_LENGTH;
    };
    document.getElementById("chat-entry").onchange = () => this.sendChat();

    this.zoomButton = this.add
      .image(OL.world.width - 75, 12, "zoomIn")
      .setInteractive({ useHandCursor: true })
      .setScale(2)
      .on("pointerdown", () => this.zoomIn());
    this.zoomButton.setDepth(12);
    this.add.existing(this.zoomButton).setScrollFactor(0);

    this.zoomOutButton = this.add
      .image(OL.world.width - 75, 34, "zoomOut")
      .setInteractive({ useHandCursor: true })
      .setScale(2)
      .on("pointerdown", () => this.zoomOut());
    this.zoomOutButton.setDepth(12);
    this.add.existing(this.zoomOutButton).setScrollFactor(0);

    this.gunButton = this.add
      .image(OL.world.width - 50, OL.world.height - 116, "gunButton")
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.events.emit("useItem", PLAYERITEM.gun);
      });
    this.shovelButton = this.add
      .sprite(OL.world.width - 50, OL.world.height - 116, "shovelButton", 7)
      .setVisible(false);
    this.shovelButton.anims.create({
      key: "reload",
      frameRate: 2,
      frames: this.anims.generateFrameNumbers("shovelButton", {
        frames: [0, 1, 2, 3, 4, 5, 6, 7],
      }),
      repeat: 0,
    });
    this.shovelButton.enabled = true;
    this.shovelButton.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.shovelButton.enabled = true;
    });
    this.shovelButton
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        if (this.shovelButton.enabled) {
          this.events.emit("useItem", PLAYERITEM.shovel);
          this.shovelButton.enabled = false;
          this.shovelButton.anims.play("reload");
        }
      });
    this.buryButton = this.add
      .image(OL.world.width - 50, OL.world.height - 116, "buryButton")
      .setVisible(false)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => {
        this.events.emit("useItem", PLAYERITEM.bury);
      });

    this.itemButton = this.gunButton;

    if (this.popup) {
      this.popup.destroy();
    }
    this.popup = new PopUp(this);
    this.healthBar = new HealthBar(this, 3);
    this.bulletIcon = this.add
      .image(OL.world.width - 30, 130, "bullet", 2)
      .setScrollFactor(0)
      .setScale(2)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.events.emit("holdingItem", PLAYERITEM.gun));
    this.bulletNumText = this.add
      .text(OL.world.width - 30, 130, 0, {
        fontFamily: "Arial",
        fontSize: "10px",
        fontStyle: "bold",
        color: "#ffffff",
        wordWrap: {
          width: 320,
          useAdvancedWrap: true,
        },
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(11);
    this.coinIcon = this.add
      .image(OL.world.width - 30, 170, "coin", 4)
      .setScrollFactor(0)
      .setScale(2)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () =>
        this.events.emit("holdingItem", PLAYERITEM.bury)
      );
    this.coinsText = this.add
      .text(OL.world.width - 30, 170, 0, {
        fontFamily: "Arial",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#000000",
        wordWrap: {
          width: 320,
          useAdvancedWrap: true,
        },
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(11);
    this.shovelIcon = this.add
      .image(OL.world.width - 30, 210, "shovel", 1)
      .setScrollFactor(0)
      .setScale(2)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () =>
        this.events.emit("holdingItem", PLAYERITEM.shovel)
      );
    if (OL.IS_MOBILE) {
      this.joystick = new VirtualJoystick(this, {
        x: 125,
        y: OL.world.height - 125,
        radius: 100,
        base: this.add
          .image(125, OL.world.height - 125, "joystickBg")
          .setScale(2),
        thumb: this.add
          .image(125, OL.world.height - 125, "joystick")
          .setScale(2),
      }).setScrollFactor(0);
    }

    this.controlsButton = this.add
      .image(OL.world.width - 108, 16, "controls")
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.popup.displayControls());
    this.controlsButton.setDepth(12);
    this.add.existing(this.controlsButton).setScrollFactor(0);
    this.add
      .text(OL.world.width - 110, 36, "CONTROLS", {
        fontFamily: "Arial",
        fontSize: "8px",
        fontStyle: "bold",
        color: "#000000",
        wordWrap: {
          width: 320,
          useAdvancedWrap: true,
        },
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(11);

    this.feed = new Feed(this, OL.world.width / 2, 6);
    this.leaderboard = new Leaderboard(this, OL.world.width / 2, 75, 3);

    this.scene
      .get("DigitalPlanet")
      .events.on("displayPopup", (info) => this.displayPopup(info));
    this.scene
      .get("DigitalPlanet")
      .events.on("displayLeaderboard", (leaderboard) =>
        this.displayLeaderboard(leaderboard)
      );
    this.scene
      .get("DigitalPlanet")
      .events.on("updateLeaderboard", (leaderboard) =>
        this.leaderboard.setData(leaderboard)
      );
    this.scene
      .get("DigitalPlanet")
      .events.on("populationUpdate", (pop) => this.populationUpdate(pop));
    this.scene
      .get("DigitalPlanet")
      .events.on("connectionStatus", (status) => this.setConnected(status));
    this.scene
      .get("DigitalPlanet")
      .events.on("holdingItem", (status) => this.holdingItem(status));
    this.scene
      .get("DigitalPlanet")
      .events.on("healthUpdate", (healthNum) => this.healthUpdate(healthNum));
    this.scene
      .get("DigitalPlanet")
      .events.on("bulletUpdate", (bulletNum) => this.bulletUpdate(bulletNum));
    this.scene
      .get("DigitalPlanet")
      .events.on("coinUpdate", (coins) => this.coinUpdate(coins));
    this.scene
      .get("DigitalPlanet")
      .events.on("feedUpdate", (update) => this.feedUpdate(update));
    this.scene
      .get("DigitalPlanet")
      .events.on("buryHere", () => this.popup.displayBuryPopup());
  }

  setConnected(status) {
    if (status) {
      this.connectionIcon.setFrame(0);
    } else {
      this.connectionIcon.setFrame(1);
    }
  }

  feedUpdate(update) {
    this.feed.addLine(update);
  }

  coinUpdate(coins) {
    this.coinsText.setText(coins);
  }

  bulletUpdate(bulletNum) {
    this.bulletNumText.setText(bulletNum);
  }

  healthUpdate(healthNum) {
    this.healthBar.setHealth(healthNum);
  }

  populationUpdate(pop) {
    this.populationText.setText(pop);
  }

  holdingItem(heldItem) {
    this.itemButton.setVisible(false);
    switch (heldItem) {
      case PLAYERITEM.gun:
        this.itemButton = this.gunButton.setVisible(true);
        return;
      case PLAYERITEM.shovel:
        this.itemButton = this.shovelButton.setVisible(true);
        return;
      case PLAYERITEM.bury:
        this.itemButton = this.buryButton.setVisible(true);
        return;
    }
  }

  createMenuBar() {
    let menuBarLength = 512;
    for (let i = 0; i < OL.world.width; i += menuBarLength) {
      let menuBar = this.add.image(i, 0, "menuBar");
      menuBar.setOrigin(0, 0);
      menuBar.setDepth(11);
    }
  }

  chat() {
    if (this.chatText === OL.CHAT_TEXT) {
      this.openChatBox();
    } else {
      this.sendChat();
    }
  }

  openChatBox() {
    this.chatText = OL.SEND_TEXT;
    this.events.emit("openChat");
    this.chatButton.setText(OL.SEND_TEXT);
    document.getElementById("chat-box").style.display = "block";
    if (!OL.IS_MOBILE) {
      var chatBox = document.getElementById("chat-entry");
      chatBox.focus();
    }
  }

  sendChat() {
    this.chatText = OL.CHAT_TEXT;
    this.events.emit("sendChat");
    document.getElementById("chat-entry").value = "";
    this.chatButton.setText(OL.CHAT_TEXT);
    document.getElementById("chat-box").style.display = "none";
  }

  zoom() {
    if (!this.zoomed) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  zoomIn() {
    this.zoomed = true;
    this.events.emit("zoomIn");
  }

  zoomOut() {
    this.zoomed = false;
    this.events.emit("zoomOut");
  }

  displayPopup(info) {
    if (info.text !== this.prevPopupText || info.title !== "info") {
      this.popup.display(info.title, info.text, info.gif);
      this.prevPopupText = info.text;
    }
  }

  displayLeaderboard(leaderboard) {
    this.leaderboard.setData(leaderboard);
    this.leaderboard.toggleDisplay();
  }
}
