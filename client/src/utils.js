export var OL = {
    SERVER_URL: "ws://" + window.location.host.replace(/\d+$/, "9080"),
    username: "anonymous",
    password: "",
    CHAT_TEXT: " chat \n",
    SEND_TEXT: "send",
    MSG_MAXTIME: 10000,
    WALKING_FRAMERATE: 10,
    WALKING_SPEED: 2.5,
    IS_MOBILE: false,
    WALKING_FORCE: 0.002
};

export var touchSense = window.addEventListener('touchstart', function() {			
    OL.IS_MOBILE = true;
    console.log("IS_MOBILE");
    removeEventListener('touchstart', touchSense, false);
});

OL.fadeOutIn = function(passedCallback, context) {
    context.cameras.main.fadeOut(250);
    context.time.addEvent({
        delay: 250,
        callback: function() {
        context.cameras.main.fadeIn(250);
        passedCallback(context);
        },
        callbackScope: context
    });  
}
OL.fadeOutScene = function(sceneName, context) {
    context.cameras.main.fadeOut(750);
    context.time.addEvent({
        delay: 750,
        callback: function() {
            context.scene.start(sceneName);
        },
        callbackScope: context
    });
};


export class TextButton extends Phaser.GameObjects.Text {
    constructor(scene, x, y, text, style, callback) {
      super(scene, x, y, text, style);

      this.setInteractive({ useHandCursor: true })
        .on('pointerover', () => this.enterButtonHoverState() )
        .on('pointerout', () => this.enterButtonRestState() )
        .on('pointerdown', () => this.enterButtonActiveState() )
        .on('pointerup', () => {
          this.enterButtonHoverState();
          callback();
        });
    }

    enterButtonHoverState() {
      this.setStyle({ fill: 'lightgrey'});
    }

    enterButtonRestState() {
      this.setStyle({ fill: 'black'});
    }

    enterButtonActiveState() {
      this.setStyle({ fill: 'lightgrey' });
    }
}

OL.getRandomInt= function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

OL.getAngle = function(cx, cy, ex, ey) {
  var dy = ey - cy;
  var dx = ex - cx;
  var theta = Math.atan2(dy, dx); // range (-PI, PI]
  theta *= 180 / Math.PI; // rads to degs, range (-180, 180]
  //if (theta < 0) theta = 360 + theta; // range [0, 360)
  return theta;
}

OL.getDistance = function(x1, y1, x2, y2) {
  return Math.sqrt(Math.pow(x1-x2, 2), Math.pow(y1-y2, 2));
}