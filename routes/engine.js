const Matter = require('matter-js');
const Leaderboard = require('./leaderboard');
var tmx = require('tmx-parser');
var app = require('../app');

const {
    v1: uuidv1,
    v4: uuidv4
} = require('uuid');
const ENGINE_RATE = 1000/60;
const WALKING_SPEED = 2.5;
const WALKING_FORCE = 0.002;
const BULLET_VELO = 5;
const RELOAD_INTERVAL = 60000;
const MAX_ITEMS = 25;
const COIN_SPEED = 3;

const Key = {
    'w':0,
    'a':1,
    's':2,
    'd':3
}

const AREAS = {
    'digitalplanet':1,
    'lounge':2
}

const ITEMTYPE = {
    'heart': 1,
    'coin': 2,
    'bullet': 3
}

const PLAYERITEM = {
    'gun': 1,
    'shovel': 2,
    'bury': 3,
    'beer': 4,
    'controller': 5,
    'water': 6,
    'pizza': 7,
    'bong': 8
}

class Item {
    constructor(world, x, y, itemType) {
        let itemBody = Matter.Bodies.rectangle(x, y, 32, 32, {itemType: itemType});
        Matter.Composite.add(world, itemBody);
        Matter.Body.setStatic(itemBody, true);
        return itemBody;
    }
}

class GameEngine {
    constructor(io) {
        this.io = io;
        this.Engine = Matter.Engine;
        this.Runner = Matter.Runner;
        this.Bodies = Matter.Bodies;
        this.Composite = Matter.Composite;
        this.Body = Matter.Body;

        this.engine = this.Engine.create();
        this.engine.gravity.y = 0;

        this.loungeEngine = this.Engine.create();
        this.loungeEngine.gravity.y = 0;

        this.players = new Map();
        this.bullets = new Map();
        this.looseCoins = new Map();
        this.items = new Map();
        this.treasures = new Array();
    
        this.curr_timestamp = Date.now();
        this.prev_timestamp, this.deltat = ENGINE_RATE, this.lastDeltat;
        this.N = 0;
        this.engineRateAvg = ENGINE_RATE;

        this.leaderboard = new Leaderboard();

        tmx.parseFile('./public/assets/tiles/onlinepluto-tilemap-new.tmx', (err, map) => {
            if (err) throw err;
            var tileMap = map;
            var currX = 0, currY = 0;
            var row = 0, col = 0;
            tileMap.layers.forEach((layer) => {
                if (layer.name === 'world') {
                    for (let i = 0; i < layer.tiles.length; i++) {
                        currX = col*tileMap.tileWidth;
                        currY = row*tileMap.tileHeight;
                        if (layer.tiles[i] && layer.tiles[i] !== undefined) {
                            if (layer.tiles[i].properties.collides === true) {
                                this.addBlock(this.engine.world, currX, currY, tileMap.tileWidth, tileMap.tileHeight);
                            }
                        }
                        if (col < tileMap.width - 1) {
                            col++;
                        } else {
                            col = 0;
                            row++;
                        }
                    }
                }
            });
            this.planetWidth = tileMap.width * tileMap.tileWidth;
            this.planetHeight = tileMap.height * tileMap.tileHeight;
            let wallSize = 50;
            this.addWall(this.engine.world, 0, -wallSize, tileMap.width * tileMap.tileWidth, wallSize);
            this.addWall(this.engine.world, -wallSize, 0, wallSize, tileMap.height * tileMap.tileHeight);
            this.addWall(this.engine.world, tileMap.width * tileMap.tileWidth, 0, wallSize, tileMap.height * tileMap.tileHeight);
            this.addWall(this.engine.world, 0, tileMap.height * tileMap.tileHeight, tileMap.width * tileMap.tileWidth, wallSize);
        });

        tmx.parseFile('./public/assets/tiles/onlinelounge-tilemap.tmx', (err, map) => {
            if (err) throw err;
            var tileMap = map;
            var currX = 0, currY = 0;
            var row = 0, col = 0;
            tileMap.layers.forEach((layer) => {
                if (layer.name === 'world') {
                    for (let i = 0; i < layer.tiles.length; i++) {
                        currX = col*tileMap.tileWidth;
                        currY = row*tileMap.tileHeight;
                        if (layer.tiles[i] && layer.tiles[i] !== undefined) {
                            if (layer.tiles[i].properties.collides) {
                                this.addBlock(this.loungeEngine.world, currX, currY, tileMap.tileWidth, tileMap.tileHeight);
                            }
                        }
                        if (col < tileMap.width - 1) {
                            col++;
                        } else {
                            col = 0;
                            row++;
                        }
                    }
                }
            });
            let wallSize = 50;
            this.addWall(this.loungeEngine.world, 0, -wallSize, tileMap.width * tileMap.tileWidth, wallSize);
            this.addWall(this.loungeEngine.world, -wallSize, 0, wallSize, tileMap.height * tileMap.tileHeight);
            this.addWall(this.loungeEngine.world, tileMap.width * tileMap.tileWidth, 0, wallSize, tileMap.height * tileMap.tileHeight);
            this.addWall(this.loungeEngine.world, 0, tileMap.height * tileMap.tileHeight, tileMap.width * tileMap.tileWidth, wallSize);
        });

        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            let bodyA = event.pairs[0].bodyA;
            let bodyB = event.pairs[0].bodyB;
            if (bodyA.isBullet || bodyB.isBullet) {
                if (bodyA.isBullet && bodyA.firedBy !== bodyB.socketId) {
                    this.bullets.delete(bodyA.bulletId);
                    this.Composite.remove(this.engine.world, bodyA);
                    if (bodyB.socketId) {
                        this.hitByBullet(bodyB, bodyA.firedBy);
                    }
                }
                if (bodyB.isBullet && bodyB.firedBy !== bodyA.socketId) {
                    this.bullets.delete(bodyB.bulletId);
                    this.Composite.remove(this.engine.world, bodyB);
                    if (bodyA.socketId) {
                        this.hitByBullet(bodyA, bodyB.firedBy);
                    }
                }
            }

            if (bodyA.itemType !== undefined || bodyB.itemType !== undefined) {
                if (bodyA.itemType !== undefined) {
                    this.removeItem(this.engine.world, bodyA.itemId);
                    if (bodyB.socketId) {
                        this.collectedItem(bodyB, bodyA.itemType);
                    }
                }
                if (bodyB.itemType !== undefined) {
                    this.removeItem(this.engine.world, bodyB.itemId);
                    if (bodyA.socketId) {
                        this.collectedItem(bodyA, bodyB.itemType);
                    }
                }
            }

            if (bodyA.isCoin || bodyB.isCoin) {
                if (bodyA.isCoin && bodyB.socketId && bodyA.droppedBy !== bodyB.socketId) {
                    this.removeLooseCoin(this.engine.world, bodyA.itemId);
                    if (bodyB.socketId) {
                        this.collectedItem(bodyB, ITEMTYPE.coin);
                    }
                }
                if (bodyB.isCoin && bodyA.socketId && bodyB.droppedBy !== bodyA.socketId) {
                    this.removeLooseCoin(this.engine.world, bodyB.itemId);
                    if (bodyA.socketId) {
                        this.collectedItem(bodyA, ITEMTYPE.coin);
                    }
                }
            }
        })
    }

    collectedItem(player, itemType) {
        switch (itemType) {
            case ITEMTYPE.bullet:
                player.bullets++;
                this.io.to(player.socketId).emit('bullet update', player.bullets);
                break;
            case ITEMTYPE.coin:
                player.coins++;
                this.leaderboard.addStats({ 
                    username: player.username, 
                    ip: player.ip, 
                    stats: { coins: player.coins }
                }, () => this.leaderboardUpdate());
                this.io.to(player.socketId).emit('coin update', player.coins);
                break;
            case ITEMTYPE.heart:
                if (player.health < 3) {
                    player.health++;
                    this.io.to(player.socketId).emit('health update', player.health);
                }
                break;
        }
    }

    hitByBullet(player, firedBy) {
        if (player.health > 0) {
            player.health -= 1;
            this.io.to(player.socketId).emit('health update', player.health);
            if (player.health === 0) {
                player.deaths++;
                this.leaderboard.addStats({ 
                    username: player.username, 
                    ip: player.ip, 
                    stats: { deaths: player.deaths }
                }, () => this.leaderboardUpdate());
                this.dropCoins(player.socketId, player.coins);
                let slayer, firedByPlayer = this.players.get(firedBy);
                if (firedByPlayer) {
                    slayer = firedByPlayer.username ? firedByPlayer.username : "[anonymous]";
                    firedByPlayer.kills++;
                    this.leaderboard.addStats({ 
                        username: firedByPlayer.username, 
                        ip: firedByPlayer.ip, 
                        stats: { kills: firedByPlayer.kills }
                    }, () => this.leaderboardUpdate());
                } else {
                    slayer = "[unknown]";
                }
                this.io.sockets.emit('player action', { socketId: player.socketId, actions: { faint: true } });
                this.io.sockets.emit('feed', (player.username ? player.username : "[anonymous]") + " (" + player.deaths + "💀)" + " was slain by " + slayer + " (" + firedByPlayer.kills + "🔫)");
            } else {
                this.io.sockets.emit('player action', { socketId: player.socketId, actions: { flinch: true } });
            }
        }
    }

    leaderboardUpdate() {
        this.io.sockets.emit('leaderboard update', this.getLeaderboard());
    }

    update() {
        if (this.players.size > 0) {
            let leaderboardDate = this.leaderboard.date;
            this.leaderboard = this.leaderboard.checkForReset();
            if (leaderboardDate !== this.leaderboard.date) {
                console.log("reset Leaderboard & Treasures");
                this.treasures = new Array();
            }
            this.prev_timestamp = this.curr_timestamp;
            this.curr_timestamp = Date.now();
            
            this.lastDeltat = this.deltat;
            this.deltat = this.curr_timestamp - this.prev_timestamp;
            this.engineRateAvg = this.approxRollingAverage(this.engineRateAvg, this.deltat);

            if (this.items.size < MAX_ITEMS) {
                this.spawnRandomItem();
            }
        
            Array.from(this.players.values()).forEach((player) => {
                player.timeOnline += this.deltat;
                if (Date.now() - player.reloadTimestamp > RELOAD_INTERVAL) {
                    player.bullets += 3;
                    this.io.to(player.socketId).emit('bullet update', player.bullets);
                    player.coins += parseInt(player.timeOnline/RELOAD_INTERVAL, 10);
                    this.io.to(player.socketId).emit('coin update', player.coins);
                    this.leaderboard.addStats({ 
                        username: player.username, 
                        ip: player.ip, 
                        stats: { coins: player.coins }
                    }, () => this.leaderboardUpdate());
                    player.reloadTimestamp = Date.now();
                }
                this.handleInputState(player);
            });
            this.Engine.update(this.engine, this.deltat, this.deltat/this.lastDeltat);
            this.Engine.update(this.loungeEngine, this.deltat, this.deltat/this.lastDeltat);
        }
    }

    approxRollingAverage (avg, newSample) {
        if (this.N < 10) {
            this.N++;
        }
        avg -= avg / this.N;
        avg += newSample / this.N;
        return avg;
    }

    spawnRandomItem() {
        if (this.items.size < MAX_ITEMS) {
            this.spawnItem(this.engine.world, this.getRandomNum(50, this.planetWidth - 50), this.getRandomNum(50, this.planetHeight - 50), this.getRandomInt(1, 3));
        }
    }

    addPlayer(player) {
        const HEALTH = 3, COINS = 0, BULLETS = 0, GUN = false;
        if (!this.players.has(player.id)) {
            this.players.set(player.id, 
                this.Bodies.rectangle(
                    player.x, 
                    player.y, 
                    player.width, 
                    player.height, {
                        width:player.width, 
                        height:player.height, 
                        username:player.username, 
                        socketId:player.id, 
                        ip: player.ip,
                        currentArea:player.currentArea, 
                        lookIndex:player.lookIndex,
                        health: HEALTH,
                        item: GUN,
                        bullets: BULLETS,
                        coins: COINS,
                        kills: 0,
                        deaths: 0,
                        timeOnline: 0,
                        reloadTimestamp: Date.now()
                    }
                ));
            let newPlayer = this.players.get(player.id);
            newPlayer.frictionAir = (0.2);
            this.Body.setMass(newPlayer, 1);
            this.Composite.add(player.currentArea === AREAS.digitalplanet ? this.engine.world : this.loungeEngine.world, newPlayer);
            this.io.sockets.emit('feed', (player.username ? player.username : "[anonymous]") + " has joined the lounge 🕺");
            this.io.to(player.id).emit('bullet update', BULLETS);
            this.io.to(player.id).emit('health update', HEALTH);
            this.io.to(player.id).emit('coin update', COINS);
        }
    }

    buryTreasure(socketId) {
        let player = this.players.get(socketId);
        if (player && player.currentArea === AREAS.digitalplanet) {
            let newTreasure = {
                buriedBy: player.username,
                x: player.position.x,
                y: player.position.y,
                coins: player.coins
            }
            player.coins -= newTreasure.coins;
            this.io.to(socketId).emit('coin update', player.coins);
            this.treasures.push(newTreasure);
        }
    }

    digForTreasure(socketId) {
        let player = this.players.get(socketId)
        if (player && player.currentArea === AREAS.digitalplanet) {
            let radius = 16;
            this.treasures.forEach( (treasure, index) => {
                if ((player.position.x >= treasure.x - radius && player.position.x <= treasure.x + radius) && (player.position.y >= treasure.y - radius && player.position.y <= treasure.y + radius)) {
                    this.foundTreasure(socketId, treasure, index);
                    return;
                }
            })
        }
    }

    foundTreasure(socketId, treasure, index) {
        let player = this.players.get(socketId)
        if (player) {
            player.coins += treasure.coins;
            this.io.to(socketId).emit('coin update', player.coins);
            this.io.to(socketId).emit('treasure found', treasure);
            this.treasures.splice(index, 1);
            this.leaderboard.addStats({ 
                username: player.username, 
                ip: player.ip, 
                stats: { coins: player.coins }
            }, () => this.leaderboardUpdate());
        }     
    }

    spawnItem(world, x, y, type) {
        let newItem = new Item(world, x, y, type);
        newItem.itemId = uuidv4();
        this.io.sockets.emit('item', { spawn: { itemId: newItem.itemId, x: x, y: y, itemType: type } });
        this.items.set(newItem.itemId, newItem);
        return newItem;
    }

    removeItem(world, id) {
        let item = this.items.get(id);
        if (item) {
            this.io.sockets.emit('item', { remove: { itemId: item.itemId, x: item.x, y: item.y, itemType: item.itemType } });
            this.Composite.remove(world, item);
            this.items.delete(id);
        }
    }

    removeLooseCoin(world, id) {
        let coin = this.looseCoins.get(id);
        if (coin) {
            this.Composite.remove(world, coin);
            this.looseCoins.delete(id);
        }
    }

    addBlock(world, x, y, width, height) {
        let newBlock = this.Bodies.rectangle(x + width/2, y + height/2, width, height, {});
        this.Body.setStatic(newBlock, true);
        this.Composite.add(world, newBlock);
    }

    addWall(world, x, y, width, height) {
        let newBlock = this.Bodies.rectangle(x + width/2, y + height/2, width, height, {});
        this.Body.setStatic(newBlock, true);
        newBlock.isWall = true;
        this.Composite.add(world, newBlock);
    }

    shootBullet(socketId, direction) {
        let player = this.players.get(socketId);
        if (player && player.currentArea === AREAS.digitalplanet && player.bullets > 0) {
            player.bullets--;
            this.io.to(player.socketId).emit('bullet update', player.bullets);
            let pos = this.getBulletPos(player.position, direction);
            let newBullet = this.Bodies.rectangle(pos.x, pos.y, 16, 16, {isBullet: true, direction: direction});
            newBullet.firedBy = player.socketId;
            newBullet.bulletId = uuidv1();
            this.Composite.add(this.engine.world, newBullet);
            this.setBulletVelocity(newBullet, direction);
            this.bullets.set(newBullet.bulletId, newBullet);
            return newBullet;
        } else {
            return null;
        }
    }

    dropCoins(socketId, amount) {
        let player = this.players.get(socketId);
        if (player && player.currentArea === AREAS.digitalplanet && player.coins > 0) {
            if (amount > player.coins) {
                amount = player.coins;
            }
            player.coins-=amount;
            for (let i = 0; i < amount; i++) {
                let newCoin = this.Bodies.rectangle(player.position.x, player.position.y, 16, 16, {isCoin: true, droppedBy: player.socketId});
                newCoin.itemId = uuidv4();
                newCoin.frictionAir = (0.4);
                this.Composite.add(this.engine.world, newCoin);
                this.Body.setVelocity(newCoin, {x: this.getRandomNum(-COIN_SPEED, COIN_SPEED), y: this.getRandomNum(-COIN_SPEED, COIN_SPEED)});
                this.looseCoins.set(newCoin.itemId, newCoin);
                setTimeout(() => {
                    this.removeLooseCoin(this.engine.world, newCoin.itemId)
                }, this.getRandomInt(5000, 10000));
            }
        } else {
            return null;
        }
    }
 
    getBulletPos(position, direction) {
        let returnPos = position;
        switch(direction) {
            case Key.s:
                returnPos = {x: position.x, y: position.y + 18}
                break;
            case Key.d:
                returnPos = {x: position.x + 16, y: position.y}
                break;
            case Key.w:
                returnPos = {x: position.x, y: position.y - 18}
                break;
            case Key.a:
                returnPos = {x: position.x - 16, y: position.y}
                break;
        }
        return returnPos;
    }

    setBulletVelocity(newBullet, direction) {
        switch (direction) {
            case Key.s:
                this.Body.setVelocity(newBullet, {x: 0, y: BULLET_VELO});
                break;
            case Key.d:
                this.Body.setVelocity(newBullet, {x: BULLET_VELO, y: 0});
                break;
            case Key.w:
                this.Body.setVelocity(newBullet, {x: 0, y: -BULLET_VELO});
                break;
            case Key.a:
                this.Body.setVelocity(newBullet, {x: -BULLET_VELO, y: 0});
                break;
        }
    }

    executeCommand(socketId, command) {
        console.log("user: " , socketId, "command: ", command);
        let commandPlayer = this.players.get(socketId);
        if (commandPlayer) {
            if (command === "/gun") {
                if (commandPlayer.item === PLAYERITEM.gun) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.gun;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/shovel") {
                if (commandPlayer.item === PLAYERITEM.shovel) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.shovel;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/bury") {
                if (commandPlayer.item === PLAYERITEM.bury) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.bury;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/beer") {
                if (commandPlayer.item === PLAYERITEM.beer) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.beer;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/pizza") {
                if (commandPlayer.item === PLAYERITEM.pizza) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.pizza;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/bong") {
                if (commandPlayer.item === PLAYERITEM.bong) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.bong;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/water") {
                if (commandPlayer.item === PLAYERITEM.water) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.water;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/gaming" || command === "/game" || command === "/controller") {
                if (commandPlayer.item === PLAYERITEM.controller) {
                    commandPlayer.item = false;
                } else {
                    commandPlayer.item = PLAYERITEM.controller;
                }
                return { item: commandPlayer.item }
            }
            if (command === "/smoke") {
                this.io.sockets.emit('player action', { socketId: socketId, actions: { smoke: true } });
            }
            if (command === "/reset$") {
                Array.from(this.items.values()).forEach(item => {
                    this.removeItem(this.engine.world, item.itemId);
                });
                this.items = new Map();
                this.io.sockets.emit('reset items');
            }
            if (command === "/bullets$") {
                commandPlayer.bullets += 5;
                this.io.to(commandPlayer.socketId).emit('bullet update', commandPlayer.bullets);
            }
            if (command === "/invincible$") {
                commandPlayer.health = 1000000;
            }
        }
        return null;
    }

    handleInputState(player) {
        if (player.currentInputs) {
            if (player.currentInputs[Key.a] === 1) {
                //this.Body.setVelocity( player, {x: -WALKING_SPEED, y: player.velocity.y});
                this.Body.applyForce(player, { x: player.position.x, y: player.position.y }, {x: -WALKING_FORCE, y: 0});
            }
            if (player.currentInputs[Key.d] === 1) {
                //this.Body.setVelocity( player, {x: WALKING_SPEED, y: player.velocity.y});
                this.Body.applyForce(player, { x: player.position.x, y: player.position.y }, {x: WALKING_FORCE, y: 0});
            }
            if (player.currentInputs[Key.w] === 1) {
                //this.Body.setVelocity( player, {x: player.velocity.x, y: -WALKING_SPEED});
                this.Body.applyForce(player, { x: player.position.x, y: player.position.y }, {x: 0, y: -WALKING_FORCE});
            }
            if (player.currentInputs[Key.s] === 1) {
                //this.Body.setVelocity( player, {x: player.velocity.x, y: WALKING_SPEED});
                this.Body.applyForce(player, { x: player.position.x, y: player.position.y }, {x: 0, y: WALKING_FORCE});
            }

            if ((player.currentInputs[Key.a] === 1) || (player.currentInputs[Key.d] === 1) || (player.currentInputs[Key.w] === 1) || (player.currentInputs[Key.s] === 1)) {
                if (player.health === 0) {
                    player.health = 3;
                    this.io.to(player.socketId).emit('health update', player.health);
                }
            }
        }
    }

    enterLounge(socketId) {
        let playerToMove = this.players.get(socketId);
        if (playerToMove) {
            playerToMove.currentArea = AREAS.lounge;
            this.Composite.move(this.engine.world, playerToMove, this.loungeEngine.world);
            this.Body.set(playerToMove, "position", {x: 256, y: 448});
        }
    }

    exitLounge(socketId) {
        let playerToMove = this.players.get(socketId);
        if (playerToMove) {
            playerToMove.currentArea = AREAS.digitalplanet;
            this.Composite.move(this.loungeEngine.world, playerToMove, this.engine.world);
            this.Body.set(playerToMove, "position", {x: 525, y: 325});
        }
    }

    updatePlayer(socketId, playerInput) {
        if (this.players.has(socketId)) {
            let playerToUpdate = this.players.get(socketId);
            playerToUpdate.currentInputs = playerInput;
        }
    }

    setPlayerLook(socketId, lookIndex) {
        let playerToChange = this.players.get(socketId);
        if (playerToChange) {
          playerToChange.lookIndex = lookIndex;
          this.io.sockets.emit('player action', { socketId: socketId, actions: { lookIndex: playerToChange.lookIndex } });
        }
    }

    removePlayer(socketId) {
        if (this.players.has(socketId)) {
            let playerToRemove = this.players.get(socketId);
            let username = playerToRemove.username ? playerToRemove.username : "[anonymous]";
            this.Composite.remove(this.engine.world, playerToRemove);
            this.players.delete(socketId);
            console.log("player left: " + socketId + " players: " + this.players.size);
            return username;      
        } else {
            return false;
        }
    }

    getPlayers() {
        return Array.from(this.players.values()).reduce((acc, curr) => {
            acc.push({
              x: curr.position.x,
              y: curr.position.y,
              username: curr.username,
              socketId: curr.socketId,
              currentInputs: curr.currentInputs,
              currentArea: curr.currentArea,
              lookIndex: curr.lookIndex,
              health: curr.health,
              item: curr.item,
            });
            return acc;
          }, new Array())
    }

    getBullets() {
        return Array.from(this.bullets.values()).map((curr) => {
            return {
                bulletId: curr.bulletId,
                x: curr.position.x,
                y: curr.position.y,
                direction: curr.direction
            }
        }, new Array());
    }

    getLooseCoins() {
        return Array.from(this.looseCoins.values()).map((curr) => {
            return {
                itemId: curr.itemId,
                x: curr.position.x,
                y: curr.position.y
            }
        }, new Array());
    }

    getItems(area) {
        if (area === AREAS.digitalplanet) {
            return Array.from(this.items.values()).map((curr) => {
                return {
                    itemId: curr.itemId,
                    x: curr.position.x,
                    y: curr.position.y,
                    itemType: curr.itemType
                }
            }, new Array()); 
        }
    }

    getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    getRandomNum(min, max) {
      return Math.random() * (max - min) + min;
    }

    getStats() {
        return {
            uptime: (Date.now() - app.START_TIME)/1000,
            engineTick: Math.round(( (1000.0/this.engineRateAvg) + Number.EPSILON) * 100) / 100
        }
    }

    getLeaderboard() {
        return Object.entries(this.leaderboard).reduce((acc, [statName, statList]) => {
            if (statName !== 'date') {
                acc[statName] = statList.map((stat) => stat.number > 0 ? stat.username + " - " + stat.number : "");
            }
            return acc;
        }, {});
    }
}

module.exports = GameEngine;