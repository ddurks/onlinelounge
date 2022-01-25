var Matter = require('matter-js');
var tmx = require('tmx-parser');
const {
    v1: uuidv1,
    v4: uuidv4
} = require('uuid');
const ENGINE_RATE = 1000/60;
const WALKING_SPEED = 2.5;
const WALKING_FORCE = 0.002;
const BULLET_VELO = 5;
const MAX_ITEMS = 12;
const COIN_SPEED = 3;

const Key = {
    'w':0,
    'a':1,
    's':2,
    'd':3
}

const AREAS = {
    'digitalplanet':0,
    'lounge':1
}

const ITEMTYPE = {
    'heart': 0,
    'coin': 1,
    'bullet': 2
}

const PLAYERITEM = {
    'gun': 1,
    'shovel': 2,
    'bury': 3
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
    
        this.curr_timestamp = Date.now();
        this.prev_timestamp, this.deltat = ENGINE_RATE, this.lastDeltat;

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
            if (event.pairs[0].bodyA.isBullet || event.pairs[0].bodyB.isBullet) {
                if (event.pairs[0].bodyA.isBullet && event.pairs[0].bodyA.firedBy !== event.pairs[0].bodyB.socketId) {
                    this.bullets.delete(event.pairs[0].bodyA.bulletId);
                    this.Composite.remove(this.engine.world, event.pairs[0].bodyA);
                    if (event.pairs[0].bodyB.socketId) {
                        this.hitByBullet(event.pairs[0].bodyB, event.pairs[0].bodyA.firedBy);
                    }
                }
                if (event.pairs[0].bodyB.isBullet && event.pairs[0].bodyB.firedBy !== event.pairs[0].bodyA.socketId) {
                    this.bullets.delete(event.pairs[0].bodyB.bulletId);
                    this.Composite.remove(this.engine.world, event.pairs[0].bodyB);
                    if (event.pairs[0].bodyA.socketId) {
                        this.hitByBullet(event.pairs[0].bodyA, event.pairs[0].bodyB.firedBy);
                    }
                }
            }

            if (event.pairs[0].bodyA.itemType !== undefined || event.pairs[0].bodyB.itemType !== undefined) {
                if (event.pairs[0].bodyA.itemType !== undefined) {
                    this.removeItem(this.engine.world, event.pairs[0].bodyA.itemId);
                    if (event.pairs[0].bodyB.socketId) {
                        this.collectedItem(event.pairs[0].bodyB, event.pairs[0].bodyA.itemType);
                    }
                }
                if (event.pairs[0].bodyB.itemType !== undefined) {
                    this.removeItem(this.engine.world, event.pairs[0].bodyB.itemId);
                    if (event.pairs[0].bodyA.socketId) {
                        this.collectedItem(event.pairs[0].bodyA, event.pairs[0].bodyB.itemType);
                    }
                }
            }

            if (event.pairs[0].bodyA.isCoin || event.pairs[0].bodyB.isCoin) {
                if (event.pairs[0].bodyA.isCoin && event.pairs[0].bodyB.socketId && event.pairs[0].bodyA.droppedBy !== event.pairs[0].bodyB.socketId) {
                    this.removeLooseCoin(this.engine.world, event.pairs[0].bodyA.itemId);
                    if (event.pairs[0].bodyB.socketId) {
                        this.collectedItem(event.pairs[0].bodyB, ITEMTYPE.coin);
                    }
                }
                if (event.pairs[0].bodyB.isCoin && event.pairs[0].bodyA.socketId && event.pairs[0].bodyB.droppedBy !== event.pairs[0].bodyA.socketId) {
                    this.removeLooseCoin(this.engine.world, event.pairs[0].bodyB.itemId);
                    if (event.pairs[0].bodyA.socketId) {
                        this.collectedItem(event.pairs[0].bodyA, ITEMTYPE.coin);
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
                this.dropCoins(player.socketId, player.coins);
                let slayer, firedByPlayer = this.players.get(firedBy);
                if (firedByPlayer) {
                    slayer = firedByPlayer.username ? firedByPlayer.username : "[anonymous]";
                } else {
                    slayer = "[unknown]";
                }
                this.io.sockets.emit('player action', { socketId: player.socketId, actions: { faint: true } });
                this.io.sockets.emit('feed', "💀 " + (player.username ? player.username : "[anonymous]") + " was slain by " + slayer);
            } else {
                this.io.sockets.emit('player action', { socketId: player.socketId, actions: { flinch: true } });
            }
        }
    }

    update() {
        if (this.players.size > 0) {
            this.prev_timestamp = this.curr_timestamp;
            this.curr_timestamp = Date.now();
            
            this.lastDeltat = this.deltat;
            this.deltat = this.curr_timestamp - this.prev_timestamp;

            if (this.items.size < MAX_ITEMS) {
                this.spawnRandomItem();
            }
        
            Array.from(this.players.values()).forEach((player) => {
                this.handleInputState(player);
            });
            this.Engine.update(this.engine, this.deltat, this.deltat/this.lastDeltat);
            this.Engine.update(this.loungeEngine, this.deltat, this.deltat/this.lastDeltat);
        }
    }

    spawnRandomItem() {
        if (this.items.size < MAX_ITEMS) {
            this.spawnItem(this.engine.world, this.getRandomNum(50, this.planetWidth - 50), this.getRandomNum(50, this.planetHeight - 50), ITEMTYPE.bullet);
            this.spawnItem(this.engine.world, this.getRandomNum(50, this.planetWidth - 50), this.getRandomNum(50, this.planetHeight - 50), ITEMTYPE.coin);
            this.spawnItem(this.engine.world, this.getRandomNum(50, this.planetWidth - 50), this.getRandomNum(50, this.planetHeight - 50), ITEMTYPE.heart);
        }
    }

    addPlayer(player) {
        const HEALTH = 3, COINS = 3, BULLETS = 3, GUN = false;
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
                        currentArea:player.currentArea, 
                        lookIndex:player.lookIndex,
                        health: HEALTH,
                        item: GUN,
                        bullets: BULLETS,
                        coins: COINS
                    }
                ));
            let newPlayer = this.players.get(player.id);
            newPlayer.frictionAir = (0.2);
            this.Body.setMass(newPlayer, 1);
            this.Composite.add(this.engine.world, newPlayer);
            this.io.sockets.emit('feed', (player.username ? player.username : "[anonymous]") + " has joined the lounge 🕺");
            this.io.to(player.id).emit('bullet update', BULLETS);
            this.io.to(player.id).emit('health update', HEALTH);
            this.io.to(player.id).emit('coin update', COINS);
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
}

module.exports = GameEngine;