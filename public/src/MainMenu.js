import { OL } from "./utils";
import { GameServerClient } from "./WorldServerClient";

const MAP_DATA = {
  digitalplanet: {
    mapKey: "map",
    groundTileset: {
      name: "online-pluto-tileset-extruded",
      ref: "groundTiles",
    },
    objectTileset: {
      name: "online-tileset-extruded",
      ref: "objectTiles",
    },
  },
  lounge: {
    mapKey: "loungeMap",
    groundTileset: {
      name: "online-lounge-objects-extruded",
      ref: "loungeTiles",
    },
    objectTileset: {
      name: "online-lounge-objects-extruded",
      ref: "loungeTiles",
    },
  },
};

MAP_DATA.digitalplanet.exitTo = MAP_DATA.lounge;
MAP_DATA.lounge.exitTo = MAP_DATA.digitalplanet;

export class MainMenu extends Phaser.Scene {
  constructor() {
    super("MainMenu");
    this.serverClient = new GameServerClient();
  }

  create() {
    this.input.keyboard.on("keydown", this.handleKey, this);

    this.text = this.add.text(10, 10, "onlinelounge.drawvid.com", {
      color: "#fbf236",
      fontFamily: "Arial",
      fontSize: "16px ",
    });

    var element = this.add
      .dom(OL.world.width / 2, OL.world.height / 2)
      .createFromCache("nameform");

    element.setPerspective(800);
    element.addListener("click");

    if (this.serverClient.cachedUsername) {
      document.getElementById("username").value =
        this.serverClient.cachedUsername;
    }

    element.on("click", (event) => {
      if (event.target.name === "loginButton") {
        this.login();
      }
    });

    // Create progress bar and status text (hidden by default)
    const centerX = OL.world.width / 2;
    const centerY = OL.world.height / 2 + 200;

    // Progress bar background
    this.progressBarBg = this.add.rectangle(
      centerX,
      centerY,
      300,
      20,
      0x333333,
    );
    this.progressBarBg.setVisible(false);
    this.progressBarBg.setDepth(100);

    // Progress bar fill - use rectangle for reliable rendering
    this.progressBar = this.add.rectangle(
      centerX - 150,
      centerY,
      0,
      16,
      0x00ff00,
    );
    this.progressBar.setOrigin(0, 0.5);
    this.progressBar.setVisible(false);
    this.progressBar.setDepth(101);

    // Stage info text (above progress bar)
    this.stageText = this.add.text(centerX, centerY - 60, "", {
      color: "#00ff88",
      fontFamily: "Arial",
      fontSize: "14px",
      align: "center",
      wordWrap: { width: 280 }
    });
    this.stageText.setOrigin(0.5, 1);
    this.stageText.setVisible(false);
    this.stageText.setDepth(102);

    // Status text (below progress bar)
    this.statusText = this.add.text(centerX, centerY + 40, "", {
      color: "#ffffff",
      fontFamily: "Arial",
      fontSize: "14px",
      align: "center",
    });
    this.statusText.setOrigin(0.5, 0);
    this.statusText.setVisible(false);
    this.statusText.setDepth(102);
  }

  handleKey(e) {
    switch (e.code) {
      case "KeyS": {
        break;
      }
      case "Enter": {
        this.login();
        break;
      }
      default: {
      }
    }
  }

  login() {
    var inputUsername = document.getElementById("username");
    // var inputPassword = document.getElementById('password');

    OL.username = inputUsername.value;
    // OL.password = inputPassword.value;

    var spawnDropdownValue = document.getElementById("spawns").value;
    switch (spawnDropdownValue) {
      case MAP_DATA.lounge.mapKey:
        this.mapData = MAP_DATA.lounge;
        break;
      default:
        this.mapData = MAP_DATA.digitalplanet;
    }

    // Connect to WorldServer before starting game
    this.connectAndStart();
  }

  async connectAndStart() {
    try {
      // Hide login form
      const Element = document.querySelector(".nameform");
      if (Element) Element.style.display = "none";

      // Show progress UI
      this.progressBarBg.setVisible(true);
      this.progressBar.setVisible(true);
      this.statusText.setVisible(true);
      this.statusText.setText("Connecting...");

      // Progress callback that updates UI
      const onProgress = (progress, message) => {
        // Update progress bar width (0-300px for 0-100%)
        const percentage = Math.min(progress, 100);
        const barWidth = (percentage / 100) * 300;
        this.progressBar.setDisplaySize(barWidth, 16);

        // Update status text
        if (message) {
          this.statusText.setText(`${percentage}% - ${message}`);
        } else {
          this.statusText.setText(`${percentage}%`);
        }
      };

      // Detailed progress callback for stage information
      const onDetailedProgress = (progressData) => {
        // Update stage text
        this.stageText.setVisible(true);
        this.stageText.setText(`${progressData.stageName}\n${progressData.stageDescription}`);

        // Also update progress bar
        const percentage = Math.min(progressData.progress, 100);
        const barWidth = (percentage / 100) * 300;
        this.progressBar.setDisplaySize(barWidth, 16);

        // Update status text to show percentage
        this.statusText.setText(`${percentage}%`);
      };

      // Connect to WorldServer with progress callbacks
      await this.serverClient.connect(OL.username, onProgress, onDetailedProgress);

      // Connection complete, hide progress UI
      this.progressBarBg.setVisible(false);
      this.progressBar.setVisible(false);
      this.statusText.setVisible(false);
      this.stageText.setVisible(false);
      this.clickStart();
    } catch (error) {
      console.error("Failed to connect:", error);
      this.statusText.setText(`Connection failed: ${error.message}`);
      this.progressBarBg.setVisible(false);
      this.progressBar.setVisible(false);

      // Show login form again
      const Element = document.querySelector(".nameform");
      if (Element) Element.style.display = "block";
    }
  }

  clickStart() {
    this.text.setText("Welcome " + OL.username);
    this.scene.start("Controls");
    this.scene.start("DigitalPlanet", {
      butterflies: 3,
      mapKey: this.mapData.mapKey,
      groundTileset: this.mapData.groundTileset,
      objectTileset: this.mapData.objectTileset,
      serverClient: this.serverClient,
      exitTo: this.mapData.exitTo,
    });
  }
}
