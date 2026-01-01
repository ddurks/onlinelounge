import { OL } from "./utils";

export class Preloader extends Phaser.Scene {
  constructor() {
    super("Preloader");
  }
  preload() {
    var logo = this.add
      .sprite(OL.world.centerX, OL.world.centerY - 50, "logo")
      .setScale(0.5);
    logo.setOrigin(0.5, 0.5);

    var width = OL.world.width;
    var height = OL.world.height;
    var loadingText = this.make.text({
      x: width / 2,
      y: height / 2 + 100,
      text: "Loading...",
      style: {
        font: "20px monospace",
        fill: "#33ff33",
      },
    });
    loadingText.setOrigin(0.5, 0.5);

    var percentText = this.make.text({
      x: width / 2,
      y: height / 2 + 140,
      text: "0%",
      style: {
        font: "18px monospace",
        fill: "#33ff33",
      },
    });
    percentText.setOrigin(0.5, 0.5);

    var assetText = this.make.text({
      x: width / 2,
      y: height / 2 + 180,
      text: "",
      style: {
        font: "18px monospace",
        fill: "#33ff33",
      },
    });
    assetText.setOrigin(0.5, 0.5);

    this.load.on("progress", function (value) {
      percentText.setText(parseInt(value * 100) + "%");
    });

    this.load.on("fileprogress", function (file) {
      assetText.setText("Loading asset: " + file.key);
    });
    this.load.on("complete", function () {
      loadingText.destroy();
      percentText.destroy();
      assetText.destroy();
    });

    this.load.html("nameform", "loginform.html");
    this.load.html("chatBox", "chatbox.html");
    this.load.html("gifViewer", "gif-viewer.html");
    this.load.spritesheet(
      "computer_guy",
      "assets/sprites/computerguy-spritesheet-extruded.png",
      { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 }
    );
    this.load.spritesheet(
      "cute_guy",
      "assets/sprites/cuteguy-spritesheet-extruded.png",
      { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 }
    );
    this.load.spritesheet(
      "phone_guy",
      "assets/sprites/phoneguy-spritesheet-extruded.png",
      { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 }
    );
    this.load.spritesheet("walrus", "assets/sprites/walrus-extruded.png", {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet("obama", "assets/sprites/obama-extruded.png", {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet(
      "online_guy",
      "assets/sprites/online_guy-extruded.png",
      { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 }
    );
    this.load.spritesheet("drawvid", "assets/sprites/drawvid-extruded.png", {
      frameWidth: 32,
      frameHeight: 32,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet("typingIcon", "assets/sprites/typing.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    this.load.spritesheet(
      "purpleButterfly",
      "assets/sprites/butterfly-purple-extruded.png",
      { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 }
    );
    this.load.spritesheet(
      "blueButterfly",
      "assets/sprites/butterfly-blue-extruded.png",
      { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 }
    );
    this.load.spritesheet(
      "orangeButterfly",
      "assets/sprites/butterfly-orange-extruded.png",
      { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 }
    );
    this.load.spritesheet(
      "pinkButterfly",
      "assets/sprites/butterfly-pink-extruded.png",
      { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 }
    );
    this.load.spritesheet("coin", "assets/sprites/coin-extruded.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet("heart", "assets/sprites/heart-extruded.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet(
      "onlineBouncer",
      "assets/sprites/onlinebouncer-extruded.png",
      { frameWidth: 32, frameHeight: 48, margin: 1, spacing: 2 }
    );
    this.load.spritesheet("connection", "assets/sprites/connection_icons.png", {
      frameWidth: 48,
      frameHeight: 48,
      margin: 0,
      spacing: 0,
    });
    this.load.spritesheet("gun", "assets/sprites/gun-extruded.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 1,
      spacing: 2,
    });
    this.load.spritesheet("bullet", "assets/sprites/bulletguy.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    this.load.spritesheet(
      "gunflash",
      "assets/sprites/gun_flash_spritesheet.png",
      { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 }
    );
    this.load.spritesheet("sparkle", "assets/sprites/sparkle.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    this.load.spritesheet("playermarker", "assets/sprites/playermarker.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    this.load.spritesheet("shovel", "assets/sprites/shovel-spritesheet.png", {
      frameWidth: 16,
      frameHeight: 16,
      margin: 0,
      spacing: 0,
    });
    this.load.spritesheet(
      "shovelButton",
      "assets/sprites/shovel-button-spritesheet.png",
      { frameWidth: 64, frameHeight: 64, margin: 0, spacing: 0 }
    );
    this.load.spritesheet("smoke", "assets/sprites/smoke_spritesheet.png", {
      frameWidth: 32,
      frameHeight: 32,
      margin: 0,
      spacing: 0,
    });
    this.load.image("menuBar", "assets/hud/menu-bar.png");
    this.load.image("mobileControls", "assets/hud/mobile-controls.png");
    this.load.image("desktopControls", "assets/hud/desktop-controls.png");
    this.load.image("controls", "assets/hud/controls.png");
    this.load.image("popup", "assets/hud/popup.png");
    this.load.image("board", "assets/hud/board.png");
    this.load.image("olLogo", "assets/hud/logo.png");
    this.load.image("leaderboard", "assets/hud/leaderboard.png");
    this.load.image("redButton", "assets/hud/red-button.png");
    this.load.image("greenButton", "assets/hud/green-button.png");
    this.load.image("chatIcon", "assets/hud/square-talk.png", {
      frameWidth: 16,
      frameHeight: 16,
    });
    this.load.image("gunButton", "assets/hud/gun-button.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("buryButton", "assets/hud/bury-button.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image("x", "assets/hud/x.png");
    this.load.image("joystick", "assets/hud/joystick.png");
    this.load.image("joystickBg", "assets/hud/joystick_bg.png");
    this.load.image("beer", "assets/items/lounge_beer.png");
    this.load.image("bong", "assets/items/bong.png");
    this.load.image("water", "assets/items/lil_water.png");
    this.load.image("pizza", "assets/items/pizza.png");
    this.load.image("controller", "assets/items/controller.png");
    this.load.image("zoomIn", "assets/hud/zoomIn.png");
    this.load.image("zoomOut", "assets/hud/zoomOut.png");
    this.load.image(
      "groundTiles",
      "assets/tiles/online-pluto-tileset-extruded.png"
    );
    this.load.image(
      "objectTiles",
      "assets/tiles/online-pluto-objects-extruded.png"
    );
    this.load.image(
      "loungeTiles",
      "assets/tiles/online-lounge-objects-extruded.png"
    );

    this.load.tilemapTiledJSON(
      "map",
      "assets/tiles/onlinepluto-tilemap-new.json"
    );
    this.load.tilemapTiledJSON(
      "loungeMap",
      "assets/tiles/onlinelounge-tilemap.json"
    );
  }
  create() {
    OL.fadeOutScene("MainMenu", this);
  }
}
