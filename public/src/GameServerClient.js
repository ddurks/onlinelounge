import { OL } from './utils';
const { io } = require("socket.io-client");

export class GamServerClient {
    constructor() {
        this.socket = io({
            autoConnect: false
        });
        this.connected = false;
        return this;
    }
  
    connect(player, onConnectCallback) {
        this.connection = this.socket.connect();
        this.socket.on('lounge full', () => {
            alert(":( the lounge is currently full\ntry again later :)");
        });
        this.join(player, onConnectCallback);
    }

    join(player, onConnectCallback) {
        this.socket.on('connect', () => {
            this.sessionID = this.connection.id;
            this.connected = true;
            this.socket.emit('new player', {
                x: player.x,
                y: player.y,
                width: player.bodyWidth,
                height: player.bodyHeight,
                username: player.username,
                fit: player.fit,
                currentArea: player.currentArea
            });
            onConnectCallback(this.sessionID);
        });
    }
}