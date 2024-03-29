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
		width: window.innerWidth,
		height: window.innerHeight
	},
	parent: "phaser-div",
	dom: {
		createContainer: true
	},	  
    physics: {
		default: 'matter',
		matter: {
			enableSleeping: false,
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
