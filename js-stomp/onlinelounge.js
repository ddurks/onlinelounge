const SERVER_URL = "ws://localhost:8080";
var CANVAS_WIDTH = 512;
var CANVAS_HEIGHT = 512;
var DOCUMENT = document;
var LOUNGE_DIV = document.getElementById('lounge-login-div');
const RENDER_DELAY = 0.005;
const PLAYER_SPEED = 6;
const BULLET_DIMENSION = 16;
const BULLET_SPEED = 250;
const FLASH_LENGTH = 0.20;
const SPECTATE = false;
var mylatesttap = new Date().getTime();
//var socket = io({
//autoConnect: false
//});
var PLAYER_DIMENSION = 32;

var IS_MOBILE;
if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent)
  || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
    IS_MOBILE = true;
} else {
    IS_MOBILE = false;
}
console.log("is mobile: ", IS_MOBILE);
var supportsPassive = false;
try {
    window.addEventListener("test", null, Object.defineProperty({}, 'passive', {
      get: function () { supportsPassive = true; }
    }));
} catch(e) {}

var wheelOpt = supportsPassive ? { passive: false } : false;
function preventDefault(e) {
    e.preventDefault();
}
if (IS_MOBILE) {
    window.addEventListener('touchmove', preventDefault, wheelOpt);
}

const Utility = {
    resize: function(gameController) {
      var canvas = document.getElementById("lounge-canvas");
      var windowWidth = window.innerWidth;
      var windowHeight = window.innerHeight;
      var windowRatio = windowWidth / windowHeight;
      var gameRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
      if(windowRatio < gameRatio){
          canvas.style.width = windowWidth + "px";
          canvas.style.height = (windowWidth / gameRatio) + "px";
      }
      else{
          canvas.style.width = (windowHeight * gameRatio) + "px";
          canvas.style.height = windowHeight + "px";
      }
      var player = document.getElementById("player");
      var canvasRect = canvas.getBoundingClientRect()
      var playerPadding = canvasRect.left + parseInt(canvas.style.width, 10)/3.15;
      player.style.paddingLeft = playerPadding + "px";
      player.height = parseInt(canvas.style.height, 10)/6;
      player.width = parseInt(canvas.style.width, 10)/3;
    },
    getTimestamp: function() {
      return Date.now() / 1000.0;
    },
    getRandomInt: function(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    getAngle: function(cx, cy, ex, ey) {
      var dy = ey - cy;
      var dx = ex - cx;
      var theta = Math.atan2(dy, dx); // range (-PI, PI]
      theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
      //if (theta < 0) theta = 360 + theta; // range [0, 360)
      return theta;
    },
    doubletap: function() {
      var doubletapdetected = false;
      var now = new Date().getTime();
      var timesince = now - mylatesttap;
      if((timesince < 250) && (timesince > 0)){
        doubletapdetected = true;
      }
      mylatesttap = new Date().getTime();
      return doubletapdetected;
    }
};

const Furniture = {
    image: null,
    imageIsLoaded: false,

    create: function(image_src, posx, posy, isBlocking) {
      var furniture = Object.create(this);
      furniture.image = new Image();
      furniture.name = image_src;
      furniture.posx = posx;
      furniture.posy = posy;
      furniture.leftx = posx;
      furniture.topy = posy;
      furniture.image.src = image_src;
      furniture.image.onload = function() {
        furniture.height = furniture.image.height;
        furniture.width = furniture.image.width;
        furniture.rightx = furniture.posx+furniture.width;
        furniture.bottomy = furniture.posy+furniture.height;
        imageIsLoaded = true;
      }
      furniture.isBlocking = isBlocking;
      return furniture;
    }
    }

    const Player = {
    imageIsLoaded: false,

    create: function(username, posx, posy) {
      var player = Object.create(this);
      player.posx = posx;
      player.posy = posy;
      player.username = username;
      player.walking_loop = [0,0,1,1,1,1,1,0,0,2,2,2,2,2];
      player.loop = player.walking_loop;
      player.loop_i = 0;
      player.direction = 0;
      player.speed = PLAYER_SPEED;
      player.message = null;
      player.message_timestamp = 0;
      player.scale = 1;
      player.holding_gun = false;
      player.holding_item = null;
      player.last_shot = 0;
      player.last_bonghit = 0;
      player.score = 0;
      player.bullets = 1;
      return player;
    },

    setMessage: function(message) {
      this.message = message;
      this.message_timestamp = Utility.getTimestamp();
      return message;
    },
};

const Bullet = {
    create: function(x, y, direction) {
      var bullet = Object.create(this);
      if (direction === 0) {
        bullet.x = x - PLAYER_DIMENSION/2;
      } else {
        bullet.x = x;
      }
      bullet.y = y;
      bullet.direction = direction;
      bullet.speed = BULLET_SPEED;
      return bullet;
    }
    };

    const Bong = {
    create: function(x, y) {
      var bong = Object.create(this);
      bong.x = x;
      bong.y = y;
      return bong;
    }
};

const SmokePuff = {
    create: function(x, y) {
      var smoke = Object.create(this);
      smoke.x = x;
      smoke.y = y;
      smoke.loop = [0,0,0,0,0,0,0,0,0,0, 1,1,1,1,1,1,1,1,1,1, 2,2,2,2,2,2,2,2,2,2, 3,3,3,3,3,3,3,3,3,3, 4,4,4,4,4,4,4,4,4,4, 5,5,5,5,5,5,5,5,5,5];
      smoke.loop_i = 0;
      return smoke;
    }
}

const Lounge = {
    player_1: null,
    players: [],
    furnitureList: new Array(),
    smokePuffList: new Array(),

    create: function(player_1_username) {
      var lounge = Object.create(this);
      lounge.player_1 = Player.create(player_1_username, 1, 1);
      lounge.players.push(lounge.player_1);
      lounge.addFurniture();
      lounge.bullets = new Array();
      return lounge;
    },

    addFurniture: function() {
      var couch = Furniture.create("assets/couch.png", 131, 192, true);
      couch.topy = couch.topy + 25;
      this.furnitureList.push(couch);
      var tv = Furniture.create("assets/tv.png", 160, 0, true);
      this.tvHeight = tv.height;
      this.tvWidth = tv.width;
      this.tvX = tv.posx;
      this.tvY = tv.posy;
      this.furnitureList.push(tv);
      var memescreenl = Furniture.create("assets/meme_screen.png", 32, 0, false);
      this.furnitureList.push(memescreenl);
      var plaquel = Furniture.create("assets/plaque.png", 62, 95, false);
      this.furnitureList.push(plaquel);
      var memescreenr = Furniture.create("assets/meme_screen.png", 384, 0, false);
      this.furnitureList.push(memescreenr);
      var plaquer = Furniture.create("assets/plaque.png", 414, 95, false);
      this.furnitureList.push(plaquer);
      var dinner_table = Furniture.create("assets/dinner_table.png", 98, 314, true);
      this.furnitureList.push(dinner_table);
      var coffee_table = Furniture.create("assets/coffee_table.png", 192, 117, true);
      coffee_table.topy = coffee_table.topy + 15;
      this.furnitureList.push(coffee_table);
      var game_table = Furniture.create("assets/game_table.png", 320, 351, true);
      this.furnitureList.push(game_table);
      var game_chairl = Furniture.create("assets/game_chair.png", 287, 384, false);
      this.furnitureList.push(game_chairl);
      var game_chairr = Furniture.create("assets/game_chair.png", 452, 383, false);
      this.furnitureList.push(game_chairr);
      var bean_bag = Furniture.create("assets/bean_bag.png", 372, 132, false);
      // this.furnitureList.push(bean_bag);
      var fridge = Furniture.create("assets/fridge.png", 460, 213, true);
      this.furnitureList.push(fridge);
      var left_dinner_chairs = Furniture.create("assets/left_dinner_chairs.png", 63, 306, false);
      this.furnitureList.push(left_dinner_chairs);
      var right_dinner_chairs = Furniture.create("assets/right_dinner_chairs.png", 191, 306, false);
      this.furnitureList.push(right_dinner_chairs);
      var bottom_dinner_chair = Furniture.create("assets/bottom_dinner_chair.png", 128, 481, false);
      this.furnitureList.push(bottom_dinner_chair);
      var bong = Bong.create(280, 117);
      this.bong = bong;
    },

    canMoveHere: function(posx, posy) {
      if ((posy > 0) && (posx < CANVAS_WIDTH - PLAYER_DIMENSION) && (posy < CANVAS_HEIGHT - PLAYER_DIMENSION) && (posx > 0 )) {
        return true;
      } else {
        return false;
      }
    },

    moveUp: function(player) {
      return {
        posx: player.posx,
        posy: player.posy - player.speed,
        direction: 2
      }
    },
    moveRight: function(player) {
      return {
        posx: player.posx + player.speed,
        posy: player.posy,
        direction: 1
      }
    },
    moveDown: function(player) {
      return {
        posx: player.posx,
        posy: player.posy + player.speed,
        direction: 0
      }
    },
    moveLeft: function(player) {
      return {
        posx: player.posx - player.speed,
        posy: player.posy,
        direction: 3
      }
    },

    animationFrame: function(player) {
      if (player.loop_i < player.loop.length - 1) {
        player.loop_i++;
      } else {
        player.loop_i = 0;
      }
    },

    animateSmoke: function(smokepuff) {
      if (smokepuff.loop_i < smokepuff.loop.length - 1) {
        smokepuff.loop_i++;
      }
    },

    update_player: function(player, posx, posy, direction) {
      if (this.canMoveHere(posx, posy)) {
        player.posx = posx;
        player.posy = posy;
        player.direction = direction;
        this.animationFrame(player);
      }
    },

    update_all_bullets: function(deltat) {
      for(i=this.bullets.length-1; i >= 0; i--) {
        this.update_bullet(this.bullets[i], deltat);
        if (this.bullets[i].x < 0 || this.bullets[i].x > CANVAS_WIDTH || this.bullets[i].y < 0 || this.bullets[i].y > CANVAS_HEIGHT) {
          this.bullets.splice(i, 1);
        }
      }
    },

    update_bullet: function(bullet, deltat) {
      switch (bullet.direction) {
        case 0: //down
          bullet.y = bullet.y + bullet.speed*deltat;
          break;
        case 1: //right
          bullet.x = bullet.x + bullet.speed*deltat;
          break;
        case 2: //up
          bullet.y = bullet.y - bullet.speed*deltat;
          break;
        case 3: //left
          bullet.x = bullet.x - bullet.speed*deltat;
          break;
      }
    },

    update_smokepuffs: function() {
      for(i = this.smokePuffList.length-1; i>=0; i--) {
        if (this.smokePuffList[i].loop_i === this.smokePuffList[i].loop.length-1) {
          this.smokePuffList.splice(i, 1);
        } else {
          this.animateSmoke(this.smokePuffList[i]);
        }
      }
    }
}

const GamServerClient = {
  connected: false,
  CHAT: "/app/chat",
  JOIN: "/app/join",
  UPDATE_PLAYER: "/app/update/player",

  create: function() {
      var client = Object.create(this);
      client.socket = new WebSocket(SERVER_URL + "/lounge");
      client.stompClient = new Stomp.over(client.socket);
      return client;
  },

  connect: function(username, callback) {
      this.stompClient.connect({}, (frame) => {
        this.connected = true;
        this.stompClient.subscribe('/user/topic/access', (messageOutput) => {
          console.log(messageOutput);
        });
        this.stompClient.subscribe('/topic/chat', (messageOutput) => {
          console.log(messageOutput);
        });
        this.stompClient.subscribe('/topic/state', callback);
        this.sendMessage(this.JOIN,username);
      });
  },

  updatePlayer: function(input) {
    this.sendMessage(this.UPDATE_PLAYER,input);
  },

  sendChat: function(message) {
    this.sendMessage(this.CHAT, message);
  },

  sendMessage: function(topic, message) {
    if (this.connected) {
      this.stompClient.send(topic, {}, message);
    }
  }
}

const GameController = {
    lounge: null,
    context: null,
    loginPopUp: new Image(),
    player_image: new Image(),
    beer_image: new Image(),
    gun_spritesheet: new Image(),
    memescreen_img: new Image(),
    bullet_img: new Image(),
    flash_spritesheet: new Image(),
    bong_img: new Image(),
    smoke_img: new Image(),
    pizza_img: new Image(),
    controller_img: new Image(),
    water_img: new Image(),
    ragnarok: new Image(),
    curr_timestamp: 0.0,
    prev_timestamp: 0.0,
    last_render_timestamp: 0.0,
    player_loaded: false,
    fps: 0,
    last_fps_ts: 0.0,
    scores: [],
    killed_by: "none",
    game_over: false,

    KeyState: {
      key: [0,0,0,0,0,0,0],
      changeKey: function(which, to) {
        switch (which) {
          case 65: // a left
            this.key[0] = to;
            break;
          case 87: // w up
            this.key[2] = to;
            break;
          case 68: // d right
            this.key[1] = to;
            break;
          case 83: // s down
            this.key[3] = to;
            break;
          case 70: // f
            this.key[4] = to;
            break;
          case 71: // g gun
            this.key[5] = to;
            break;
          case 66: //b beer
            this.key[6] = to;
            break;
          case 84: // t type
            this.key[6] = to;
            break;
        }
      },
      keyFromAngle(angle) {
        if (angle > -45 && angle <= 45) { // right
            this.key[1] = 1;
            console.log("right");
          } else if (angle > 45 && angle <= 135) { //down
            this.key[3] = 1;
            console.log("down");
          } else if ( (angle > 135 && angle <= 180) || (angle >= -180 && angle < -135) ) { //left
            this.key[0] = 1;
            console.log("left");
          } else if (angle <= -45 && angle >= -135) { //up
            this.key[2] = 1;
            console.log("up");
          }
      },
      clearKeys() {
        for(i=0; i< this.key.length; i++) {
          this.key[i] = 0;
        }
      }
    },

    create: function() {
      var view = Object.create(this);
      view.lounge = Lounge.create("online__david");
      view.canvas = document.createElement("canvas");
      view.canvas.id = "lounge-canvas";
      view.context = view.canvas.getContext("2d");
      view.canvas.width = CANVAS_WIDTH;
      view.canvas.height = CANVAS_HEIGHT;
      DOCUMENT.body.appendChild(view.canvas);
      view.context.imageSmoothingEnabled = false;
      Utility.resize();
      view.player_image.src = 'assets/loungeman_spritesheet.png';
      view.player_image.onload = function(){
        PLAYER_DIMENSION = view.player_image.height/4;
        PLAYER_DIMENSION = view.player_image.width/3;
        view.player_loaded = true;
      }
      view.beer_image.src = 'assets/lounge_beer.png';
      view.gun_spritesheet.src = 'assets/lounge_gun_spritesheet.png';
      view.bullet_img.src = 'assets/pleading_eyes_emoji.png';
      view.flash_spritesheet.src = 'assets/gun_flash_spritesheet.png';
      view.bong_img.src = 'assets/bong.png';
      view.smoke_img.src = 'assets/smoke_spritesheet.png';
      view.pizza_img.src = 'assets/pizza.png';
      view.controller_img.src = 'assets/controller.png';
      view.water_img.src = 'assets/lil_water.png';
      view.memescreen_img.src = "https://s3.amazonaws.com/online-meme-board/meme.png";
      view.loginPopUp.src = "assets/online_lounge_login.png";
      view.ragnarok.src = "assets/ragnarok.png";
      LOUNGE_DIV.appendChild(view.loginPopUp);
      view.loginPopUp.onload = function() {
        view.loginPopUp.style.margin = "auto";
        view.loginPopUp.style.display = "block";
        view.loginPopUp.style.position = "relative";
      };
      if (!IS_MOBILE) {
        var loginInput = document.createElement('input');
        loginInput.className = "standardButton";
        loginInput.setAttribute("type", "text");
        loginInput.setAttribute("value", "anonymous");
        loginInput.style.maxWidth = "120px";
        LOUNGE_DIV.appendChild(loginInput);
      }
      var loginButton = document.createElement('button');
      loginButton.innerHTML = "log in";
      loginButton.className = "standardButton";
      if (SPECTATE) {
        view.canvas.style.display = "block";
        LOUNGE_DIV.style.display = "none";
        Utility.resize();
        view.start();
      } else {
        loginButton.onclick = function () {
          view.canvas.style.display = "block";
          LOUNGE_DIV.style.display = "none";
          Utility.resize();
          var player = document.getElementById("player");
          player.style.display = "block";
          if (!IS_MOBILE) {
            view.lounge.player_1.username = loginInput.value;
          } else {
            view.lounge.player_1.username = window.prompt("username: ");
          }
          view.start();
        }
      }

      LOUNGE_DIV.appendChild(loginButton);
      return view;
    },

    handle_player_input: function() {
      if(this.KeyState.key[0] || this.KeyState.key[1] || this.KeyState.key[2] || this.KeyState.key[3] || this.KeyState.key[4] || this.KeyState.key[5]) {
        var newPos = null
        if(this.KeyState.key[2]){
          newPos = this.lounge.moveUp(this.lounge.player_1);
        }
        if(this.KeyState.key[3]){
          newPos = this.lounge.moveDown(this.lounge.player_1);
        }
        if(this.KeyState.key[0]){
          newPos = this.lounge.moveLeft(this.lounge.player_1);
        }
        if(this.KeyState.key[1]){
          newPos = this.lounge.moveRight(this.lounge.player_1);
        }
        if(newPos != null && !this.checkFurnitureCollisions(newPos)) {
          this.lounge.update_player(this.lounge.player_1, newPos.posx, newPos.posy, newPos.direction)
        }
      }
    },

    handle_chat_command: function(command) {
      switch (command) {
        case "/gun":
          if (!this.lounge.player_1.holding_gun) {
            this.lounge.player_1.holding_gun = true;
          } else {
            this.lounge.player_1.holding_gun = false;
          }
//          socket.emit('holding gun', this.lounge.player_1.holding_gun);
          break;
        case "/beer":
          if (this.lounge.player_1.holding_item === null || this.lounge.player_1.holding_item != "beer") {
            this.lounge.player_1.holding_item = "beer";
          } else {
            this.lounge.player_1.holding_item = null;
          }
//          socket.emit('holding item', this.lounge.player_1.holding_item);
          break;
        case "/pizza":
          if (this.lounge.player_1.holding_item === null || this.lounge.player_1.holding_item != "pizza") {
            this.lounge.player_1.holding_item = "pizza";
          } else {
            this.lounge.player_1.holding_item = null;
          }
//          socket.emit('holding item', this.lounge.player_1.holding_item);
          break;
        case "/water":
            if (this.lounge.player_1.holding_item === null || this.lounge.player_1.holding_item != "water") {
              this.lounge.player_1.holding_item = "water";
            } else {
              this.lounge.player_1.holding_item = null;
            }
//            socket.emit('holding item', this.lounge.player_1.holding_item);
          break;
          case "/controller":
          if (this.lounge.player_1.holding_item === null || this.lounge.player_1.holding_item != "controller") {
            this.lounge.player_1.holding_item = "controller";
          } else {
            this.lounge.player_1.holding_item = null;
          }
//          socket.emit('holding item', this.lounge.player_1.holding_item);
          break;
        case "/smoke":
          this.lounge.player_1.last_bonghit = Utility.getTimestamp();
          var smokepuff = SmokePuff.create(this.lounge.player_1.posx, this.lounge.player_1.posy - PLAYER_DIMENSION/3);
          this.lounge.smokePuffList.push(smokepuff);
//          socket.emit('bong hit');
          break;
        case "/$wag":
//          socket.emit('swag');
          break;
      }
    },

    handle_chat_message: function(message) {
      if (message.startsWith("/")) {
        this.handle_chat_command(message);
      } else {
        this.lounge.player_1.message = message;
        this.serverClient.sendChat(message);
//        socket.emit('message', this.lounge.player_1.message);
      }
    },

    getTouchPos: function(touchEvent) {
      var rect = this.canvas.getBoundingClientRect();
      return {
        x: (touchEvent.touches[0].clientX - rect.left) * CANVAS_WIDTH/rect.width,
        y: (touchEvent.touches[0].clientY - rect.top) * CANVAS_HEIGHT/rect.height
      };
    },

    render: function() {
      this.context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.draw_all_furniture();
      this.draw_all_bullets();
      this.draw_all_players();
      this.draw_bong();
      this.draw_smokepuffs();
      this.draw_hiscores();
    },
    draw_text: function(message, x, y) {
      this.context.font = "15 px Arial";
      this.context.textAlign = "center";
      this.context.fillText(message, x, y)
    },
    draw_hiscores: function() {
      var y = 10;
      var increment = 10;
      this.draw_text("hi scores:", 78, y);
      y+= increment*2;
      for(i=this.scores.length-1; i >= 0; i--) {
        this.draw_text(this.scores[i].name + " - " + this.scores[i].score, 78, y);
        y+=increment;
      }
    },
    draw_username: function(player) {
      this.draw_text(player.username, player.posx + (PLAYER_DIMENSION/2), player.posy + PLAYER_DIMENSION + 10);
    },
    draw_onlinetime: function(player) {
      this.draw_text(parseInt(player.score, 10), player.posx + (PLAYER_DIMENSION/2), player.posy + PLAYER_DIMENSION + 20);
    },
    draw_message: function(player){
      this.draw_text(player.message, player.posx + (PLAYER_DIMENSION/2), player.posy - 10);
    },
    draw_bong: function() {
      this.context.drawImage(this.bong_img, this.lounge.bong.x, this.lounge.bong.y)
    },
    draw_smokepuffs: function() {
      this.lounge.smokePuffList.forEach(function(smokepuff) {
        this.context.drawImage(this.smoke_img, 0, smokepuff.loop[smokepuff.loop_i] * PLAYER_DIMENSION, PLAYER_DIMENSION, PLAYER_DIMENSION, smokepuff.x, smokepuff.y, PLAYER_DIMENSION, PLAYER_DIMENSION);
      }.bind(this));
    },
    draw_item: function(player) {
      var image = null;
      switch (player.holding_item) {
        case "beer":
          image = this.beer_image;
          break;
        case "pizza":
          image = this.pizza_img;
          break;
        case "controller":
          image = this.controller_img;
          break;
        case "water":
          image = this.water_img;
          break;
      }
      if (image != null) {
        switch (player.direction) {
          case 0:
            this.context.drawImage(image, 0, 0, (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx + (PLAYER_DIMENSION/2) + 2, player.posy + (PLAYER_DIMENSION/2) - 3, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
            break;
          case 1:
            this.context.drawImage(image, 0, 0, (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx + PLAYER_DIMENSION - 5, player.posy + (PLAYER_DIMENSION/2) - 5, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
            break;
          case 3:
            this.context.drawImage(image, 0, 0, (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx - (PLAYER_DIMENSION/2) * player.scale + 5, player.posy + (PLAYER_DIMENSION/2) - 5, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
            break;
        }
      }
    },
    draw_gun: function(player) {
      switch (player.direction) {
        case 0:
          this.context.drawImage(this.gun_spritesheet, 0, player.direction * (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx - 3, player.posy + (PLAYER_DIMENSION/2) - 5, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
          break;
        case 1:
          this.context.drawImage(this.gun_spritesheet, 0, player.direction * (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx + PLAYER_DIMENSION - 5, player.posy + (PLAYER_DIMENSION/2) - 5, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
          break;
        case 3:
          this.context.drawImage(this.gun_spritesheet, 0, player.direction * (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx - (PLAYER_DIMENSION/2) * player.scale + 5, player.posy + (PLAYER_DIMENSION/2) - 5, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
          break;
      }
    },
    shoot_bullet: function() {
      if (this.lounge.player_1.holding_gun && this.lounge.player_1.bullets > 0 && this.lounge.player_1.username != "anonymous" && this.lounge.player_1.username != null && this.lounge.player_1.username != "") {
        this.lounge.player_1.last_shot = Utility.getTimestamp();
        var newBullet = Bullet.create(this.lounge.player_1.posx + PLAYER_DIMENSION/2, this.lounge.player_1.posy + PLAYER_DIMENSION/2, this.lounge.player_1.direction);
        newBullet.shot_by = this.lounge.player_1.id;
        this.lounge.bullets.push(newBullet);
//        socket.emit('shot gun');
      }
    },
    draw_flash: function(player) {
      switch (player.direction) {
        case 0:
          this.context.drawImage(this.flash_spritesheet, 0, player.direction * (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx - 5, player.posy + (PLAYER_DIMENSION/2) - 10, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
          break;
        case 1:
          this.context.drawImage(this.flash_spritesheet, 0, player.direction * (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx + PLAYER_DIMENSION - 5 + PLAYER_DIMENSION/2, player.posy + (PLAYER_DIMENSION/2) - 7, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
          break;
        case 3:
          this.context.drawImage(this.flash_spritesheet, 0, player.direction * (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), (PLAYER_DIMENSION/2), player.posx - (PLAYER_DIMENSION/2) * player.scale + 5 - PLAYER_DIMENSION/2, player.posy + (PLAYER_DIMENSION/2) - 7, (PLAYER_DIMENSION/2) * player.scale, (PLAYER_DIMENSION/2) * player.scale);
          break;
      }
    },
    draw_bullet: function(bullet) {
      this.context.drawImage(this.bullet_img, bullet.x, bullet.y, BULLET_DIMENSION, BULLET_DIMENSION);
    },
    draw_all_bullets: function() {
      for(i=0; i < this.lounge.bullets.length; i++) {
        this.draw_bullet(this.lounge.bullets[i]);
      }
    },
    draw_memescreen: function() {
      this.context.drawImage(this.memescreen_img, 352, 0, 160, 160);
      this.context.drawImage(this.ragnarok, 325, 355, 120, 110);
    },
    draw_player_frame: function(player, frameX, frameY, canvasX, canvasY) {
      this.context.drawImage(this.player_image, frameX * PLAYER_DIMENSION, frameY * PLAYER_DIMENSION, PLAYER_DIMENSION, PLAYER_DIMENSION, canvasX, canvasY, PLAYER_DIMENSION * player.scale, PLAYER_DIMENSION * player.scale);
    },
    draw_player: function(player) {
      if (player != []) {
        this.draw_player_frame(player, player.loop[player.loop_i], player.direction, player.posx, player.posy);
        this.draw_username(player);
        //this.draw_onlinetime(player);
      }
    },
    draw_all_players: function() {
      for (i = 0; i < this.lounge.players.length; i++) {
        this.draw_player(this.lounge.players[i]);
        if (this.lounge.players[i].message != null) {
          this.draw_message(this.lounge.players[i]);
        }
        if (this.lounge.players[i].holding_gun) {
          this.draw_gun(this.lounge.players[i]);
        }
        if (this.lounge.players[i].holding_item!=null) {
          this.draw_item(this.lounge.players[i]);
        }
      }
    },
    draw_furniture: function(furniture) {
      this.context.drawImage(furniture.image, furniture.posx, furniture.posy);
    },
    draw_all_furniture: function() {
      this.lounge.furnitureList.forEach(function(furniture){
        this.draw_furniture(furniture);
      }.bind(this));
      this.draw_memescreen();
    },

    checkFurnitureCollisions: function(p) {
      var result = false;
      this.lounge.furnitureList.forEach(function(furniture){
        if (furniture.isBlocking) {
          if (p.posx < furniture.rightx &&
              p.posx + PLAYER_DIMENSION > furniture.leftx &&
              p.posy + (2*PLAYER_DIMENSION/3) < furniture.bottomy &&
              p.posy + PLAYER_DIMENSION > furniture.topy) {
              result = true;
          }
        }
      }.bind(this));
      return result;
    },

    step: function() {
      if (!this.game_over) {
        this.prev_timestamp = this.curr_timestamp;
        this.curr_timestamp = Utility.getTimestamp();

        if(this.player_loaded) {
          this.handle_player_input();
          var deltat = this.curr_timestamp - this.prev_timestamp;
          this.lounge.update_all_bullets(deltat);

          var render_deltat = Utility.getTimestamp() - this.last_render_timestamp;
          if(render_deltat > RENDER_DELAY) {
            this.lounge.update_smokepuffs();
            this.render();
            var last_shot_deltat = Utility.getTimestamp() - this.lounge.player_1.last_shot;
            if (last_shot_deltat < FLASH_LENGTH) {
              this.draw_flash(this.lounge.player_1);
            }
            this.fps++;
            this.last_render_timestamp = Utility.getTimestamp();
          }

          var fps_deltat = Utility.getTimestamp() - this.last_fps_ts;
          if(fps_deltat > 1) {
            //console.log(this.fps);
            this.fps = 0;
            this.last_fps_ts = Utility.getTimestamp();
          }
        }

        window.requestAnimationFrame(function() {
          this.step();
        }.bind(this));
      } else {
        this.context.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.draw_text("you've been digitally murdered by " + this.killed_by + ", reload the page to rejoin", CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
      }
    },

    init_game_loop: function() {
      var timestamp = Utility.getTimestamp();
      this.last_render_timestamp = timestamp;
      this.last_fps_ts = timestamp;
      window.addEventListener('keydown', function(e) {
        this.KeyState.changeKey(e.keyCode, 1);
        if (e.keyCode == 32) {
          console.log("shoot gun");
          this.shoot_bullet();
        }
      }.bind(this));
      window.addEventListener('keyup', function(e) {
        this.KeyState.changeKey(e.keyCode, 0);
      }.bind(this));
      if (IS_MOBILE) {
        window.addEventListener('touchstart', function(e) {
          if (Utility.doubletap()) {
            console.log("shoot gun");
            this.shoot_bullet();
          } else {
            var touch = this.getTouchPos(e);
            console.log(touch);
            if (touch.x < 0) {
              touch.x = 0;
            }
            if (touch.y > CANVAS_HEIGHT) {
              touch.y = CANVAS_HEIGHT;
            }
            var angle = Utility.getAngle(this.lounge.player_1.posx + PLAYER_DIMENSION/2, this.lounge.player_1.posy + PLAYER_DIMENSION/2, touch.x, touch.y);
            this.KeyState.keyFromAngle(angle);
          }
        }.bind(this), false);
        window.addEventListener('touchmove', function(e) {
          preventDefault(e);
          var touch = this.getTouchPos(e);
          console.log(touch);
          if (touch.x < 0) {
            touch.x = 0;
          }
          if (touch.y > CANVAS_HEIGHT) {
            touch.y = CANVAS_HEIGHT;
          }
          var angle = Utility.getAngle(this.lounge.player_1.posx + PLAYER_DIMENSION/2, this.lounge.player_1.posy + PLAYER_DIMENSION/2, touch.x, touch.y);
          this.KeyState.clearKeys();
          this.KeyState.keyFromAngle(angle);
        }.bind(this), wheelOpt);
        window.addEventListener('touchend', function(e) {
          this.KeyState.clearKeys();
        }.bind(this), false);
      }
      window.requestAnimationFrame(function() {
        this.step();
      }.bind(this));
    },

    start: function() {
//      var socketConnection = socket.connect();
//      socket.on('lounge full', function() {
//        alert(":( the lounge is currently full\ntry again later :)");
//      });
//      socketConnection.on('connect', function(){
//        const sessionID = socketConnection.id;
//        console.log("connected: " + sessionID);
//        this.lounge.player_1.id = sessionID;
//        if (!SPECTATE) {
//          socket.emit('new player', this.lounge.player_1);
//        } else {
//          this.lounge.players.splice(0, 1);
//        }
//      }.bind(this));
//      setInterval(function() {
//        socket.emit('update player', this.KeyState.key);
//      }.bind(this), 1000 / 60);
//      socket.on('state', function(serverPlayers) {
//        if (serverPlayers.length < this.lounge.players.length) {
//          this.lounge.players = serverPlayers;
//        }
//        for (i = 0; i < serverPlayers.length; i++) {
//          if (serverPlayers[i].id === this.lounge.player_1.id) {
//            this.lounge.player_1 = serverPlayers[i];
//          }
//          if (i < this.lounge.players.length) {
//            this.lounge.players[i] = serverPlayers[i];
//          } else {
//            this.lounge.players.push(serverPlayers[i]);
//          }
//        }
//      }.bind(this));
//      socket.on('bullets', function(serverBullets) {
//        if (serverBullets.length < this.lounge.bullets.length) {
//          this.lounge.bullets = serverBullets;
//        }
//        for (i = 0; i < serverBullets.length; i++) {
//          if (i < this.lounge.bullets.length) {
//            this.lounge.bullets[i] = serverBullets[i];
//          } else {
//            this.lounge.bullets.push(serverBullets[i]);
//          }
//        }
//      }.bind(this));
//      socket.on('player killed', function(killInfo) {
//        if (killInfo.killed === this.lounge.player_1.id) {
//          socket.disconnect();
//          this.killed_by = killInfo.killer;
//          this.game_over = true;
//        }
//      }.bind(this));
//      socket.on('bong hit', function(smokepuff) {
//        this.lounge.smokePuffList.push(smokepuff);
//      }.bind(this));
//      socket.on('scoreboard update', function(scores) {
//        this.scores = scores;
//      }.bind(this));
      this.serverClient = GamServerClient.create();
      this.serverClient.connect(this.lounge.player_1.username, (result) => {
        console.log(result);
      });
      setInterval(function() {
        this.serverClient.updatePlayer(JSON.stringify(this.KeyState.key))
      }.bind(this), 1000 / 30);
      DOCUMENT.getElementById("chat-button").onclick = function() {
        if (!IS_MOBILE) {
          DOCUMENT.getElementById("chat-area").style.opacity = 1;
          DOCUMENT.getElementById("chat-button").style.display = 'none';
          DOCUMENT.getElementById("sendit-button").style.display = 'block';
        } else {
          var msg = window.prompt("chat message:");
          this.handle_chat_message(msg);
        }
      }.bind(this);
      DOCUMENT.getElementById("sendit-button").onclick = function() {
        if (!IS_MOBILE) {
          DOCUMENT.getElementById("sendit-button").style.display = 'none';
          DOCUMENT.getElementById("chat-button").style.display = 'block';
          DOCUMENT.getElementById("chat-area").style.opacity = 0;
        }
        var msg = DOCUMENT.getElementById("chat-area").value;
        this.handle_chat_message(msg);
      }.bind(this);
      this.init_game_loop();
    },
};

var gameController = GameController.create();
window.addEventListener('resize', function(e){
    gameController.context.imageSmoothingEnabled = false;
    Utility.resize(gameController);
}, false);