var Matter = require('matter-js');
var tmx = require('tmx-parser');
const ENGINE_RATE = 1000/60;
const WALKING_SPEED = 2.5;
const WALKING_FORCE = 0.002;

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
        });
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
            this.players.set(player.id, this.Bodies.rectangle(player.x, player.y, player.width, player.height, {width:player.width, height:player.height, username:player.username, socketId:player.id, currentArea:player.currentArea, lookIndex:player.lookIndex}));
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
        playerToMove.currentArea = AREAS.lounge;
        this.Composite.move(this.engine.world, playerToMove, this.loungeEngine.world);
        this.Body.set(playerToMove, "position", {x: 256, y: 448});
    }

    exitLounge(socketId) {
        let playerToMove = this.players.get(socketId);
        playerToMove.currentArea = AREAS.digitalplanet;
        this.Composite.move(this.loungeEngine.world, playerToMove, this.engine.world);
        this.Body.set(playerToMove, "position", {x: 525, y: 325});
    }

    updatePlayer(socketId, playerInput) {
        if (this.players.has(socketId)) {
            let playerToUpdate = this.players.get(socketId);
            playerToUpdate.currentInputs = playerInput;
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
}

module.exports = GameEngine;