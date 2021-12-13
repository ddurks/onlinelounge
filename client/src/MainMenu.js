import { OL } from './utils';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        this.input.keyboard.on('keydown', this.handleKey, this);

        var text = this.add.text(10, 10, 'Please login to play', { color: '#fbf236', fontFamily: 'gaming2', fontSize: '16px '});

        var element = this.add.dom(OL.world.width/2, OL.world.height/2).createFromCache('nameform');

        element.setPerspective(800)
        element.addListener('click');

        var thisScene = this;
    
        element.on('click', function (event) {
    
            if (event.target.name === 'loginButton')
            {
                var inputUsername = this.getChildByName('username');
                var inputPassword = this.getChildByName('password');
    
                if (inputUsername.value !== '')
                {
                    OL.username = inputUsername.value;
                    OL.password = inputPassword.value;
                    console.log(OL.username);
                    this.removeListener('click');
                    thisScene.clickStart(thisScene);
    
                    text.setText('Welcome ' + inputUsername.value);
                }
                else
                {
                    this.scene.tweens.add({ targets: text, alpha: 0.1, duration: 200, ease: 'Power3', yoyo: true });
                }
            }
    
        });
    }

    handleKey(e) {
        switch(e.code) {
            case 'KeyS': {
                break;
            }
            case 'Enter': {
                this.clickStart(this);
                break;
            }
            default: {}
        }
    }

    clickStart(scene) {
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