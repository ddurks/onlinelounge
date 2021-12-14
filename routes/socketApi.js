var GameEngine = require('./engine');
var socket_io = require('socket.io');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

const TICK_RATE = 1000/10, ENGINE_RATE = 1000/60;
const CAPACITY = 10;
let engine = new GameEngine();

const Key = {
  'w':0,
  'a':1,
  's':2,
  'd':3
}

const WALKING_FORCE = 0.002;

io.on('connection', (socket) => {
  if (engine.players.size > CAPACITY) {
    console.log("lounge full. closing connection");
    socket.emit('lounge full');
    socket.disconnect(true);
  } else {
    console.log("new player connected");
  }

  socket.on('new player', (newPlayer) => {
    newPlayer.id = socket.id;
    engine.addPlayer(newPlayer);
  });

  socket.on('player input', (playerInput) => {
    //console.log("player input", playerInput, Key);
    if (engine.players.has(socket.id)) {
      engine.updatePlayer(socket.id, playerInput);
    }
  });

  socket.on('disconnect', () => {
    engine.removePlayer(socket.id);
    console.log("player left. players: " + engine.players.size);
    io.sockets.emit('state', engine.getPlayers());
  });
});

setInterval(() => {
  if (engine.players.size > 0) {
    //console.log(engine.getPlayers());
    io.sockets.emit('state', engine.getPlayers());
  }
}, TICK_RATE);


setInterval(() => {
    engine.update();
}, ENGINE_RATE);

module.exports = socketApi;