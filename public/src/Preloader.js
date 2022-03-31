import { OL } from './utils';

export class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }
    preload() {
        // var logo = this.add.sprite(OL.world.centerX, OL.world.centerY, 'logo');
        // logo.setOrigin(0.5, 0.5);
		var progressBar = this.add.graphics();
		var progressBox = this.add.graphics();
		progressBox.fillStyle(0x222222, 0.8);
		progressBox.fillRect(240, 270, 320, 50);
		
		var width = this.cameras.main.width;
		var height = this.cameras.main.height;
		var loadingText = this.make.text({
			x: width / 2,
			y: height / 2 - 50,
			text: 'Loading...',
			style: {
				font: '20px monospace',
				fill: '#ffffff'
			}
		});
		loadingText.setOrigin(0.5, 0.5);
		
		var percentText = this.make.text({
			x: width / 2,
			y: height / 2 - 5,
			text: '0%',
			style: {
				font: '18px monospace',
				fill: '#ffffff'
			}
		});
		percentText.setOrigin(0.5, 0.5);
		
		var assetText = this.make.text({
			x: width / 2,
			y: height / 2 + 50,
			text: '',
			style: {
				font: '18px monospace',
				fill: '#ffffff'
			}
		});
		assetText.setOrigin(0.5, 0.5);
		
		this.load.on('progress', function (value) {
			percentText.setText(parseInt(value * 100) + '%');
			progressBar.clear();
			progressBar.fillStyle(0xffffff, 1);
			progressBar.fillRect(250, 280, 300 * value, 30);
		});
		
		this.load.on('fileprogress', function (file) {
			assetText.setText('Loading asset: ' + file.key);
		});
		this.load.on('complete', function () {
			progressBar.destroy();
			progressBox.destroy();
			loadingText.destroy();
			percentText.destroy();
			assetText.destroy();
		});

		this.load.html('nameform', 'loginform.html');
		this.load.html('chatBox', 'chatbox.html');
		this.load.html('gifViewer', 'gif-viewer.html');
		this.load.spritesheet('computer_guy', 'assets/sprites/computerguy-spritesheet-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('cute_guy', 'assets/sprites/cuteguy-spritesheet-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('phone_guy', 'assets/sprites/phoneguy-spritesheet-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('walrus', 'assets/sprites/walrus-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('obama', 'assets/sprites/obama-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('online_guy', 'assets/sprites/online_guy-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('drawvid', 'assets/sprites/drawvid-extruded.png', { frameWidth: 32, frameHeight: 32, margin: 1, spacing: 2 });
		this.load.spritesheet('typingIcon', 'assets/sprites/typing.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('purpleButterfly', 'assets/sprites/butterfly-purple-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('blueButterfly', 'assets/sprites/butterfly-blue-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('orangeButterfly', 'assets/sprites/butterfly-orange-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('pinkButterfly', 'assets/sprites/butterfly-pink-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('coin', 'assets/sprites/coin-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('heart', 'assets/sprites/heart-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('onlineBouncer', 'assets/sprites/onlinebouncer-extruded.png', { frameWidth: 32, frameHeight: 48, margin: 1, spacing: 2 });
		this.load.spritesheet('connection', 'assets/sprites/connection_icons.png', { frameWidth: 48, frameHeight: 48, margin: 0, spacing: 0 });
		this.load.spritesheet('gun', 'assets/sprites/gun-extruded.png', { frameWidth: 16, frameHeight: 16, margin: 1, spacing: 2 });
		this.load.spritesheet('bullet', 'assets/sprites/bulletguy.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('gunflash', 'assets/sprites/gun_flash_spritesheet.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('sparkle', 'assets/sprites/sparkle.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('playermarker', 'assets/sprites/playermarker.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('shovel', 'assets/sprites/shovel-spritesheet.png', { frameWidth: 16, frameHeight: 16, margin: 0, spacing: 0 });
		this.load.spritesheet('shovelButton', 'assets/sprites/shovel-button-spritesheet.png', { frameWidth: 64, frameHeight: 64, margin: 0, spacing: 0 });
		this.load.image('menuBar', 'assets/hud/menu-bar.png');
		this.load.image('popup', 'assets/hud/popup.png');
		this.load.image('board', 'assets/hud/board.png');
		this.load.image('olLogo', 'assets/hud/logo.png');
		this.load.image('leaderboard', 'assets/hud/leaderboard.png');
		this.load.image('redButton', "assets/hud/red-button.png");
		this.load.image('greenButton', "assets/hud/green-button.png");
		this.load.image('chatIcon', 'assets/hud/square-talk.png', {frameWidth: 16, frameHeight: 16});
		this.load.image('gunButton', 'assets/hud/gun-button.png', {frameWidth: 64, frameHeight: 64});
		this.load.image('buryButton', 'assets/hud/bury-button.png', {frameWidth: 64, frameHeight: 64});
		this.load.image('x', "assets/hud/x.png");
		this.load.image('joystick', "assets/hud/joystick.png");
		this.load.image('joystickBg', "assets/hud/joystick_bg.png");
		this.load.image('zoomIn', "assets/hud/zoomIn.png");
		this.load.image('zoomOut', "assets/hud/zoomOut.png");
		this.load.image('groundTiles', "assets/tiles/online-pluto-tileset-extruded.png");
		this.load.image('objectTiles', "assets/tiles/online-pluto-objects-extruded.png");
		this.load.image('loungeTiles', "assets/tiles/online-lounge-objects-extruded.png");
		
		this.load.tilemapTiledJSON('map', 'assets/tiles/onlinepluto-tilemap-new.json');
		this.load.tilemapTiledJSON('loungeMap', 'assets/tiles/onlinelounge-tilemap.json');
    }
    create() {
		OL.fadeOutScene('MainMenu', this);
	}
}