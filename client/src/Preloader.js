import { OL } from './utils';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }
    preload() {
        var logo = this.add.sprite(OL.world.centerX, OL.world.centerY, 'logo');
        logo.setOrigin(0.5, 0.5);

		this.load.html('nameform', 'loginform.html');
		this.load.html('chatBox', 'chatbox.html');
		this.load.spritesheet('computer_guy', 'assets/sprites/computerguy-spritesheet-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('cute_guy', 'assets/sprites/cuteguy-spritesheet-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('phone_guy', 'assets/sprites/phoneguy-spritesheet-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('typingIcon', 'assets/typing.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('chatIcon', 'assets/chat-button.png', {frameWidth: 24, frameHeight: 16});
		this.load.spritesheet('purpleButterfly', 'assets/sprites/butterfly-purple-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('blueButterfly', 'assets/sprites/butterfly-blue-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('orangeButterfly', 'assets/sprites/butterfly-orange-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('pinkButterfly', 'assets/sprites/butterfly-pink-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('coin', 'assets/sprites/coin-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('heart', 'assets/sprites/heart-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('onlineBouncer', 'assets/sprites/onlinebouncer-extruded.png', { frameWidth: 32, frameHeight: 48, margin: 1, spacing: 2 });
		this.load.image('cute', 'assets/pleading_eyes_emoji.png');
		this.load.image('menuBar', 'assets/menu-bar.png');
		this.load.image('popup', 'assets/popup.png');
		this.load.image('olLogo', 'assets/logo.png');
		this.load.image('redButton', "assets/red-button.png");
		this.load.image('greenButton', "assets/green-button.png");
		this.load.image('x', "assets/x.png");
		this.load.image('groundTiles', "assets/tiles/online-pluto-tileset-extruded.png");
		this.load.image('objectTiles', "assets/tiles/online-tileset-extruded.png");
		this.load.image('loungeTiles', "assets/tiles/online-lounge-objects-extruded.png");
		
		this.load.tilemapTiledJSON('map', 'assets/tiles/onlinepluto-tilemap-new.json');
		this.load.tilemapTiledJSON('loungeMap', 'assets/tiles/onlinelounge-tilemap.json');
    }
    create() {
		OL.fadeOutScene('MainMenu', this);
	}
}