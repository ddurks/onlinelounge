import { OL } from "./utils";
import { Player, Key } from "./Player";
import { Butterfly, OnlineBouncer } from "./Guys";
import {
  Bullet,
  GunFlash,
  MapItem,
  Sparkle,
  Coin,
  PLAYERITEM,
  SmokePuff,
} from "./Items";

const INPUT_UPDATE_RATE = 1000 / 30;

export const AREAS = {
  digitalplanet: 1,
  lounge: 2,
};

export class DigitalPlanet extends Phaser.Scene {
  constructor() {
    super("DigitalPlanet");
    this.players = new Map();
    this.bullets = new Map();
    this.looseCoins = new Map();
    this.butterflies = new Array();
    this.items = new Map();
    this.looks = new Array();
    this.lookIndex = OL.IS_MOBILE ? 1 : 0;
    this.MAX_BUTTERFLIES = 0;
    this.population = 0;
    this.paused = false;
    this.stateQueue = new Array();
    this.zoomLevel = 1;
    this.zoomMax = 3;
    this.entityInterpolationEnabled = true;
    this.restarting = false;
    this.lastInputSent = 0;
    this.lastDirection = -1; // -1 = no input
    this.lastHeldItem = null; // Track last held item to only emit when it changes
  }

  init(data) {
    if (data.exitTo) {
      this.exitTo = data.exitTo;
    }
    this.startData = data;

    if (
      this.startData.butterflies &&
      this.getCurrentArea(this.startData.mapKey) === AREAS.digitalplanet
    ) {
      this.MAX_BUTTERFLIES = this.startData.butterflies;
    } else {
      this.MAX_BUTTERFLIES = 0;
      this.butterflies = [];
    }
  }

  getCurrentArea(mapKey) {
    if (mapKey === "map") {
      return AREAS.digitalplanet;
    } else {
      return AREAS.lounge;
    }
  }

  clearMaps() {
    if (this.items.size > 0) {
      Array.from(this.items.values()).forEach((item) => {
        this.removeItem(item.itemId);
      });
      this.items = new Map();
    }
  }

  create() {
    this.serverClient = this.startData.serverClient;
    this.startTime = Date.now();
    this.looks = [
      "computer_guy",
      "phone_guy",
      "cute_guy",
      "walrus",
      "online_guy",
      "drawvid",
      "obama",
    ];
    this.map = this.make.tilemap({ key: this.startData.mapKey });
    this.groundTileset = this.map.addTilesetImage(
      this.startData.groundTileset.name,
      this.startData.groundTileset.ref,
    );
    this.objectTileset = this.map.addTilesetImage(
      this.startData.objectTileset.name,
      this.startData.objectTileset.ref,
    );
    this.belowLayer = this.map.createLayer("below", this.groundTileset, 0, 0);
    this.worldLayer = this.map.createLayer("world", this.objectTileset, 0, 0);
    this.aboveLayer = this.map.createLayer("above", this.objectTileset, 0, 0);
    this.aboveLayer.setDepth(10);

    this.worldLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(this.worldLayer);

    this.worldLayer.forEachTile((tile) => {
      if (tile.properties.info) {
        tile.physics.matterBody.body.info = tile.properties.info;
      }
    });

    // Create player and find world objects
    this.map.findObject("player", (object) => {
      if (object.name === "spawn") {
        // Don't use map spawn point - server is authoritative
        // Spawn at origin and wait for server position via gameSnapshot
        this.spawnPlayer1(0, 0);
      }

      if (object.name === "bouncerSpawn") {
        this.onlineBouncer = new OnlineBouncer(
          this,
          object.x + 16,
          object.y - 24,
        );
      }
    });

    this.matter.world.on("collisionstart", (event, bodyA, bodyB) => {
      if (
        (bodyA.type === "player1" && bodyB.type === "bouncer") ||
        (bodyB.type === "player1" && bodyA.type === "bouncer")
      ) {
        if (this.player.currentArea !== AREAS.lounge) {
          this.player.currentArea = AREAS.lounge;
          this.enterLounge();
        } else {
          this.exitLounge();
        }
      }
      if (
        (bodyA.info && bodyB.type === "player1") ||
        (bodyB.info && bodyA.type === "player1")
      ) {
        this.events.emit("displayPopup", {
          title: "info",
          text: bodyA.info ? bodyA.info : bodyB.info,
        });
      }
    });

    this.controls = {
      up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
      left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
      down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
      right: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.D,
        false,
      ),
      space: this.input.keyboard.addKey(
        Phaser.Input.Keyboard.KeyCodes.SPACE,
        false,
      ),
    };

    this.camera = this.cameras.main;
    this.camera.startFollow(this.player, true);
    this.camera.setBounds(
      0,
      -48,
      this.map.widthInPixels,
      this.map.heightInPixels,
    );

    // Setup event handlers (remove old ones to prevent duplicates on restart)
    const controlsEvents = this.scene.get("Controls").events;
    const eventHandlers = [
      ["openChat", () => this.openChatBox()],
      ["sendChat", () => this.sendChat()],
      ["zoomIn", () => this.zoomIn()],
      ["zoomOut", () => this.zoomOut()],
      ["lookChange", () => this.changeLook()],
      ["useItem", (item) => this.useItem(item)],
      ["holdingItem", (item) => this.nowHoldingItem(item)],
      ["closeEvent", () => this.windowClosed()],
      ["serverStats", () => this.serverClient.send({ t: "serverStats" })],
      [
        "buryConfirmed",
        () => this.serverClient.send({ t: "action", action: "bury" }),
      ],
      ["getLeaderboard", () => this.serverClient.send({ t: "leaderboard" })],
    ];

    eventHandlers.forEach(([event]) => controlsEvents.off(event));
    eventHandlers.forEach(([event, handler]) =>
      controlsEvents.on(event, handler),
    );

    this.sessionID = this.serverClient.sessionID
      ? this.serverClient.sessionID
      : undefined;
    if (this.sessionID) {
      // Don't add local player to the players map - that's only for remote players
      // Local player is managed separately as this.player
      // Note: getItems is not valid for OnlineLounge game logic
    }

    this.clearMaps();
    this.player.lookIndex = this.lookIndex;
    this.joinServer();

    // turn off events so they don't duplicate upon restart
    this.serverClient.off("state");
    this.serverClient.off("playerAction");
    this.serverClient.off("playerLeft");
    this.serverClient.off("enterLounge");
    this.serverClient.off("exitLounge");
    this.serverClient.off("healthUpdate");
    this.serverClient.off("bulletUpdate");
    this.serverClient.off("coinUpdate");
    this.serverClient.off("treasureFound");
    this.serverClient.off("item");
    this.serverClient.off("getItems");
    this.serverClient.off("resetItems");
    this.serverClient.off("feed");
    this.serverClient.off("serverStats");
    this.serverClient.off("leaderboard");
    this.serverClient.off("leaderboardUpdate");

    // Handle new game-state message format from WorldServer
    this.serverClient.on("gameSnapshot", (state) => {
      if (!this.restarting) {
        this.updateGameStateFromWorldServer(state);
      }
    });

    // Fallback for raw game state
    this.serverClient.on("state", (state) => {
      if (!this.restarting) {
        if (this.entityInterpolationEnabled) {
          this.updateGameStateWithInterpolation(state);
        } else {
          this.updateGameState(state);
        }
      }
    });
    this.serverClient.on("playerAction", (playerAction) => {
      this.updatePlayerAction(playerAction);
    });
    this.serverClient.on("playerLeft", (playerId) =>
      this.removePlayer(playerId),
    );
    this.serverClient.on("enterLounge", (playerId) => {
      let playerWhoEnteredLounge = this.players.get(playerId);
      if (playerWhoEnteredLounge) {
        playerWhoEnteredLounge.currentArea = AREAS.lounge;
      }
    });
    this.serverClient.on("exitLounge", (playerId) => {
      let playerWhoExitedLounge = this.players.get(playerId);
      if (playerWhoExitedLounge) {
        playerWhoExitedLounge.currentArea = AREAS.digitalplanet;
      }
    });
    this.serverClient.on("healthUpdate", (update) =>
      this.events.emit("healthUpdate", update),
    );
    this.serverClient.on("bulletUpdate", (update) =>
      this.events.emit("bulletUpdate", update),
    );
    this.serverClient.on("coinUpdate", (update) => {
      new Sparkle(this, this.player.x, this.player.y);
      this.events.emit("coinUpdate", update);
    });
    this.serverClient.on("item", (update) => this.updateItems(update));
    this.serverClient.on("getItems", (list) => this.setItems(list));
    this.serverClient.on("resetItems", () => this.clearMaps());
    this.serverClient.on("feed", (update) =>
      this.events.emit("feedUpdate", update),
    );
    this.serverClient.on("treasureFound", (treasure) =>
      this.events.emit("displayPopup", {
        title: "Treasure 💰",
        text:
          "You unearthed the treasure of " +
          (treasure.buriedBy ? treasure.buriedBy : "[anonymous]") +
          "! (" +
          treasure.coins +
          ")",
        gif: "treasure",
      }),
    );
    this.serverClient.on("serverStats", (stats) => {
      this.events.emit("displayPopup", {
        title: "lounge stats",
        text:
          "population:  " +
          this.population +
          "   uptime:  " +
          stats.uptime +
          "   engine:  " +
          stats.engineTick +
          " hz  server:  " +
          stats.serverTick +
          "  hz unique visitors:  " +
          stats.uniqueVisitors,
      });
    });
    this.serverClient.on("leaderboard", (leaderboard) =>
      this.events.emit("displayLeaderboard", leaderboard),
    );
    this.serverClient.on("leaderboardUpdate", (leaderboard) =>
      this.events.emit("updateLeaderboard", leaderboard),
    );

    // Note: Input is now sent via handleUserInput() with proper throttling
    // Removed old setInterval that sent malformed keysPressed object

    this.restarting = false;
  }

  joinServer() {
    this.serverClient.join(this.player, (sessionID) => {
      // Set offline status if not connected to server
      if (!this.serverClient.connected) {
        this.events.emit("connectionStatus", false);
        this.events.emit("populationUpdate", "-");
        this.events.emit("feedUpdate", "⚠️ DEMO ONLY - CURRENTLY OFFLINE");
      } else {
        this.events.emit("connectionStatus", true);
        this.events.emit("populationUpdate", this.population);
      }
      this.sessionID = sessionID;
      this.player.playerId = sessionID;
      // Don't add local player to players map - only for remote players
      this.serverClient.off("disconnected");
      this.serverClient.on("disconnected", () => {
        this.events.emit("connectionStatus", false);
        this.events.emit("populationUpdate", "-");
        this.players.forEach((player) => {
          if (player.playerId !== this.sessionID) {
            this.removePlayer(player.playerId);
          }
        });
        this.sessionID = null;
        this.player.setHoldItem(false);
        this.clearMaps();
        alert(
          "disconnected from the server, try reloading the page to reconnect",
        );
      });
    });
  }

  nowHoldingItem(playerItem) {
    // Optimistic update: immediately change local player item and UI
    this.player.setHoldItem(playerItem);
    // Call Controls.holdingItem directly to avoid event loop
    this.scene.get("Controls").holdingItem(playerItem);
    this.lastHeldItem = playerItem;

    // Send command to server to sync (fire and forget, UI already updated)
    const itemCommands = {
      [PLAYERITEM.gun]: "/gun",
      [PLAYERITEM.shovel]: "/shovel",
      [PLAYERITEM.bury]: "/bury",
      [PLAYERITEM.beer]: "/beer",
      [PLAYERITEM.controller]: "/controller",
      [PLAYERITEM.water]: "/water",
      [PLAYERITEM.pizza]: "/pizza",
      [PLAYERITEM.bong]: "/bong",
    };

    if (itemCommands[playerItem]) {
      this.serverClient.send({
        t: "action",
        message: itemCommands[playerItem],
      });
    }
  }

  windowClosed() {
    this.paused = false;
  }

  useItem(playerItem) {
    if (this.player.currentArea === AREAS.digitalplanet) {
      switch (playerItem) {
        case PLAYERITEM.gun:
          console.log(
            "[useItem] Shooting in direction:",
            this.player.direction,
            "keys pressed:",
            this.player.keysPressed,
          );
          this.serverClient.send({
            t: "action",
            action: "shoot",
            direction: this.player.direction,
          });
          break;
        case PLAYERITEM.shovel:
          this.serverClient.send({
            t: "action",
            action: "dig",
          });
          break;
        case PLAYERITEM.bury:
          this.events.emit("buryHere");
          break;
      }
    }
  }

  changeLook() {
    // Guard: ensure player exists before changing look
    if (!this.player) {
      console.warn("changeLook: player not yet spawned");
      return;
    }

    if (this.lookIndex < this.looks.length - 1) {
      this.lookIndex++;
    } else {
      this.lookIndex = 0;
    }
    let pos = {
      x: this.player.x,
      y: this.player.y,
    };
    this.serverClient.send({
      t: "action",
      lookIndex: this.lookIndex,
    });
    this.camera.stopFollow();

    // Remove old player's matter body properly
    if (this.player.body) {
      this.player.setCollisionCategory(null);
      this.matter.world.remove(this.player.body);
    }

    // Destroy old player sprite
    this.player.destroyStuff && this.player.destroyStuff();
    this.player.destroy();

    // Create new player with new look
    this.player = this.generatePlayer(
      null, // Local player should NOT have a playerId
      pos.x,
      pos.y,
      OL.username,
      this.lookIndex,
    );

    if (this.player && this.player.body) {
      this.player.body.type = "player1";
      this.player.currentArea = this.getCurrentArea(this.startData.mapKey);
      this.player.createPlayerMarker();
      this.events.emit("playerLoaded", { texture: this.looks[this.lookIndex] });
      this.camera.startFollow(this.player, true);
    } else {
      console.error("changeLook: failed to generate new player");
    }
  }

  spawnPlayer1(x, y) {
    this.player = this.generatePlayer(null, x, y, OL.username, this.lookIndex);
    this.player.body.type = "player1";
    this.player.currentArea = this.getCurrentArea(this.startData.mapKey);
    // Don't create marker yet - wait for first server position update
    this.events.emit("playerLoaded", { texture: this.player.texture.key });
  }

  changePlayerLook(player, index) {
    let playerId = player.playerId;
    let username = player.username;
    let pos = {
      x: player.x,
      y: player.y,
    };
    player.setCollisionCategory(null);
    this.matter.world.remove(player);
    this.removePlayer(playerId);
    let newPlayer = this.generatePlayer(
      playerId,
      pos.x,
      pos.y,
      username,
      index,
    );
    this.players.set(playerId, newPlayer);
  }

  enterLounge() {
    this.player.currentArea = AREAS.lounge;
    this.serverClient.send({ t: "enterLounge" });
    this.camera.stopFollow();
    this.restarting = true;
    this.scene.restart({
      mapKey: "loungeMap",
      groundTileset: {
        name: "online-lounge-objects-extruded",
        ref: "loungeTiles",
      },
      objectTileset: {
        name: "online-lounge-objects-extruded",
        ref: "loungeTiles",
      },
      serverClient: this.serverClient,
      exitTo: this.startData,
    });
  }

  exitLounge() {
    this.player.currentArea = AREAS.digitalplanet;
    this.serverClient.send({ t: "exitLounge" });
    this.exitTo.serverClient = this.serverClient;
    this.exitTo.spawn = {
      x: 525,
      y: 325,
    };
    this.camera.stopFollow();
    this.restarting = true;
    this.scene.restart(this.exitTo);
  }

  update(time, delta) {
    if (!this.paused) {
      if (this.player && this.player.body) {
        this.playerHandler(delta);
        this.updateAllButterflies();
      }
    }
  }

  zoomIn() {
    if (this.zoomLevel < this.zoomMax) {
      this.zoomLevel++;
      this.zoom(this.zoomLevel);
    }
  }

  zoomOut() {
    if (this.zoomLevel > 1) {
      this.zoomLevel--;
      this.zoom(this.zoomLevel);
    }
  }

  zoom(level) {
    this.camera.pan(this.player.x, this.player.y, 100, "Power2");
    this.camera.zoomTo(level, 500);
  }

  openChatBox() {
    this.player.startTyping();
    this.serverClient.send({
      t: "action",
      typing: this.player.typing,
    });
    this.input.keyboard.enabled = false;
  }

  sendChat() {
    let message = document.getElementById("chat-entry").value;

    // Display message locally immediately (optimistic update)
    if (message && message !== "NULL") {
      this.player.setMsg(message);
    } else {
      this.player.setMsg("");
    }

    // Send to server if connected
    if (this.serverClient.connected) {
      this.serverClient.send({
        t: "action",
        message: message ? message : "NULL",
        typing: false,
      });
    }

    this.input.keyboard.enabled = true;
  }

  generatePlayer(playerId, x, y, username, lookIndex, heldItem) {
    const textureKey = this.looks[lookIndex];
    let player = new Player(this, x, y, textureKey, username);
    player.playerId = playerId;

    if (playerId) {
      this.players.set(playerId, player);
    }
    if (heldItem) {
      player.setHoldItem(heldItem);
    }
    return player;
  }

  removePlayer(playerId) {
    let playerWhoLeft = this.players.get(playerId);
    if (playerWhoLeft) {
      playerWhoLeft.destroyStuff();
      playerWhoLeft.destroy();
      this.players.delete(playerId);
    }
  }

  generateButterfly() {
    if (this.butterflies.length < this.MAX_BUTTERFLIES) {
      let butterfly = new Butterfly(
        this,
        this.player.x + OL.getRandomInt(-250, 250),
        this.player.y + OL.getRandomInt(-250, 250),
      );
      this.butterflies.push(butterfly);
      return butterfly;
    }
    return null;
  }

  updateAllButterflies() {
    if (this.MAX_BUTTERFLIES > 0) {
      let random = OL.getRandomInt(0, 800);
      if (random === 25) {
        this.generateButterfly();
      }
      this.butterflies.forEach((butterfly, index, butterflies) => {
        butterfly.update();
        if (
          butterfly.body &&
          !this.camera.worldView.contains(butterfly.x, butterfly.y)
        ) {
          butterflies.splice(index, 1);
          butterfly.destroy();
        }
      });
    }
  }

  updatePlayerAction(playerAction) {
    // Server broadcasts death with playerId = the player who died
    // Only that specific player should see the death splash screen
    const isThisPlayerDying = playerAction.playerId === this.sessionID;
    let playerToUpdate = this.players.get(playerAction.playerId);
    // Handle LOCAL player death - show splash screen and pause
    if (isThisPlayerDying && this.player) {
      if (playerAction.actions.faint || playerAction.actions.death) {
        this.player.faint();
        new SmokePuff(this, this.player.x, this.player.y - 12);
        this.events.emit("coinUpdate", 0);
        this.events.emit("displayPopup", {
          title: "💀",
          text: "close this window to continue",
          gif: "dead",
        });
        this.paused = true;
      }
      if (playerAction.actions.smoke) {
        new SmokePuff(this, this.player.x, this.player.y - 12);
      }
      // Handle item change from command - local player shows gun in their hand
      if (playerAction.actions.itemChange !== undefined) {
        this.player.setHoldItem(playerAction.actions.itemChange);
        // Emit on Controls scene so the UI buttons update
        this.scene
          .get("Controls")
          .events.emit("holdingItem", playerAction.actions.itemChange);
      }
      // Handle item pickup for local player - play sparkle
      if (playerAction.actions.itemPickup !== undefined) {
        new Sparkle(this, this.player.x, this.player.y);
      }
      // Handle chat for local player
      if (playerAction.actions.message !== undefined) {
        if (playerAction.actions.message === "NULL") {
          this.player.setMsg("");
        } else {
          this.player.setMsg(playerAction.actions.message);
        }
      }
      return; // Don't process remote player logic for the local player
    }

    // Handle REMOTE player actions - NO splash screen for death, just animation
    if (playerToUpdate) {
      if (playerAction.actions.flinch) {
        playerToUpdate.flinch();
      }
      if (playerAction.actions.faint || playerAction.actions.death) {
        playerToUpdate.faint();
      }
      if (playerAction.actions.smoke) {
        new SmokePuff(this, playerToUpdate.x, playerToUpdate.y - 12);
      }
      if (playerAction.actions.message !== undefined) {
        if (playerAction.actions.message === "NULL") {
          playerToUpdate.setMsg("");
        } else {
          playerToUpdate.setMsg(playerAction.actions.message);
        }
      }
      if (playerAction.actions.typing) {
        playerToUpdate.startTyping();
      }
      // Handle look change for remote players
      if (playerAction.actions.lookIndex !== undefined) {
        this.changePlayerLook(playerToUpdate, playerAction.actions.lookIndex);
      }
      // Handle item change for remote players
      if (playerAction.actions.itemChange !== undefined) {
        playerToUpdate.setHoldItem(playerAction.actions.itemChange);
      }
      // Handle item pickup - play sparkle
      if (playerAction.actions.itemPickup !== undefined) {
        new Sparkle(this, playerToUpdate.x, playerToUpdate.y);
      }
      // Handle zone transitions for other players
      if (playerAction.actions.enterLounge) {
        // Remote player entered lounge - remove from current map if we're not in lounge
        if (this.player.currentArea !== AREAS.lounge) {
          playerToUpdate.destroy();
          this.players.delete(playerAction.playerId);
        }
      }
      if (playerAction.actions.exitLounge) {
        // Remote player exited lounge - remove from current map if we're in lounge
        if (this.player.currentArea === AREAS.lounge) {
          playerToUpdate.destroy();
          this.players.delete(playerAction.playerId);
        }
      }
    }
  }

  updateGameStateFromWorldServer(state) {
    // The snapshot is already converted by WorldServerClient
    // state.players = remote players only (already filtered)
    // state.you = local player data from server

    // Update local player position from server state
    if (state.you && this.player) {
      if (state.you.x !== undefined && state.you.y !== undefined) {
        // Server-authoritative position update
        // For Matter physics, we need to update both position and sync the body
        this.player.setPosition(state.you.x, state.you.y);

        // Also clear velocity to prevent the body from fighting position
        if (this.player.body) {
          this.player.setVelocity(0, 0);
        }
      }

      // Update local player's held item from server
      if (state.you.currentItem !== undefined) {
        this.player.setHoldItem(state.you.currentItem);
        // Only emit holdingItem event if the item actually changed to avoid spamming the UI
        if (state.you.currentItem !== this.lastHeldItem) {
          this.lastHeldItem = state.you.currentItem;
          // Emit on Controls scene so the UI buttons update (also works with null to hide buttons)
          this.scene
            .get("Controls")
            .events.emit("holdingItem", state.you.currentItem);
        }
      }

      // Create marker on first update if not already created
      if (!this.player.playermarker) {
        this.player.createPlayerMarker();
      }
    }

    // Process the state (remote players, bullets, coins)
    this.updateGameState(state);
  }

  updateGameStateWithInterpolation(state) {
    this.lastTickAt = Date.now();
    state.timestamp = Date.now();
    this.stateQueue.push(state);
    if (this.stateQueue.length > 0) {
      this.lastStateUpdate = this.stateQueue.shift();
      this.updateGameState(this.lastStateUpdate);
    }
  }

  updateGameState(state) {
    this.updatePlayers(state);
    this.updateBulletState(state.bullets);
    this.updateCoinsState(state.coins);
  }

  updatePlayers(state) {
    if (state.players) {
      // Population includes local player + remote players
      const totalPopulation = state.players.length + 1; // +1 for local player
      if (
        totalPopulation > this.population ||
        totalPopulation < this.population
      ) {
        this.population = totalPopulation;
        this.events.emit("populationUpdate", this.population);
      }

      // Track which remote players are in the current update
      const remotePlayerIds = new Set(state.players.map((p) => p.playerId));

      state.players.forEach((playerData) => {
        if (playerData.currentArea === this.player.currentArea) {
          var playerToUpdate = this.players.get(playerData.playerId);

          if (!playerToUpdate) {
            let newRemotePlayer = this.generatePlayer(
              playerData.playerId,
              playerData.x,
              playerData.y,
              playerData.username,
              playerData.lookIndex,
              playerData.currentItem,
            );
            // Don't create marker for remote players - only local player has marker
          } else if (
            playerToUpdate &&
            playerToUpdate.body &&
            this.player.body !== undefined
          ) {
            playerToUpdate.updateFromData(playerData);
          } else {
            this.removePlayer(playerData.playerId);
          }
        } else {
          this.removePlayer(playerData.playerId);
        }
      });

      // Remove players that are no longer in the state (left the area/server)
      Array.from(this.players.keys()).forEach((playerId) => {
        if (!remotePlayerIds.has(playerId)) {
          this.removePlayer(playerId);
        }
      });
    }
  }

  updateBulletState(bulletsList) {
    let idSet = new Set();
    if (bulletsList) {
      bulletsList.forEach((bullet) => {
        idSet.add(bullet.bulletId);
        var bulletToUpdate = this.bullets.get(bullet.bulletId);
        if (!bulletToUpdate) {
          this.bullets.set(
            bullet.bulletId,
            new Bullet(
              this,
              bullet.bulletId,
              bullet.x,
              bullet.y,
              bullet.direction,
            ),
          );
          // Only show gun flash for bullets from OTHER players, not the local player
          if (bullet.playerId !== this.sessionID) {
            new GunFlash(this, bullet.x, bullet.y, bullet.direction);
          }
        } else if (bulletToUpdate && bulletToUpdate.body) {
          bulletToUpdate.setPosition(bullet.x, bullet.y);
        } else {
          this.removeBullet(bulletToUpdate.bulletId);
        }
      });
    }
    Array.from(this.bullets.values()).forEach((bullet) => {
      if (!idSet.has(bullet.bulletId)) {
        this.removeBullet(bullet.bulletId);
      }
    });
  }

  removeBullet(id) {
    let bulletToRemove = this.bullets.get(id);
    if (bulletToRemove) {
      this.matter.world.remove(bulletToRemove);
      bulletToRemove.destroy();
      this.bullets.delete(bulletToRemove.bulletId);
    }
  }

  updateCoinsState(coinsList) {
    let idSet = new Set();
    if (coinsList) {
      coinsList.forEach((coin) => {
        idSet.add(coin.itemId);
        var coinToUpdate = this.looseCoins.get(coin.itemId);
        if (!coinToUpdate) {
          this.looseCoins.set(
            coin.itemId,
            new Coin(this, coin.itemId, coin.x, coin.y),
          );
        } else if (coinToUpdate && coinToUpdate.body) {
          coinToUpdate.setPosition(coin.x, coin.y);
        } else {
          this.removeCoin(coinToUpdate.itemId);
        }
      });
    }
    Array.from(this.looseCoins.values()).forEach((coin) => {
      if (!idSet.has(coin.itemId)) {
        this.removeCoin(coin.itemId);
      }
    });
  }

  removeCoin(id) {
    let coinToRemove = this.looseCoins.get(id);
    if (coinToRemove) {
      this.matter.world.remove(coinToRemove);
      coinToRemove.destroy();
      this.looseCoins.delete(coinToRemove.itemId);
    }
  }

  setItems(itemList) {
    if (itemList) {
      itemList.forEach((item) => {
        if (!this.items.has(item.itemId)) {
          this.items.set(
            item.itemId,
            new MapItem(this, item.itemId, item.x, item.y, item.itemType),
          );
        }
      });
    }
  }

  updateItems(update) {
    if (update.spawn && this.player.currentArea === AREAS.digitalplanet) {
      this.items.set(
        update.spawn.itemId,
        new MapItem(
          this,
          update.spawn.itemId,
          update.spawn.x,
          update.spawn.y,
          update.spawn.itemType,
        ),
      );
    }
    if (update.remove) {
      this.removeItem(update.remove.itemId);
    }
  }

  removeItem(id) {
    let itemToDelete = this.items.get(id);
    if (itemToDelete) {
      itemToDelete.destroy();
      this.matter.world.remove(itemToDelete);
      this.items.delete(itemToDelete.itemId);
    }
  }

  playerHandler(delta) {
    if (OL.IS_MOBILE) {
      this.playerMobileMovementHandler();
    } else {
      this.playerMovementHandler();
    }
    this.entityInterpolation();

    // Update local player UI elements (name, marker, etc)
    if (this.player && this.player.body) {
      this.player.msgDecayHandler(delta);
      this.player.updatePlayerStuff();
    }

    // Update remote players
    this.players.forEach((player) => {
      if (player.body) {
        player.msgDecayHandler(delta);
        player.updatePlayerStuff();
      }
    });
  }

  entityInterpolation() {
    if (
      this.entityInterpolationEnabled &&
      this.lastStateUpdate &&
      this.stateQueue[0]
    ) {
      let targetTick =
        this.stateQueue[0].timestamp - this.lastStateUpdate.timestamp;
      let portion = Date.now() - this.lastTickAt;
      let ratio = portion / targetTick < 1 ? portion / targetTick : 1;
      for (let i = 0; i < this.lastStateUpdate.players.length; i++) {
        let player = this.players.get(this.lastStateUpdate.players[i].playerId);
        if (
          player &&
          this.lastStateUpdate.players[i] &&
          this.stateQueue[0].players[i]
        ) {
          let interpX = this.lerp(
            this.lastStateUpdate.players[i].x,
            this.stateQueue[0].players[i].x,
            ratio,
          );
          let interpY = this.lerp(
            this.lastStateUpdate.players[i].y,
            this.stateQueue[0].players[i].y,
            ratio,
          );
          player.setPosition(interpX, interpY);
        }
      }
    }
  }

  lerp(a, b, n) {
    return (1 - n) * a + n * b;
  }

  playerMovementHandler() {
    this.handleUserInput(this.controls);
  }

  playerMobileMovementHandler() {
    this.handleUserInput(
      this.scene.get("Controls").joystick.createCursorKeys(),
    );
  }

  handleUserInput(controls) {
    if (this.player.anims) {
      let currentDirection = -1;

      if (controls.left.isDown) {
        this.player.keysPressed[Key.a] = 1;
        this.player.direction = Key.a;
        currentDirection = Key.a;
      } else {
        this.player.keysPressed[Key.a] = 0;
      }
      if (controls.right.isDown) {
        this.player.keysPressed[Key.d] = 1;
        this.player.direction = Key.d;
        currentDirection = Key.d;
      } else {
        this.player.keysPressed[Key.d] = 0;
      }
      if (controls.up.isDown) {
        this.player.keysPressed[Key.w] = 1;
        this.player.direction = Key.w;
        currentDirection = Key.w;
      } else {
        this.player.keysPressed[Key.w] = 0;
      }
      if (controls.down.isDown) {
        this.player.keysPressed[Key.s] = 1;
        this.player.direction = Key.s;
        currentDirection = Key.s;
      } else {
        this.player.keysPressed[Key.s] = 0;
      }

      // Send input to server if direction changed or enough time has passed
      const now = Date.now();

      // Calculate mx and mz from all currently pressed keys (allows diagonal)
      let mx = 0,
        mz = 0;
      if (this.player.keysPressed[Key.a] === 1) mx -= 1;
      if (this.player.keysPressed[Key.d] === 1) mx += 1;
      if (this.player.keysPressed[Key.w] === 1) mz -= 1;
      if (this.player.keysPressed[Key.s] === 1) mz += 1;

      // Create a composite key for tracking direction changes
      const compositeDirection = `${mx},${mz}`;

      if (
        compositeDirection !== this.lastCompositeDirection ||
        now - this.lastInputSent > INPUT_UPDATE_RATE
      ) {
        this.lastCompositeDirection = compositeDirection;
        this.lastInputSent = now;

        // Send to server using proper "in" message format
        const inputSequence = (this.inputSequence || 0) + 1;
        this.inputSequence = inputSequence;

        this.serverClient.send({
          t: "in",
          seq: inputSequence,
          mx: mx,
          mz: mz,
          yaw: 0,
          jump: false,
        });
      }

      this.updatePlayerFromInput(this.player);
    }
  }

  updatePlayerFromInput(player) {
    // Server-authoritative movement: Just update animations, don't apply forces
    // Server will update position via gameSnapshot messages
    if (player.keysPressed[Key.a] === 1) {
      this.player.anims.play("left", true);
    } else if (player.keysPressed[Key.d] === 1) {
      this.player.anims.play("right", true);
    } else if (player.keysPressed[Key.w] === 1) {
      this.player.anims.play("up", true);
    } else if (player.keysPressed[Key.s] === 1) {
      this.player.anims.play("down", true);
    } else {
      this.player.anims.pause();
    }
  }
}
