import { OL } from './utils';
import { Player, Key } from './Player';
import { Butterfly, OnlineBouncer } from './Guys';
import { Bullet, GunFlash, MapItem, ITEMTYPE, Sparkle, Coin } from './Items';
import { GameServerClient } from './GameServerClient';

const INPUT_UPDATE_RATE = 1000/30;

const AREAS = {
    'digitalplanet':0,
    'lounge':1
}

export class DigitalPlanet extends Phaser.Scene {
    constructor() {
        super('DigitalPlanet');
        this.players = new Map();
        this.bullets = new Map();
        this.looseCoins = new Map();
        this.butterflies = new Array();
        this.items = new Map();
        this.looks = new Array();
        this.lookIndex = OL.IS_MOBILE ? 1 : 0;
        this.MAX_BUTTERFLIES = 0;
        this.serverClient = new GameServerClient();
        this.population = 0;
        this.paused = false;
        this.stateQueue = new Array();
    }

    init(data) {
        if (data.exitTo) {
            this.exitTo = data.exitTo;
        }
        this.startData = data;
        
        if (this.startData.butterflies) {
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
            Array.from(this.items.values()).forEach(item => {
                this.removeItem(item.itemId);
            });
            this.items = new Map();
        }
    }

    create() { 
        this.looks = ['computer_guy', 'phone_guy', 'cute_guy'];
        this.map = this.make.tilemap({ key: this.startData.mapKey });
        this.groundTileset = this.map.addTilesetImage(this.startData.groundTileset.name, this.startData.groundTileset.ref);
        this.objectTileset = this.map.addTilesetImage(this.startData.objectTileset.name, this.startData.objectTileset.ref);
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

        this.player, this.onlineBouncer;
        if (this.startData.spawn) {
            this.spawnPlayer1(this.startData.spawn.x, this.startData.spawn.y);
        }
        this.map.findObject('player', (object) => {
            if (object.name === 'spawn' && !this.startData.spawn) {
                this.spawnPlayer1(object.x, object.y);
            }

            if (object.name === 'bouncerSpawn') {
                this.onlineBouncer = new OnlineBouncer(this, object.x + 16, object.y - 24);
            }
        });

        this.matter.world.on('collisionstart', (event, bodyA, bodyB) => {
            if ((bodyA.type === 'player1' && bodyB.type === 'bouncer') || (bodyB.type === 'player1' && bodyA.type === 'bouncer')) {
                if (this.player.currentArea !== AREAS.lounge) {
                    this.player.currentArea = AREAS.lounge
                    this.enterLounge();
                } else {
                    this.exitLounge();
                }
            }
            if ((bodyA.info && bodyB.type === "player1") || (bodyB.info && bodyA.type === "player1")) {
                this.events.emit('displayPopup', {title: "info", text: bodyA.info ? bodyA.info : bodyB.info});
            }
        });

        this.controls = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W, false),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A, false),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S, false),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D, false),
            space: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE, false)
        };

        this.camera = this.cameras.main;
        this.camera.startFollow(this.player, true);
        this.camera.setBounds(0, -48, this.map.widthInPixels, this.map.heightInPixels);

        // turn off events so they don't duplicate upon restart
        this.scene.get('Controls').events.off('openChat');
        this.scene.get('Controls').events.off('sendChat');
        this.scene.get('Controls').events.off('zoomIn');
        this.scene.get('Controls').events.off('zoomOut');
        this.scene.get('Controls').events.off('lookChange');
        this.scene.get('Controls').events.off('shootGun');
        this.scene.get('Controls').events.off('closeEvent');

        this.scene.get('Controls').events.on('openChat', () => this.openChatBox());
        this.scene.get('Controls').events.on('sendChat', () => this.sendChat());
        this.scene.get('Controls').events.on('zoomIn', () => this.zoomIn());
        this.scene.get('Controls').events.on('zoomOut', () => this.zoomOut());
        this.scene.get('Controls').events.on('lookChange', () => this.changeLook());
        this.scene.get('Controls').events.on('shootGun', () => this.shootGun());
        this.scene.get('Controls').events.on('closeEvent', () => this.windowClosed());

        this.sessionID = this.serverClient.sessionID ? this.serverClient.sessionID : undefined;
        if (this.sessionID) {
            this.players.set(this.sessionID, this.player);
            this.serverClient.socket.emit('get items', this.getCurrentArea(this.startData.mapKey));
        }

        this.clearMaps();
        this.player.lookIndex = this.lookIndex;
        this.serverClient.connect(this.player, (sessionID) => {
            console.log("connected: " + sessionID);
            this.events.emit('connectionStatus', true);
            this.events.emit('populationUpdate', this.population);
            this.sessionID = sessionID;
            this.player.socketId = sessionID;
            this.players.set(sessionID, this.player);
            this.player = this.players.get(sessionID);
            this.serverClient.socket.emit('get items', this.getCurrentArea(this.startData.mapKey));
            this.serverClient.socket.on('disconnect', () => {
                this.events.emit('connectionStatus', false);
                this.events.emit('populationUpdate', "-");
                this.players.forEach((player) => {
                    if (player.socketId !== this.sessionID) {
                        this.removePlayer(player.socketId);
                    }
                });
                this.events.emit('holdingGun', false);
                this.clearMaps();
                console.log("disconnected from server");
            })
        });

        // turn off events so they don't duplicate upon restart
        this.serverClient.socket.off('state');
        this.serverClient.socket.off('player action');
        this.serverClient.socket.off('player left');
        this.serverClient.socket.off('enter lounge');
        this.serverClient.socket.off('exit lounge');
        this.serverClient.socket.off('health update');
        this.serverClient.socket.off('bullet update');
        this.serverClient.socket.off('coin update');
        this.serverClient.socket.off('item');
        this.serverClient.socket.off('get items');
        this.serverClient.socket.off('feed');

        this.serverClient.socket.on('state', (state) => this.updateGameState(state));
        this.serverClient.socket.on('player action', (playerAction) => this.updatePlayerAction(playerAction));
        this.serverClient.socket.on('player left', (socketId) => this.removePlayer(socketId));
        this.serverClient.socket.on('enter lounge', (socketId) => {
            let playerWhoEnteredLounge = this.players.get(socketId);
            if (playerWhoEnteredLounge) {
                playerWhoEnteredLounge.currentArea = AREAS.lounge;
            }
        });
        this.serverClient.socket.on('exit lounge', (socketId) => {
            let playerWhoExitedLounge = this.players.get(socketId);
            if (playerWhoExitedLounge) {
                playerWhoExitedLounge.currentArea = AREAS.digitalplanet;
            }
        });
        this.serverClient.socket.on('health update', (update) => this.events.emit('healthUpdate', update));
        this.serverClient.socket.on('bullet update', (update) => this.events.emit('bulletUpdate', update));
        this.serverClient.socket.on('coin update', (update) => {
            new Sparkle(this, this.player.x, this.player.y);
            this.events.emit('coinUpdate', update);
        });
        this.serverClient.socket.on('item', (update) => this.updateItems(update));
        this.serverClient.socket.on('get items', (list) => this.setItems(list));
        this.serverClient.socket.on('feed', (update) => this.events.emit('feedUpdate', update));

        setInterval(() => {
                this.serverClient.socket.emit('player input', this.player.keysPressed);
        }, INPUT_UPDATE_RATE);
    }

    windowClosed() {
        this.paused = false;
    }

    shootGun() {
        this.serverClient.socket.emit('shoot bullet', this.player.direction);
    }

    changeLook() {
        if (this.lookIndex < this.looks.length - 1) {
            this.lookIndex++;
        } else {
            this.lookIndex = 0;
        }
        let pos = {
            x: this.player.x,
            y: this.player.y
        }
        this.serverClient.socket.emit('player action', { lookIndex: this.lookIndex });
        this.camera.stopFollow();
        this.player.setCollisionCategory(null);
        // matter body is not actually removed by this, not sure why (works in changePlayerLook)
        this.matter.world.remove(this.players.get(this.sessionID));
        this.removePlayer(this.sessionID);
        this.player = this.generatePlayer(this.sessionID, pos.x, pos.y, OL.username, this.lookIndex);
        this.player.body.type = 'player1';
        this.player.currentArea = this.getCurrentArea(this.startData.mapKey);
        this.players.set(this.sessionID, this.player);
        this.events.emit('playerLoaded', {texture: this.looks[this.lookIndex]});
        this.camera.startFollow(this.player, true);
    }

    spawnPlayer1(x, y) {
        this.player = this.generatePlayer(null, x, y, OL.username, this.lookIndex);
        this.player.body.type = 'player1';
        this.player.currentArea = this.getCurrentArea(this.startData.mapKey);
        this.events.emit('playerLoaded', {texture: this.player.texture.key});
    }

    changePlayerLook(player, index) {
        let socketId = player.socketId;
        let username = player.username;
        let pos = {
            x: player.x,
            y: player.y
        }
        player.setCollisionCategory(null);
        this.matter.world.remove(player);
        this.removePlayer(socketId);
        let newPlayer = this.generatePlayer(socketId, pos.x, pos.y, username, index);
        this.players.set(socketId, newPlayer);
    }

    enterLounge() {
        this.player.currentArea = AREAS.lounge;
        this.serverClient.socket.emit('enter lounge');
        this.camera.stopFollow();
        this.scene.restart({
            mapKey: "loungeMap",
            groundTileset: {
                name: "online-lounge-objects-extruded",
                ref: "loungeTiles"
            },
            objectTileset: {
                name: "online-lounge-objects-extruded",
                ref: "loungeTiles"
            },
            serverClient: this.serverClient,
            exitTo: this.startData
        });
    }

    exitLounge() {
        this.player.currentArea = AREAS.digitalplanet;
        this.serverClient.socket.emit('exit lounge');
        if (this.exitTo) {
            this.exitTo.spawn = {
                x: 525,
                y: 325
            }
            this.camera.stopFollow();
            this.scene.restart(this.exitTo);
        }
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
        this.camera.pan(this.player.x, this.player.y, 100, 'Power2');
        this.camera.zoomTo(2, 1000);
    }

    zoomOut() {
        this.camera.pan(this.player.x, this.player.y, 100, 'Power2');
        this.camera.zoomTo(1, 1000);    
    }

    openChatBox() {
        this.player.startTyping();
        this.serverClient.socket.emit('player action', { typing: this.player.typing });
        this.input.keyboard.enabled = false;
    }

    sendChat() {
        let message = document.getElementById("chat-entry").value;
        this.player.setMsg(message);
        this.serverClient.socket.emit('player action', { message: message ? message : "NULL", typing: false });
        this.input.keyboard.enabled = true;
    }

    generateCuteGuy(x, y) {
        var cuteGuy = this.matter.add.sprite(x, y, 'cute');
        cuteGuy.setScale(0.25);
        return cuteGuy;
    }

    generatePlayer(socketId, x, y, username, lookIndex) {
        let player = new Player(this, x, y, this.looks[lookIndex], username);
        player.socketId = socketId;
        if (socketId) {
            this.players.set(socketId, player);
        }
        return player;
    }

    removePlayer(socketId) {
        let playerWhoLeft = this.players.get(socketId);
        if (playerWhoLeft) {
            playerWhoLeft.destroyStuff();
            playerWhoLeft.destroy();
            this.players.delete(socketId);
        }
    }
    
    generateButterfly() {
        if(this.butterflies.length < this.MAX_BUTTERFLIES) {
            let butterfly = new Butterfly(this, this.player.x + OL.getRandomInt(-250, 250), this.player.y + OL.getRandomInt(-250, 250));
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
            this.butterflies.forEach( (butterfly, index, butterflies) => {
                butterfly.update();
                if (butterfly.body && !this.camera.worldView.contains(butterfly.x,butterfly.y)) {
                    butterflies.splice(index, 1);
                    butterfly.destroy();
                }
            });
        }
    }


    updatePlayerAction(playerAction) {
        let playerToUpdate = this.players.get(playerAction.socketId);
        if (playerToUpdate) {
            if (playerAction.actions.flinch) {
                playerToUpdate.flinch();
            }
            if (playerAction.actions.faint) {
                playerToUpdate.faint();
                if (playerAction.socketId === this.sessionID) {
                    this.events.emit('coinUpdate', 0);
                    this.events.emit('displayPopup', {title: "💀", text: "close this window to continue"});
                    this.paused = true;
                }
            }
        }
        if (playerToUpdate && playerAction.socketId !== this.sessionID) {
            if (playerAction.actions.message) {
                if (playerAction.actions.message === "NULL") {
                    playerToUpdate.setMsg("");
                } else {
                    playerToUpdate.setMsg(playerAction.actions.message);
                }
            }
            if (playerAction.actions.typing) {
                playerToUpdate.startTyping();
            }
            if ( (playerAction.actions.lookIndex || playerAction.actions.lookIndex === 0) && playerAction.actions.lookIndex >= 0) {
                this.changePlayerLook(playerToUpdate, playerAction.actions.lookIndex);
            }
        } else if(playerAction.actions.commandResult !== null && playerAction.actions.commandResult !== undefined) {
            if (playerAction.actions.commandResult.gun === true || playerAction.actions.commandResult.gun === false) {
                this.player.setMsg("*holding gun: " + playerAction.actions.commandResult.gun + "*");
                this.player.setHoldGun(playerAction.actions.commandResult.gun);
                this.events.emit('holdingGun', playerAction.actions.commandResult.gun);
            }
        }
    }

    updateGameStateFromQueue(state) {
        this.stateQueue.push(state);
        if (this.stateQueue.length > 2) {
            let stateUpdate = this.stateQueue.shift();
            this.updateGameState(stateUpdate);
        }
    }

    updateGameState(state) {
        if (state.players) {
            if (state.players.length > this.population || state.players.length < this.population) {
                this.population = state.players.length;
                this.events.emit('populationUpdate', this.population);
            }
            state.players.forEach((playerData) => {
                if (playerData.currentArea === this.player.currentArea) {
                    var playerToUpdate = this.players.get(playerData.socketId);
                    if (!playerToUpdate) {
                        if (playerData.socketId === this.sessionID) {
                            this.events.emit('playerLoaded', {texture: this.player.texture.key});
                        }
                        this.generatePlayer(playerData.socketId, playerData.x, playerData.y, playerData.username, playerData.lookIndex);
                    } else if (playerToUpdate && playerToUpdate.body) {
                        playerToUpdate.updateFromData(playerData);
                    } else {
                        console.log(playerToUpdate, "no body");
                        this.removePlayer(playerData.socketId);
                    }
                } else {
                    this.removePlayer(playerData.socketId);
                }
            });
        }
        this.updateBulletState(state.bullets);
        this.updateCoinsState(state.coins);
    }

    updateBulletState(bulletsList) {
        let idSet = new Set();
        if (bulletsList) {
            bulletsList.forEach((bullet) => {
                idSet.add(bullet.bulletId);
                var bulletToUpdate = this.bullets.get(bullet.bulletId);
                if (!bulletToUpdate) {
                    this.bullets.set(bullet.bulletId, new Bullet(this, bullet.bulletId, bullet.x, bullet.y, bullet.direction));
                    new GunFlash(this, bullet.x, bullet.y, bullet.direction);
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
            console.log("updating coins", coinsList.length);
            coinsList.forEach((coin) => {
                idSet.add(coin.itemId);
                var coinToUpdate = this.looseCoins.get(coin.itemId);
                if (!coinToUpdate) {
                    this.looseCoins.set(coin.itemId, new Coin(this, coin.itemId, coin.x, coin.y));
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
            console.log("remove coin");
            this.matter.world.remove(coinToRemove);
            coinToRemove.destroy();
            this.looseCoins.delete(coinToRemove.itemId);    
        }  
    }

    setItems(itemList) {
        if (itemList) {
            itemList.forEach((item) => {
                if (!this.items.has(item.itemId)) {
                    this.items.set(item.itemId, new MapItem(this, item.itemId, item.x, item.y, item.itemType));
                }
            });
        }
    }

    updateItems(update) {
        if (update.spawn) {
            this.items.set(update.spawn.itemId, new MapItem(this, update.spawn.itemId, update.spawn.x, update.spawn.y, update.spawn.itemType));
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
        this.players.forEach( (player) => {
            if (player.body) {
                player.msgDecayHandler(delta);
                player.updatePlayerStuff();
            }
        });
    }

    playerMovementHandler() {
        this.handleUserInput(this.controls);
    }

    playerMobileMovementHandler() {
        this.handleUserInput(this.scene.get('Controls').joystick.createCursorKeys());
    }

    handleUserInput(controls) {
        if (this.player.anims) {
            if (controls.left.isDown) {
                this.player.keysPressed[Key.a] = 1;
                this.player.anims.play('left', true);
                this.player.direction = Key.a;
            } else {
                this.player.keysPressed[Key.a] = 0;
            }
            if (controls.right.isDown) {
                this.player.keysPressed[Key.d] = 1;
                this.player.direction = Key.d;
                this.player.anims.play('right', true);
            } else {
                this.player.keysPressed[Key.d] = 0;
            }
            if (controls.up.isDown) {
                this.player.keysPressed[Key.w] = 1;
                this.player.direction = Key.w;
                this.player.anims.play('up', true);
            } else {
                this.player.keysPressed[Key.w] = 0;
            }
            if (controls.down.isDown) {
                this.player.keysPressed[Key.s] = 1;
                this.player.direction = Key.s;
                this.player.anims.play('down', true);
            } else {
                this.player.keysPressed[Key.s] = 0;
            }

            this.updatePlayerFromInput(this.player);

            if (!this.player.keysPressed[Key.w] && !this.player.keysPressed[Key.a] && !this.player.keysPressed[Key.s] && !this.player.keysPressed[Key.d]) {
                this.player.anims.pause();
            }
        }
    }

    updatePlayerFromInput(player) {
        if (player.keysPressed[Key.a] === 1) {
            //this.player.setVelocity(-OL.WALKING_SPEED, this.player.body.velocity.y);
            this.player.applyForce({x: -OL.WALKING_FORCE, y: 0});
        }
        if (player.keysPressed[Key.d] === 1) {
            //this.player.setVelocity(OL.WALKING_SPEED, this.player.body.velocity.y);
            this.player.applyForce({x: OL.WALKING_FORCE, y: 0});
        }
        if (player.keysPressed[Key.w] === 1) {
            //this.player.setVelocity(this.player.body.velocity.x, -OL.WALKING_SPEED);
            this.player.applyForce({x: 0, y: -OL.WALKING_FORCE});
        }
        if (player.keysPressed[Key.s] === 1) {
            //this.player.setVelocity(this.player.body.velocity.x, OL.WALKING_SPEED);
            this.player.applyForce({x: 0, y: OL.WALKING_FORCE});
        }
    }
}