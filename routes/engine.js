var Matter = require('matter-js');
const TICK_RATE = 1000/60;

class GameEngine {
    constructor() {
        this.Engine = Matter.Engine;
        this.Runner = Matter.Runner;
        this.Bodies = Matter.Bodies;
        this.Composite = Matter.Composite;

        this.engine = this.Engine.create();
        // this.engine.gravity.y = 0;
    
        this.boxA = this.Bodies.rectangle(400, 200, 80, 80);
        this.ground = this.Bodies.rectangle(400, 380, 810, 60, { isStatic: true });
        this.players = new Map();
    
        this.Composite.add(this.engine.world, [this.boxA, this.ground]);
        this.curr_timestamp = Date.now();
        this.prev_timestamp, this.deltat = TICK_RATE, this.lastDeltat;
    }

    update() {
        this.prev_timestamp = this.curr_timestamp;
        this.curr_timestamp = Date.now();
        
        this.lastDeltat = this.deltat;
        this.deltat = this.curr_timestamp - this.prev_timestamp;
    
        this.Engine.update(this.engine, this.deltat, this.deltat/this.lastDeltat);
    }

    addPlayer(player) {
        if (!this.players.has(player.id)) {
            this.players.set(player.id, this.Bodies.rectangle(player.x, player.y, player.width, player.height, {width:player.width, height:player.height, username:player.username, socketId:player.id}));
            this.Composite.add(this.engine.world, this.players.get(player.id));
        }
    }

    removePlayer(socketId) {
        if (this.players.has(socketId)) {
            this.Composite.remove(this.engine.world, this.players.get(socketId));
            this.players.delete(socketId);            
        }
    }

    getPlayers() {
        return Array.from(this.players.values()).reduce((acc, curr) => {
            acc.push({
              x: curr.position.x,
              y: curr.position.y,
              width: curr.width,
              height: curr.height,
              username: curr.username,
              socketId: curr.socketId
            });
            return acc;
          }, new Array())
    }
}

module.exports = GameEngine;