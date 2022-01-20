import { OL } from './utils';
import { Player, Key } from './Player';
import { Butterfly, OnlineBouncer } from './Guys';
import { Coin, Heart, Bullet } from './Items';
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
        this.butterflies = new Array();
        this.coins = new Array();
        this.hearts = new Array();
        this.looks = new Array();
        this.lookIndex = OL.IS_MOBILE ? 1 : 0;
        this.MAX_BUTTERFLIES = 0;
        this.serverClient = new GameServerClient();
        this.population = 0;
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
            this.player = this.generatePlayer(null, this.startData.spawn.x, this.startData.spawn.y, OL.username, this.lookIndex);
            this.player.body.type = 'player1';
            this.player.currentArea = this.getCurrentArea(this.startData.mapKey);
            this.events.emit('playerLoaded', {texture: this.player.texture.key});
        }
        this.map.findObject('player', (object) => {
            if (object.name === 'spawn' && !this.startData.spawn) {
                this.player = this.generatePlayer(null, object.x, object.y, OL.username, this.lookIndex);
                this.player.body.type = 'player1';
                this.player.currentArea = this.getCurrentArea(this.startData.mapKey);
                this.events.emit('playerLoaded', {texture: this.player.texture.key});
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
                this.events.emit('displayPopup', {text: bodyA.info ? bodyA.info : bodyB.info});
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

        this.cameraDolly = new Phaser.Geom.Point(this.player.x, this.player.y);
        this.camera.startFollow(this.player, true);
        this.camera.setBounds(0, -48, this.map.widthInPixels, this.map.heightInPixels);

        // turn off events so they don't duplicate upon restart
        this.scene.get('Controls').events.off('openChat');
        this.scene.get('Controls').events.off('sendChat');
        this.scene.get('Controls').events.off('zoomIn');
        this.scene.get('Controls').events.off('zoomOut');
        this.scene.get('Controls').events.off('lookChange');
        this.scene.get('Controls').events.off('shootGun');

        this.scene.get('Controls').events.on('openChat', () => this.openChatBox());
        this.scene.get('Controls').events.on('sendChat', () => this.sendChat());
        this.scene.get('Controls').events.on('zoomIn', () => this.zoomIn());
        this.scene.get('Controls').events.on('zoomOut', () => this.zoomOut());
        this.scene.get('Controls').events.on('lookChange', () => this.changeLook());
        this.scene.get('Controls').events.on('shootGun', () => this.shootGun());

        this.sessionID = this.serverClient.sessionID ? this.serverClient.sessionID : undefined;
        if (this.sessionID) {
            this.players.set(this.sessionID, this.player);
        }

        this.player.lookIndex = this.lookIndex;
        this.serverClient.connect(this.player, (sessionID) => {
            console.log("connected: " + sessionID);
            this.events.emit('connectionStatus', true);
            this.events.emit('populationUpdate', this.population);
            this.sessionID = sessionID;
            this.players.set(sessionID, this.player);
            this.player = this.players.get(sessionID);
            this.serverClient.socket.on('disconnect', () => {
                this.events.emit('connectionStatus', false);
                this.events.emit('populationUpdate', "-");
                this.players.forEach((player) => {
                    this.removePlayer(player.socketId);
                })
                console.log("disconnected from server");
            })
        });

        this.serverClient.socket.on('state', (state) => this.updateGameState(state));
        this.serverClient.socket.on('player action', (playerAction) => this.updatePlayerAction(playerAction));
        this.serverClient.socket.on('player left', (socketId) => {
            this.removePlayer(socketId);
        });
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

        setInterval(() => {
                this.serverClient.socket.emit('player input', this.player.keysPressed);
        }, INPUT_UPDATE_RATE);
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
            this.scene.restart(this.exitTo);
        }
    }

    update(time, delta) {
        if (this.player && this.player.body) {
            this.playerHandler(delta);
            this.updateAllButterflies();
        }
        // OL.getRandomInt(0,30) === 25 ? this.updateCoins() : this.updateHearts();
        this.updateFollowCam();
    }

    updateFollowCam() {
        if (this.player.body) {
            this.cameraDolly.x = Math.floor(this.player.x);
            this.cameraDolly.y = Math.floor(this.player.y);
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

    updateCoins() {
        if(this.coins.length < 25) {
            let coin = new Coin(this, OL.getRandomInt(0, this.map.widthInPixels), OL.getRandomInt(0, this.map.heightInPixels));
            console.log("new coin");
            console.log(coin.x, coin.y);
            this.coins.push(coin);
        }
    }

    updateHearts() {
        if(this.hearts.length < 50) {
            let heart = new Heart(this, OL.getRandomInt(0, this.map.widthInPixels), OL.getRandomInt(0, this.map.heightInPixels));
            console.log("new heart");
            console.log(heart.x, heart.y);
            this.hearts.push(heart);
        }
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

    updateGameState(state) {
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
                    playerToUpdate.setPosition(playerData.x, playerData.y);
                    if (playerData.currentInputs) {
                        if (playerData.currentInputs[Key.a] === 1) {
                            playerToUpdate.anims.play('left', true);
                        }
                        if (playerData.currentInputs[Key.d] === 1) {
                            playerToUpdate.anims.play('right', true);
                        }
                        if (playerData.currentInputs[Key.w] === 1) {
                            playerToUpdate.anims.play('up', true);
                        }
                        if (playerData.currentInputs[Key.s] === 1) {
                            playerToUpdate.anims.play('down', true);
                        }
                        if (!playerData.currentInputs[Key.w] && !playerData.currentInputs[Key.a] && !playerData.currentInputs[Key.s] && !playerData.currentInputs[Key.d]) {
                            playerToUpdate.anims.pause();
                        }
                    }
                } else {
                    console.log(playerToUpdate, "no body");
                    this.removePlayer(playerData.socketId);
                }
            } else {
                this.removePlayer(playerData.socketId);
            }
        });
        let idSet = new Set();
        if (state.bullets) {
            state.bullets.forEach((bullet) => {
                idSet.add(bullet.bulletId);
                var bulletToUpdate = this.bullets.get(bullet.bulletId);
                if (!bulletToUpdate) {
                    this.bullets.set(bullet.bulletId, new Bullet(this, bullet.bulletId, bullet.x, bullet.y, bullet.direction));
                } else {
                    bulletToUpdate.setPosition(bullet.x, bullet.y);
                }
            });
        }
        Array.from(this.bullets.values()).forEach((bullet) => {
            if (!idSet.has(bullet.bulletId)) {
                let destroyedBullet = this.bullets.get(bullet.bulletId);
                if (destroyedBullet) {
                    this.matter.world.remove(destroyedBullet);
                    destroyedBullet.destroy();
                    this.bullets.delete(bullet.bulletId);
                }
            }
        });
    }

    updatePlayer1(delta) {
        if(this.player) {
            this.player.msgDecayHandler(delta);
            this.player.updatePlayerStuff();
        }
    }

    playerHandler(delta) {
        if (this.player.alive) {
            if (OL.IS_MOBILE) {
                this.playerMobileMovementHandler();
            } else {
                this.playerMovementHandler();
            }
            this.updatePlayer1(delta);
            this.players.forEach( (player) => {
                if (player.body && player.socketId && player.socketId !== this.sessionID) {
                    player.msgDecayHandler(delta);
                    player.updatePlayerStuff();
                }
            })
        }
    }

    playerMovementHandler() {
        if (this.player.anims) {
            if (this.controls.left.isDown) {
                this.player.keysPressed[Key.a] = 1;
                this.player.anims.play('left', true);
                this.player.direction = Key.a;
            } else {
                this.player.keysPressed[Key.a] = 0;
            }
            if (this.controls.right.isDown) {
                this.player.keysPressed[Key.d] = 1;
                this.player.direction = Key.d;
                this.player.anims.play('right', true);
            } else {
                this.player.keysPressed[Key.d] = 0;
            }
            if (this.controls.up.isDown) {
                this.player.keysPressed[Key.w] = 1;
                this.player.direction = Key.w;
                this.player.anims.play('up', true);
            } else {
                this.player.keysPressed[Key.w] = 0;
            }
            if (this.controls.down.isDown) {
                this.player.keysPressed[Key.s] = 1;
                this.player.direction = Key.s;
                this.player.anims.play('down', true);
            } else {
                this.player.keysPressed[Key.s] = 0;
            }

            this.updatePlayerFromInput(this.player);

            if (this.player.anims && !this.player.keysPressed[Key.w] && !this.player.keysPressed[Key.a] && !this.player.keysPressed[Key.s] && !this.player.keysPressed[Key.d]) {
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

    setPlayerSpeedFromTouchAngle(angle) {
        if (angle >= -22.5 && angle <= 22.5) { //right
            this.player.applyForce({x: OL.WALKING_FORCE, y: 0});
            this.player.anims.play('right', true);
            this.player.keysPressed[Key.d] = 1;
            this.player.keysPressed[Key.a] = 0;
            this.player.keysPressed[Key.w] = 0;
            this.player.keysPressed[Key.s] = 0;
            this.player.direction = Key.d;
        } else if (angle > 22.5 && angle <= 67.5) { //right-down
            this.player.applyForce({x: OL.WALKING_FORCE, y: 0});
            this.player.applyForce({x: 0, y: OL.WALKING_FORCE});
            this.player.anims.play('right', true);
            this.player.keysPressed[Key.s] = 1;
            this.player.keysPressed[Key.d] = 1;
            this.player.keysPressed[Key.w] = 0;
            this.player.keysPressed[Key.a] = 0;
            this.player.direction = Key.d;
        } else if (angle > 67.5 && angle <= 112.5) { //down
            this.player.applyForce({x: 0, y: OL.WALKING_FORCE});
            this.player.anims.play('down', true);
            this.player.keysPressed[Key.s] = 1;
            this.player.keysPressed[Key.a] = 0;
            this.player.keysPressed[Key.w] = 0;
            this.player.keysPressed[Key.d] = 0;
            this.player.direction = Key.s;
        } else if (angle > 112.5 && angle <= 157.5) { //left-down
            this.player.applyForce({x: -OL.WALKING_FORCE, y: 0});
            this.player.applyForce({x: 0, y: OL.WALKING_FORCE});
            this.player.anims.play('left', true);
            this.player.keysPressed[Key.a] = 1;
            this.player.keysPressed[Key.s] = 1;
            this.player.keysPressed[Key.w] = 0;
            this.player.keysPressed[Key.d] = 0;
            this.player.direction = Key.a;
        } else if ((angle > 157.5 && angle <= 180) || (angle >= -180 && angle < -157.5) ) { //left
            this.player.applyForce({x: -OL.WALKING_FORCE, y: 0});
            this.player.anims.play('left', true);
            this.player.keysPressed[Key.a] = 1;
            this.player.keysPressed[Key.w] = 0;
            this.player.keysPressed[Key.s] = 0;
            this.player.keysPressed[Key.d] = 0;
            this.player.direction = Key.a;
        } else if (angle >= -157.5 && angle < -112.5) { //left-up
            this.player.applyForce({x: -OL.WALKING_FORCE, y: 0});
            this.player.applyForce({x: 0, y: -OL.WALKING_FORCE});
            this.player.anims.play('left', true);
            this.player.keysPressed[Key.a] = 1;
            this.player.keysPressed[Key.w] = 1;
            this.player.keysPressed[Key.s] = 0;
            this.player.keysPressed[Key.d] = 0;
            this.player.direction = Key.a;
        } else if (angle >= -112.5 && angle < -67.5) { //up
            this.player.applyForce({x: 0, y: -OL.WALKING_FORCE});
            this.player.anims.play('up', true);
            this.player.keysPressed[Key.w] = 1;
            this.player.keysPressed[Key.a] = 0;
            this.player.keysPressed[Key.s] = 0;
            this.player.keysPressed[Key.d] = 0;
            this.player.direction = Key.w;
        } else if (angle >= -67.5 && angle < -22.5) { //right-up
            this.player.applyForce({x: OL.WALKING_FORCE, y: 0});
            this.player.applyForce({x: 0, y: -OL.WALKING_FORCE});
            this.player.anims.play('right', true);
            this.player.keysPressed[Key.w] = 1;
            this.player.keysPressed[Key.d] = 1;
            this.player.keysPressed[Key.a] = 0;
            this.player.keysPressed[Key.s] = 0;
            this.player.direction = Key.d;
        }
    }

    playerMobileMovementHandler() {
        var pointer = this.input.activePointer;
        if ((!this.player.typing && pointer.isDown)) {
            var touchX = pointer.x;
            var touchY = pointer.y;
            if (touchY > 48 && !(touchY > OL.world.height - 150 && touchX > OL.world.width - 128)) {
                var touchWorldPoint = this.camera.getWorldPoint(touchX, touchY);
                if (OL.getDistance(this.player.body.position.x, this.player.body.position.y, touchWorldPoint.x, touchWorldPoint.y) > 29) {
                    this.setPlayerSpeedFromTouchAngle(OL.getAngle(this.player.body.position.x, this.player.body.position.y, touchWorldPoint.x, touchWorldPoint.y));
                }
            }
        } else {
            this.player.anims.pause();
            this.player.keysPressed = [0, 0, 0, 0];
        }
    }
}