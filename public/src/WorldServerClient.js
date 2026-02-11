/**
 * WorldServer WebSocket Client for OnlineLounge
 * Handles connection, authentication, and message protocol
 */

// Configuration
const GAME_KEY = "onlinelounge";
const MATCHMAKER_TIMEOUT = 200000; // 200 seconds for world server startup
const CONNECTION_TIMEOUT = 10000; // 10 seconds for WebSocket handshake

// Backend URLs from webpack DefinePlugin or window globals (for S3 static site)
const WORLDSERVER_BASE_URL =
  process.env.WORLDSERVER_URL ||
  (typeof window !== "undefined" && window.WORLDSERVER_URL) ||
  "wss://onlinelounge-world.drawvid.com:443";
const MATCHMAKER_URL =
  (typeof window !== "undefined" && window.MATCHMAKER_URL) ||
  "wss://matchmaker.drawvid.com";

export class WorldServerClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.sessionID = null;
    this.jwt = null;
    this.username = null;
    this.listeners = new Map();
    this.messageQueue = [];
    this.isOffline = false;
    this.lastItems = new Map(); // Track items to detect spawn/remove
    this.lastCoinCount = undefined;
  }

  /**
   * Get server assignment from matchmaker via WebSocket (or direct for local dev)
   * @param {Function} onProgress - Optional callback(progress, message) for UI updates during world startup
   */
  async getServerAssignment(onProgress = null) {
    // Skip matchmaker only if worldserver is configured for localhost
    const isLocalWorldServer =
      WORLDSERVER_BASE_URL.includes("localhost") ||
      WORLDSERVER_BASE_URL.includes("127.0.0.1");
    if (isLocalWorldServer) {
      return {
        serverUrl: WORLDSERVER_BASE_URL,
        jwt: "local-dev-bypass",
      };
    }

    return new Promise((resolve, reject) => {
      try {
        // Connect to WebSocket matchmaker
        // Custom domain mapping already includes stage routing, so don't add /prod
        const matchmakerUrl = MATCHMAKER_URL.replace(/^http/, "wss");
        const matchmakerWs = new WebSocket(matchmakerUrl);

        // Increase timeout to account for server startup time
        const timeout = setTimeout(() => {
          matchmakerWs.close();
          reject(
            new Error(
              "Matchmaker connection timeout (world server took too long to start)",
            ),
          );
        }, MATCHMAKER_TIMEOUT);

        matchmakerWs.onopen = () => {
          // Send createWorld message
          if (onProgress) onProgress(0, "Creating world...");
          matchmakerWs.send(
            JSON.stringify({
              t: "createWorld",
              gameKey: GAME_KEY,
            }),
          );
        };

        matchmakerWs.onmessage = (event) => {
          const msg = JSON.parse(event.data);

          if (msg.t === "worldCreated") {
            // World created, now join it
            if (onProgress) onProgress(5, "Joining world...");
            matchmakerWs.send(
              JSON.stringify({
                t: "joinWorld",
                gameKey: GAME_KEY,
                worldId: msg.worldId,
              }),
            );
          } else if (msg.t === "status") {
            // Progress update from matchmaker during world startup
            if (onProgress) {
              const progress = msg.progress || 0;
              const statusMsg =
                msg.msg === "RUNNING" ? "Connected!" : "Starting server";
              onProgress(progress, statusMsg);
            }
          } else if (msg.t === "joinResult") {
            // Got server assignment
            clearTimeout(timeout);
            matchmakerWs.close();
            if (onProgress) onProgress(100, "Connecting to game...");
            resolve({
              serverUrl: `wss://${msg.endpoint.ip}:${msg.endpoint.port || 443}`,
              jwt: msg.token,
            });
          } else if (msg.t === "err") {
            clearTimeout(timeout);
            matchmakerWs.close();
            reject(new Error(msg.msg || "Matchmaker error"));
          }
        };

        matchmakerWs.onerror = (error) => {
          clearTimeout(timeout);
          console.error("Matchmaker WebSocket error:", error);
          reject(error);
        };

        matchmakerWs.onclose = () => {
          clearTimeout(timeout);
        };
      } catch (error) {
        console.error("Failed to connect to matchmaker:", error);
        reject(error);
      }
    });
  }

  /**
   * Connect to WorldServer
   * @param {string} username - Player username
   * @param {Function} onProgress - Optional callback(progress, message) for UI updates
   */
  async connect(username, onProgress = null) {
    this.username = username;

    try {
      // Get server assignment from matchmaker (passing progress callback)
      const assignment = await this.getServerAssignment(onProgress);
      const { serverUrl, jwt } = assignment;

      this.jwt = jwt;
      this.sessionID = jwt;

      // Connect via WebSocket
      this.ws = new WebSocket(`${serverUrl}?token=${jwt}`);

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onerror = (error) => this.handleError(error);
      this.ws.onclose = () => this.handleClose();

      // Wait for connection to establish
      return new Promise((resolve, reject) => {
        this.once("connected", () => resolve(this.sessionID));
        setTimeout(
          () => reject(new Error("World server connection timeout")),
          CONNECTION_TIMEOUT,
        );
      });
    } catch (error) {
      console.error("Failed to connect to WorldServer:", error);
      this.isOffline = true;
      this.connected = true;
      return "offline-" + Math.random().toString(36).substr(2, 9);
    }
  }

  /**
   * Send join message with player data
   */
  joinGame(playerData) {
    if (this.isOffline) return;

    const message = {
      t: "join",
      name: this.username,
      ...playerData,
    };

    this.send(message);
  }

  /**
   * Send player input (movement)
   * Format: {t: "in", seq, mx, mz, yaw, jump}
   */
  sendInput(direction = 0, mx = undefined, mz = 0, yaw = 0, jump = false) {
    if (this.isOffline) return;

    // Use direction as mx if mx not explicitly provided
    if (mx === undefined) {
      mx = direction;
    }

    this.inputSequence = (this.inputSequence || 0) + 1;
    const message = {
      t: "in",
      seq: this.inputSequence,
      mx: mx,
      mz: mz,
      yaw: yaw,
      jump: jump,
    };

    this.send(message);
  }

  /**
   * Send player action
   * @note Currently disabled - would require protocol extension
   */
  sendAction(action, payload = null) {
    if (this.isOffline) return;
    // TODO: Implement when server protocol supports custom actions
  }

  /**
   * Send message to server
   */
  send(message) {
    if (!this.connected || !this.ws) {
      this.messageQueue.push(message);
      return;
    }

    try {
      const jsonStr = JSON.stringify(message);
      this.ws.send(jsonStr);
    } catch (error) {
      console.error("Failed to send message:", error);
      this.messageQueue.push(message);
    }
  }

  /**
   * Register event listener
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Register one-time listener
   */
  once(event, callback) {
    const wrappedCallback = (...args) => {
      callback(...args);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * Unregister listener(s)
   * Can be called with just event name to remove all listeners, or with event + callback
   */
  off(event, callback) {
    if (!this.listeners.has(event)) return;

    // If no callback provided, remove all listeners for this event
    if (!callback) {
      this.listeners.delete(event);
      return;
    }

    // Otherwise remove just the specific callback
    const callbacks = this.listeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit event to listeners
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach((callback) => callback(...args));
  }

  /**
   * Handle WebSocket open
   */
  handleOpen() {
    this.connected = true;

    // Send auth message immediately
    const authMessage = {
      t: "auth",
      token: this.jwt,
    };
    this.send(authMessage);

    this.emit("connected", this.sessionID);

    // Flush message queue
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  /**
   * Handle incoming message
   */
  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      // Server uses 't' field for message type, not 'type'
      const messageType = data.t || data.type;

      // Map server message types to game events
      switch (messageType) {
        case "s":
          // Snapshot message from worldserver -> convert format for DigitalPlanet
          const converted = {
            players: (data.p || []).map((p) => ({
              playerId: p.id,
              username: p.name,
              x: p.x,
              y: p.y,
              lookIndex: p.lookIndex || 0,
              currentArea: 1,
              item: null,
            })),
            bullets: [],
            coins: [],
            you: data.you,
            mobs: data.m || [],
          };
          this.emit("state", converted);
          this.emit("gameSnapshot", converted);
          break;

        case "gameSnapshot":
          // OnlineLounge game state from OnlineLoungeGameLogic
          // Find local player from the players array
          const localPlayer = data.players?.find(
            (p) => p.id === this.sessionID,
          );
          const remotePlayersOL = (data.players || []).filter(
            (p) => p.id !== this.sessionID,
          );

          const convertedOL = {
            players: remotePlayersOL.map((p) => ({
              playerId: p.id,
              username: p.name,
              x: p.x,
              y: p.y,
              lookIndex: p.lookIndex || 0,
              currentArea: p.currentArea || 1,
              item: p.currentItem || null,
              health: p.health,
              bullets: p.bullets,
              currentInputs: p.currentInputs || { 0: 0, 1: 0, 2: 0, 3: 0 },
            })),
            bullets: (data.bullets || []).map((b) => {
              // Convert velocity to direction (0=w/up, 1=a/left, 2=s/down, 3=d/right)
              let direction = 2; // default to down

              // Determine direction from velocity
              const absVx = Math.abs(b.vx);
              const absVy = Math.abs(b.vy);

              if (absVy > absVx) {
                direction = b.vy < 0 ? 0 : 2; // up or down
              } else {
                direction = b.vx < 0 ? 1 : 3; // left or right
              }

              return {
                bulletId: b.id,
                x: b.x,
                y: b.y,
                direction: direction,
                playerId: b.playerId,
              };
            }),
            coins: (data.looseCoins || []).map((c) => ({
              itemId: c.id,
              x: c.x,
              y: c.y,
            })),
            you: localPlayer
              ? {
                  x: localPlayer.x,
                  y: localPlayer.y,
                  name: localPlayer.name,
                  id: localPlayer.id,
                  lookIndex: localPlayer.lookIndex || 0,
                  stats: localPlayer.stats,
                  health: localPlayer.health,
                  bullets: localPlayer.bullets,
                  currentItem: localPlayer.currentItem,
                }
              : null,
            mobs: [],
            tick: data.tick,
          };

          this.emit("state", convertedOL);
          this.emit("gameSnapshot", convertedOL);

          // Process broadcasts from the server
          if (data.broadcasts && Array.isArray(data.broadcasts)) {
            for (const broadcast of data.broadcasts) {
              switch (broadcast.type) {
                case "feed":
                  this.emit("feed", broadcast.data);
                  break;
                case "chat":
                  // Chat message: {playerId, playerName, message}
                  this.emit("playerAction", {
                    playerId: broadcast.data.playerId,
                    actions: { message: broadcast.data.message },
                  });
                  break;
                case "playerAction":
                  // Player action: {playerId, actions: {...}}
                  this.emit("playerAction", {
                    playerId: broadcast.data.playerId,
                    actions: broadcast.data.actions,
                  });
                  break;
                case "lookChange":
                  // Look change: {playerId, lookIndex}
                  this.emit("playerAction", {
                    playerId: broadcast.data.playerId,
                    actions: { lookIndex: broadcast.data.lookIndex },
                  });
                  break;
              }
            }
          }

          // Process items - emit getItems for initial load, item events for changes
          const currentItems = data.items || [];
          const currentItemIds = new Set(currentItems.map((i) => i.id));

          // Emit getItems with all current items on first snapshot or when reconnecting
          if (this.lastItems.size === 0 && currentItems.length > 0) {
            this.emit(
              "getItems",
              currentItems.map((item) => ({
                itemId: item.id,
                x: item.x,
                y: item.y,
                itemType: item.itemType,
              })),
            );
          } else {
            // Detect new items (spawned)
            for (const item of currentItems) {
              if (!this.lastItems.has(item.id)) {
                this.emit("item", {
                  spawn: {
                    itemId: item.id,
                    x: item.x,
                    y: item.y,
                    itemType: item.itemType,
                  },
                });
              }
            }

            // Detect removed items
            for (const [itemId] of this.lastItems) {
              if (!currentItemIds.has(itemId)) {
                this.emit("item", { remove: { itemId } });
              }
            }
          }

          // Update tracked items
          this.lastItems.clear();
          for (const item of currentItems) {
            this.lastItems.set(item.id, item);
          }

          // Emit individual updates for local player stats
          if (localPlayer) {
            this.emit("healthUpdate", localPlayer.health);
            this.emit("bulletUpdate", localPlayer.bullets);
            // Only emit coinUpdate when coins actually increase (to trigger sparkle)
            if (localPlayer.stats) {
              const newCoins = localPlayer.stats.coins;
              if (this.lastCoinCount === undefined) {
                this.lastCoinCount = newCoins;
              } else if (newCoins > this.lastCoinCount) {
                this.emit("coinUpdate", newCoins);
              }
              this.lastCoinCount = newCoins;
            }
          }
          break;

        case "welcome":
          this.sessionID = data.playerId;
          this.emit("welcome", data);
          break;

        case "bootstrapRequired":
          this.emit("bootstrapRequired", data);
          break;

        case "bootstrapData":
          this.emit("bootstrapData", data);
          break;

        case "chat":
          // Broadcast chat message
          this.emit("playerAction", {
            playerId: data.playerId,
            actions: { message: data.text },
          });
          break;

        case "b":
          // Bullet spawn
          this.emit("bulletUpdate", data);
          break;

        case "bh":
          // Bullet hit
          this.emit("bulletHit", data);
          break;

        case "gs":
          // Gun spawn broadcast
          this.emit("playerAction", {
            playerId: data.playerId,
            actions: { gunSpawn: true },
          });
          break;

        case "d":
          // Dance action
          this.emit("playerAction", {
            playerId: data.playerId,
            actions: { dance: true },
          });
          break;

        case "err":
          // Server validation error - only log if not a repeated INVALID_MESSAGE
          if (data.code !== "INVALID_MESSAGE") {
            console.error("Server error:", data.code, data.msg);
          }
          this.emit("error", data);
          break;

        default:
          // Emit event with the message type as the event name
          if (messageType) {
            this.emit(messageType, data);
          }
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
    }
  }

  /**
   * Handle WebSocket error
   */
  handleError(error) {
    console.error("WebSocket error:", error);
    this.emit("error", error);
  }

  /**
   * Handle WebSocket close
   */
  handleClose() {
    this.connected = false;
    this.emit("disconnected");
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.connected = false;
    this.sessionID = null;
  }
}

// Legacy Socket.IO compatibility wrapper
export class GameServerClient {
  constructor() {
    this.client = new WorldServerClient();

    // Create a proper event emitter for the socket interface
    this.socketListeners = new Map();

    this.socket = {
      emit: (event, data) => this.handleEmit(event, data),
      on: (event, callback) => this.addSocketListener(event, callback),
      off: (event, callback) => this.removeSocketListener(event, callback),
    };
    this.connected = false;
    this.cachedUsername = null;
    this.joinable = true;
    this.sessionID = null;
  }

  /**
   * Add socket event listener
   */
  addSocketListener(event, callback) {
    if (!this.socketListeners.has(event)) {
      this.socketListeners.set(event, []);
    }
    this.socketListeners.get(event).push(callback);
  }

  /**
   * Remove socket event listener
   */
  removeSocketListener(event, callback) {
    if (!this.socketListeners.has(event)) return;
    const callbacks = this.socketListeners.get(event);
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit socket event to all listeners
   */
  emitSocketEvent(event, data) {
    if (!this.socketListeners.has(event)) return;
    this.socketListeners.get(event).forEach((callback) => callback(data));
  }

  /**
   * Handle Socket.IO style emit
   */
  handleEmit(event, data) {
    switch (event) {
      case "new player":
        this.join(data, () => {});
        break;
      case "player input":
        // Extract mx from direction if provided
        if (typeof data === "number") {
          this.client.sendInput(data);
        } else if (data && typeof data === "object") {
          this.client.sendInput(
            data.direction || 0,
            data.mx,
            data.mz,
            data.yaw,
            data.jump,
          );
        }
        break;
      case "player action":
        this.client.sendAction(data.action, data.payload);
        break;
    }
  }

  /**
   * Convert WorldServer game state format to Socket.IO format
   * Maps OnlineLounge engine state to format expected by DigitalPlanet
   */
  convertGameState(state) {
    const converted = {
      // Map WorldServer players to Socket.IO player format
      // Filter out the local player - only include remote players
      players: (state.players || [])
        .filter((p) => p.id !== this.sessionID) // Exclude local player
        .map((p) => ({
          playerId: p.id,
          username: p.name,
          x: p.x,
          y: p.y,
          lookIndex: p.lookIndex || 0,
          item: null, // Not provided by server yet
          currentArea: 1, // OnlineLounge is all area 1 (unified 2D space)
          stats: p.stats || {},
        })),
      // Map items to coins format (loose coins on ground)
      coins: (state.items || [])
        .filter((item) => item.itemType === 2) // itemType 2 = Coin
        .map((coin) => ({
          itemId: coin.id,
          x: coin.x,
          y: coin.y,
        })),
      // Map bullets to game format
      bullets: (state.bullets || []).map((b) => ({
        bulletId: b.id,
        x: b.x,
        y: b.y,
        direction: 0, // Calculate from vx, vy if needed
        playerId: b.playerId,
      })),
      // Include treasures if available
      treasures: state.treasures || [],
      // Include raw state for debugging
      _raw: state,
    };

    return converted;
  }

  /**
   * Connect to server
   */
  async connect(username) {
    try {
      this.sessionID = await this.client.connect(username);
      this.connected = true;

      // Listen for game state updates
      this.client.on("state", (state) => {
        // Convert WorldServer format to Socket.IO format for backward compatibility
        const convertedState = this.convertGameState(state);
        // Emit to socket listeners (DigitalPlanet scene)
        this.emitSocketEvent("state", convertedState);
      });

      this.client.on("gameSnapshot", (state) => {
        const convertedState = this.convertGameState(state);
        // Emit to socket listeners (DigitalPlanet scene)
        this.emitSocketEvent("state", convertedState);
      });

      this.client.on("error", (error) => {
        // Suppress repeated INVALID_MESSAGE errors (protocol mismatch, not critical)
        if (error.code !== "INVALID_MESSAGE") {
          console.error("Connection error:", error);
        }
        this.joinable = false;
        this.emitSocketEvent("error", error);
      });

      this.client.on("disconnected", () => {
        this.connected = false;
        this.emitSocketEvent("disconnect", {});
      });

      return this.sessionID;
    } catch (error) {
      console.error("Connection failed:", error);
      this.joinable = false;
      throw error;
    }
  }

  /**
   * Send message to server
   */
  send(message) {
    return this.client.send(message);
  }

  /**
   * Listen for events (delegate to client)
   */
  on(event, callback) {
    return this.client.on(event, callback);
  }

  /**
   * Listen for events once (delegate to client)
   */
  once(event, callback) {
    return this.client.once(event, callback);
  }

  /**
   * Stop listening for events (delegate to client)
   */
  off(event, callback) {
    return this.client.off(event, callback);
  }

  /**
   * Join game (Socket.IO style)
   */
  join(player, onConnectCallback) {
    // Send join message to server
    this.client.joinGame({
      x: player.x,
      y: player.y,
      width: player.bodyWidth,
      height: player.bodyHeight,
      lookIndex: player.lookIndex,
      currentArea: player.currentArea,
    });

    // Wait for sessionID to be set from welcome message before calling callback
    if (this.sessionID && this.sessionID !== this.jwt) {
      // Already have a real sessionID from welcome message
      onConnectCallback(this.sessionID);
    } else {
      // Wait for welcome message to arrive
      this.once("welcome", (data) => {
        onConnectCallback(this.sessionID);
      });
    }
  }

  /**
   * Disconnect
   */
  disconnect() {
    this.client.disconnect();
  }

  /**
   * Send input (movement) to server
   */
  sendInput(direction = 0, mx = undefined, mz = 0, yaw = 0, jump = false) {
    return this.client.sendInput(direction, mx, mz, yaw, jump);
  }
}
