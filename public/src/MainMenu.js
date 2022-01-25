import { OL } from './utils';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.input.keyboard.on('keydown', this.handleKey, this);

        this.text = this.add.text(10, 10, 'Please login to play', { color: '#fbf236', fontFamily: 'Arial', fontSize: '16px '});

        var element = this.add.dom(OL.world.width/2, OL.world.height/2).createFromCache('nameform');

        element.setPerspective(800)
        element.addListener('click');
    
        element.on('click', (event) => {
            if (event.target.name === 'loginButton') {
                this.login();
            }
    
        });
    }

    handleKey(e) {
        switch(e.code) {
            case 'KeyS': {
                break;
            }
            case 'Enter': {
                this.login();
                break;
            }
            default: {}
        }
    }

    login() {
        var inputUsername = document.getElementById('username');
        var inputPassword = document.getElementById('password');

        OL.username = inputUsername.value;
        OL.password = inputPassword.value;
        this.clickStart();
    }

    clickStart() {
        this.text.setText('Welcome ' + OL.username);
        this.scene.start('Controls');
        this.scene.start('DigitalPlanet', {
            spawn: {
                x: 50,
                y: 50
            },
            butterflies: 3,
            mapKey: "map",
            groundTileset: {
                name: "online-pluto-tileset-extruded",
                ref: "groundTiles"
            },
            objectTileset: {
                name: "online-tileset-extruded",
                ref: "objectTiles"
            }
        });
    }
}