var Matter = require('matter-js');
var tmx = require('tmx-parser');
const ENGINE_RATE = 1000/60;
const WALKING_SPEED = 2.5;
const WALKING_FORCE = 0.002;
const BULLET_VELO = 5;

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

class GameEngine {
    constructor() {
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
        this.bullets = new Array();
    
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
            console.log("collision", event.pairs[0].bodyA.isWall, event.pairs[0].bodyB.isWall);
            if (event.pairs[0].bodyA.isBullet || event.pairs[0].bodyB.isBullet) {
                if (event.pairs[0].bodyA.isBullet && event.pairs[0].bodyA.firedBy !== event.pairs[0].bodyB.socketId) {
                    console.log(event.pairs[0].bodyA.firedBy, event.pairs[0].bodyB.socketId);
                    this.bullets.splice(event.pairs[0].bodyA.index, 1);
                    this.Composite.remove(this.engine.world, event.pairs[0].bodyA);
                    console.log(event.pairs[0].bodyA.index, this.bullets.length);
                }
                if (event.pairs[0].bodyB.isBullet && event.pairs[0].bodyB.firedBy !== event.pairs[0].bodyA.socketId) {
                    console.log(event.pairs[0].bodyB.firedBy, event.pairs[0].bodyA.socketId);
                    this.bullets.splice(event.pairs[0].bodyB.index, 1);
                    this.Composite.remove(this.engine.world, event.pairs[0].bodyB);
                    console.log(event.pairs[0].bodyB.index, this.bullets.length);
                }
            }
        })
    }

    update() {
        if (this.players.size > 0) {
            this.prev_timestamp = this.curr_timestamp;
            this.curr_timestamp = Date.now();
            
            this.lastDeltat = this.deltat;
            this.deltat = this.curr_timestamp - this.prev_timestamp;
        
            Array.from(this.players.values()).forEach((player) => {
                this.handleInputState(player);
            });
            this.Engine.update(this.engine, this.deltat, this.deltat/this.lastDeltat);
            this.Engine.update(this.loungeEngine, this.deltat, this.deltat/this.lastDeltat);
        }
    }

    addPlayer(player) {
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
                        gun: false
                    }
                ));
            let newPlayer = this.players.get(player.id);
            newPlayer.frictionAir = (0.2);
            this.Body.setMass(newPlayer, 1);
            this.Composite.add(this.engine.world, newPlayer);
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
        if (player && player.currentArea === AREAS.digitalplanet) {
            let newBullet = this.Bodies.rectangle(player.position.x, player.position.y, 16, 16, {isBullet: true, direction: direction});
            newBullet.index = this.bullets.length;
            newBullet.firedBy = player.socketId;
            this.Composite.add(this.engine.world, newBullet);
            this.setBulletVelocity(newBullet, direction);
            this.bullets.push(newBullet);
            return newBullet;
        } else {
            return null;
        }
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
                commandPlayer.gun = !commandPlayer.gun;
                return {
                    gun: commandPlayer.gun
                }
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
            this.Composite.remove(this.engine.world, this.players.get(socketId));
            this.players.delete(socketId);
            console.log("player left: " + socketId + " players: " + this.players.size);
            return true;      
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
              lookIndex: curr.lookIndex
            });
            return acc;
          }, new Array())
    }

    getBullets() {
        return this.bullets.map((curr, index) => {
            return {
                x: curr.position.x,
                y: curr.position.y,
                direction: curr.direction
            }
        }, new Array());
    }
}

module.exports = GameEngine;