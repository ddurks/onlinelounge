import 'phaser';
import { Preloader } from './Preloader';
import { Boot } from './Boot';
import { MainMenu } from './MainMenu';
import { DigitalPlanet } from './DigitalPlanet';
import { Controls } from './Controls';

var gameConfig = {
	render: {
		roundPixels: true,
		pixelArt: true,
		antialias: false,
	},
	scale: {
		parent: 'phaser-div',
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: 512,
		height: 512
	},
	parent: "phaser-div",
	dom: {
		createContainer: true
	},	  
    physics: {
		default: 'matter',
		matter: {
			enableSleeping: true,
			gravity: {
				y: 0
			},
			debug: false
		}
    },
	scene: [Boot, Preloader, MainMenu, DigitalPlanet, Controls]
}
var game = new Phaser.Game(gameConfig);
window.focus();
