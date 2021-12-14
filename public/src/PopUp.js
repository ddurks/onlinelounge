import { OL } from './utils';

export class PopUp extends Phaser.GameObjects.Group {
    constructor(scene) {
        super(scene);
        this.popup = scene.add.image(64, 74, 'popup');
        this.popup.setOrigin(0, 0);
        this.popup.setDepth(11);
        this.popup.setVisible(false);
        this.popup.setScrollFactor(0);

        this.x = scene.add.image(416, 74, 'x').setInteractive();
        this.x.on('pointerdown', () => {
            this.close();
        })
        this.x.setOrigin(0, 0);
        this.x.setDepth(12);
        this.x.setVisible(false);
        this.x.setScrollFactor(0);

        this.title = scene.add.text(256, 74, "lounge", { fontFamily: 'gaming2',color:  '#000000' ,fontSize: '16px'} );
        this.title.setOrigin(0.5, 0);
        this.title.setDepth(12);
        this.title.setVisible(false);
        this.title.setScrollFactor(0);

        this.textBody = scene.add.text(90, 138, "", {
            fontFamily: 'gaming1',
            fontSize: '32px',
            color:  '#000000',
            wordWrap: {
                width: 320,
                useAdvancedWrap: true
            },
            align: 'center'
        });
        this.textBody.setOrigin(0, 0);
        this.textBody.setDepth(12);
        this.textBody.setVisible(false);
        this.textBody.setScrollFactor(0);

        this.button = scene.add.image(280, 330, 'greenButton').setInteractive();
        this.button.on('pointerdown', () => this.changeLook(scene));
        this.button.setOrigin(0, 0);
        this.button.setDepth(11);
        this.button.setVisible(false);
        this.button.setScrollFactor(0);
        this.buttonText = scene.add.text(300, 350, "", {
            fontFamily: 'Arial',
            fontSize: '16px',
            color:  '#000000',
            wordWrap: {
                width: 320,
                useAdvancedWrap: true
            },
            align: 'center'
        });
        this.buttonText.setOrigin(0, 0);
        this.buttonText.setDepth(13);
        this.buttonText.setVisible(false);
        this.buttonText.setScrollFactor(0);

        scene.scene.get('DigitalPlanet').events.on('playerLoaded', (playerSprite) => {
            this.loadPlayerIcon(scene, playerSprite);
            this.setSprite(scene, playerSprite.texture);
        });
        return this;
    }

    loadPlayerIcon(scene, playerSprite) {
        this.playerIcon = scene.add.image(475, 22, playerSprite.texture, 12).setInteractive();
        this.playerIcon.setScale(2);
        this.playerIcon.setDepth(12);
        this.playerIcon.setScrollFactor(0);
        this.playerIcon.on( 'pointerdown', () => this.displayLookPopup("look 👀", playerSprite.texture));
    }


    changeLook(scene) {
        this.sprite.destroy();
        this.playerIcon.destroy();
        scene.events.emit('lookChange');
        this.close();
    }

    displayLookPopup(title, text) {
        this.title.setText(title);
        this.sprite.setVisible(true);
        this.display(text);
        this.displayButton("change");
    }

    display(text) {
        this.textBody.setText(text);
        this.popup.setVisible(true);
        this.x.setVisible(true);
        this.title.setVisible(true);
        this.textBody.setVisible(true);
        this.sprite.anims.play('down');
    }

    displayButton(label) {
        this.button.setVisible(true);
        this.buttonText.setVisible(true);
        this.buttonText.setText(label);
    }

    close() {
        this.popup.setVisible(false);
        this.x.setVisible(false);
        this.title.setVisible(false);
        this.textBody.setVisible(false);
        this.button.setVisible(false);
        this.buttonText.setVisible(false);
        this.sprite.setVisible(false);
        this.sprite.anims.stop();
    }

    setSprite(scene, texture) {
        this.sprite = scene.add.sprite(246, 256, texture);

        this.sprite.anims.create({
            key: 'down', 
            frameRate: OL.WALKING_FRAMERATE - 4,
            frames: this.sprite.anims.generateFrameNumbers(texture, { frames: [0, 1, 0, 2] }),
            repeat: -1
        });

        this.sprite.setVisible(false);
        this.sprite.setScale(2);
        this.sprite.setDepth(12);  
    }
}