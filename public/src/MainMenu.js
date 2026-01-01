import { OL } from "./utils";
import { GameServerClient } from "./GameServerClient";

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

    this.clickStart();
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
