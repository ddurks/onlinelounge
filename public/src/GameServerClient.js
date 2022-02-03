const { io } = require("socket.io-client");

export class GameServerClient {
    constructor() {
        this.socket = io({
            autoConnect: false
        });
        this.connected = false;
        this.cachedUsername = null;
        this.joinable = true;
        this.connect();
        return this;
    }
  
    connect() {
        this.connection = this.socket.connect();
        this.socket.on('lounge full', () => {
            alert(":( the lounge is currently full\ntry again later :)");
            this.joinable = false;
        });
        this.socket.on('connect', () => {
            this.sessionID = this.connection.id;
            this.connected = true;
        });
        this.socket.on('cached user', (userInfo) => {
            this.cachedUsername = userInfo.username;
        });
    }

    join(player, onConnectCallback) {
        if (this.joinable) {
            console.log("joined: " + this.sessionID);
            this.socket.emit('new player', {
                x: player.x,
                y: player.y,
                width: player.bodyWidth,
                height: player.bodyHeight,
                username: player.username,
                lookIndex: player.lookIndex,
                currentArea: player.currentArea
            });
            onConnectCallback(this.sessionID);
        }
    }
}