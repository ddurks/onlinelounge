// Set OFFLINE_MODE to true for static deployment without backend
// Set to false for online multiplayer mode (requires backend server)
const OFFLINE_MODE = typeof window !== 'undefined' && window.OFFLINE_MODE === true;

// Export for other modules to check
export const IS_OFFLINE_MODE = OFFLINE_MODE;

let io;
if (!OFFLINE_MODE) {
  try {
    io = require("socket.io-client").io;
  } catch (e) {
    console.log("Socket.io not available, running in offline mode");
  }
}

export class GameServerClient {
  constructor() {
    if (OFFLINE_MODE || !io) {
      this.socket = {
        emit: () => {},
        on: () => {},
        off: () => {},
      };
      this.connected = true;
      this.cachedUsername = null;
      this.joinable = true;
      this.sessionID = "offline-" + Math.random().toString(36).substr(2, 9);
      console.log("Running in OFFLINE mode - single player");
    } else {
      this.socket = io({
        autoConnect: false,
      });
      this.connected = false;
      this.cachedUsername = null;
      this.joinable = true;
      this.connect();
    }
    return this;
  }

  connect() {
    if (OFFLINE_MODE || !io) return;

    this.connection = this.socket.connect();
    this.socket.on("lounge full", () => {
      alert(":( the lounge is currently full\ntry again later :)");
      this.joinable = false;
    });
    this.socket.on("connect", () => {
      this.sessionID = this.connection.id;
      this.connected = true;
    });
    this.socket.on("cached user", (userInfo) => {
      this.cachedUsername = userInfo.username;
    });
  }

  join(player, onConnectCallback) {
    if (OFFLINE_MODE || !io) {
      console.log("Offline mode - single player");
      onConnectCallback(this.sessionID);
      return;
    }

    if (this.joinable) {
      console.log("joined: " + this.sessionID);
      this.socket.emit("new player", {
        x: player.x,
        y: player.y,
        width: player.bodyWidth,
        height: player.bodyHeight,
        username: player.username,
        lookIndex: player.lookIndex,
        currentArea: player.currentArea,
      });
      onConnectCallback(this.sessionID);
    }
  }
}
