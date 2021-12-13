import { OL } from './utils';
import { Stomp } from './lib/stomp';

export class GamServerClient {
    constructor() {
        this.CHAT = "/app/chat";
        this.JOIN = "/app/join";
        this.UPDATE_PLAYER = "/app/update/player";
        this.socket = new WebSocket(OL.SERVER_URL + "/lounge");
        this.stompClient = new Stomp.over(this.socket);
        this.stompClient.debug = false;
        return this;
    }
  
    connect() {
        this.stompClient.connect({}, (result) => {
            console.log(result);
            this.playerId = result.headers['user-name'];
        });
        return this;
    }

    join(username) {
        this.sendMessage(this.JOIN, username);
    }
  
    updatePlayer(input) {
        this.sendMessage(this.UPDATE_PLAYER,input);
    }
  
    sendChat(message) {
        this.sendMessage(this.CHAT, message);
    }
  
    sendMessage(topic, message) {
        this.stompClient.send(topic, {}, message);
    }

    sendMessageNoWait(topic, message) {
        this.stompClient.send(topic, {}, message);
    }
  }