var GameEngine = require('./engine');
var socket_io = require('socket.io');
var mojiTranslate = require('moji-translate');
var io = socket_io();
var socketApi = {};

socketApi.io = io;

const TICK_RATE = 1000/10, ENGINE_RATE = 1000/60;
const CAPACITY = 10;
let engine = new GameEngine(io);
 
io.on('connection', (socket) => {
  if (engine.players.size > CAPACITY) {
    console.log("lounge full. closing connection");
    socket.emit('lounge full');
    socket.disconnect(true);
  }

  socket.on('new player', (newPlayer) => {
    newPlayer.id = socket.id;
    engine.addPlayer(newPlayer);
    console.log("adding " + socket.id + " players connected: " + engine.players.size, newPlayer.currentArea);
  });

  socket.on('player input', (playerInput) => {
    if (engine.players.has(socket.id)) {
      engine.updatePlayer(socket.id, playerInput);
    }
  });

  socket.on('player action', (actionArray) => {
    console.log("actions ", actionArray);
    if (actionArray.lookIndex >= 0) {
      engine.setPlayerLook(socket.id, actionArray.lookIndex);
    }
    if (actionArray.treasure) {
      if (actionArray.treasure.bury) {
        engine.buryTreasure(socket.id);
      }
      if (actionArray.treasure.dig) {
        engine.digForTreasure(socket.id);
      }
    }
    if (actionArray.message && actionArray.message.startsWith("/")) {
      let result = engine.executeCommand(socket.id, actionArray.message);
      console.log("result", result);
      io.sockets.emit('player action', { socketId: socket.id, actions: { message: "NULL", commandResult: result } });
    } else if (actionArray.message) {
      if (actionArray.message !== "NULL") {
        console.log(actionArray.message);
        actionArray.message = mojiTranslate.translate(actionArray.message);
        console.log(actionArray.message);
      }
      io.sockets.emit('player action', { socketId: socket.id, actions: actionArray });
    }
  });

  socket.on('enter lounge', () => {
    console.log("enter lounge ", socket.id);
    engine.enterLounge(socket.id);
    io.sockets.emit('enter lounge', socket.id);
  });

  socket.on('exit lounge', () => {
    console.log("exit lounge ", socket.id);
    engine.exitLounge(socket.id);
    io.sockets.emit('exit lounge', socket.id);
  });

  socket.on('shoot bullet', (direction) => {
    engine.shootBullet(socket.id, direction);
  })

  socket.on('get items', (area) => {
    io.sockets.emit('get items', engine.getItems(area));
  });

  socket.on('disconnect', () => {
    let username = engine.removePlayer(socket.id);
    if (username) {
      io.sockets.emit('player left', socket.id);
      io.sockets.emit('state', engine.getPlayers());
      io.sockets.emit('feed', username + " has left 😔");
    }
  });
});

setInterval(() => {
  if (engine.players.size > 0) {
    let state = { players: engine.getPlayers() };
    engine.bullets.size > 0 ? state.bullets = engine.getBullets() : null;
    engine.looseCoins.size > 0 ? state.coins = engine.getLooseCoins() : null;
    io.sockets.emit('state', state);
  }
}, TICK_RATE);


setInterval(() => {
    engine.update();
}, ENGINE_RATE);

module.exports = socketApi;