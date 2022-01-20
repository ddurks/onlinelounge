import { PopUp } from "./PopUp";
import { TextButton, OL } from "./utils";
import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';

export class HealthBar extends Phaser.GameObjects.Group {
    constructor(scene, heartsNum) {
        super(scene);
        this.hearts = new Array();
        let xCurr = OL.world.width - 30;
        for (let i = 0; i < heartsNum; i++) {
            this.hearts.push(scene.add.image(xCurr, 75, 'heart', 0).setScale(2))
            this.add(this.hearts[i]);
            xCurr -= 45;
        }
        return this;
    }

    setHealth(number) {
        if (number < 0) {
            number = 0;
        } else if (number > 3) {
            number = 3;
        }
        this.hearts.forEach((heart) => {
            if (number > 0) {
                heart.setVisible(true);
            } else {
                heart.setVisible(false);
            }
            number--;
        })
    }
}

export class Controls extends Phaser.Scene {
    constructor() {
        super('Controls');

        this.chatText = OL.CHAT_TEXT;
        this.zoomed = false;
        this.prevPopupText = "";
    }

    create() {
        this.camera = this.cameras.main;
        this.createMenuBar();
        var logo = this.add.image(-1, -2, 'olLogo');
        logo.setOrigin(0, 0);
        logo.setDepth(11);

        this.add.text(95, -1, "users", {
            fontFamily: 'Arial',
            fontSize: '10px',
            color:  '#000000',
            wordWrap: {
                width: 320,
                useAdvancedWrap: true
            },
            align: 'center'
        }).setDepth(11);
        this.add.text(95, 7, "online:", {
            fontFamily: 'Arial',
            fontSize: '10px',
            color:  '#000000',
            wordWrap: {
                width: 320,
                useAdvancedWrap: true
            },
            align: 'center'
        }).setDepth(11);
        this.populationText = this.add.text(95, 14, "-", {
            fontFamily: 'Arial',
            fontSize: '25px',
            fontStyle: 'bold',
            color:  '#000000',
            wordWrap: {
                width: 320,
                useAdvancedWrap: true
            },
            align: 'center'
        }).setDepth(11);
        this.connectionIcon = this.add.image(45, -2, 'connection', 1).setOrigin(0, 0).setDepth(11);

        var chatIcon = this.add.image(OL.world.width - 52, OL.world.height - 37, 'chatIcon', 0);
        chatIcon.setScale(4);
        chatIcon.setDepth(11);
        this.add.existing(chatIcon).setScrollFactor(0);
        this.chatButton = new TextButton(this, OL.world.width - 87, OL.world.height - 52, OL.CHAT_TEXT, { fontFamily: 'gaming2',color:  '#000000' ,fontSize: '16px'}, () => this.chat());
        this.chatButton.setDepth(11);
        this.add.existing(this.chatButton).setScrollFactor(0);

        this.add.dom(OL.world.width/2, OL.world.height/2).createFromCache('chatBox').setScrollFactor(0);
        document.getElementById("chat-box").style.display = "none";
        const MAX_LENGTH = 100;
        document.getElementById('chat-entry').onkeyup = function () {
            document.getElementById('char-count').innerHTML = (this.value.length) + "/" + MAX_LENGTH;
        };

        this.zoomButton = new TextButton(this, OL.world.width - 135, 15, "zoom", { fontFamily: 'gaming2',color:  '#000000' ,fontSize: '16px'}, () => this.zoom());
        this.zoomButton.setDepth(12);
        this.add.existing(this.zoomButton).setScrollFactor(0);

        this.gunButton = this.add.image(OL.world.width - 40, OL.world.height - 108, 'gunButton').setVisible(false).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            this.events.emit('shootGun');
        });

        if (this.popup) {
            this.popup.destroy();
        }
        this.popup = new PopUp(this);
        this.healthBar = new HealthBar(this, 3);
        if (OL.IS_MOBILE) {
            this.joystick = new VirtualJoystick(this, {
                x: 125,
                y: OL.world.height - 125,
                radius: 100,
            }).setScrollFactor(0);
        }

        this.scene.get('DigitalPlanet').events.on('displayPopup', (info) => this.displayPopup(info));
        this.scene.get('DigitalPlanet').events.on('populationUpdate', (pop) => this.populationUpdate(pop));
        this.scene.get('DigitalPlanet').events.on('connectionStatus', (status) => this.setConnected(status));
        this.scene.get('DigitalPlanet').events.on('holdingGun', (status) => this.holdingGun(status));
        this.scene.get('DigitalPlanet').events.on('healthUpdate', (healthNum) => this.healthUpdate(healthNum));
    }

    setConnected(status) {
        if (status) {
            this.connectionIcon.setFrame(0);
        } else {
            this.connectionIcon.setFrame(1);
        }
    }

    healthUpdate(healthNum) {
        this.healthBar.setHealth(healthNum);
    }

    populationUpdate(pop) {
        this.populationText.setText(pop);
    }

    holdingGun(status) {
        this.gunButton.setVisible(status);
    }

    createMenuBar() {
        let menuBarLength = 512;
        for (let i = 0; i < OL.world.width; i+=menuBarLength) {
            let menuBar = this.add.image(i, 0, 'menuBar');
            menuBar.setOrigin(0, 0);
            menuBar.setDepth(11);
        }
    }

    chat() {
        if (this.chatText === OL.CHAT_TEXT) {
            this.openChatBox();
        } else {
            this.sendChat();
        }
    }

    openChatBox() {
        this.chatText = OL.SEND_TEXT;
        this.events.emit('openChat');
        this.chatButton.setText(OL.SEND_TEXT);
        document.getElementById("chat-box").style.display = "block";
        var chatBox = document.getElementById("chat-entry");
        chatBox.focus();
    }

    sendChat() {
        this.chatText = OL.CHAT_TEXT;
        this.events.emit('sendChat');
        document.getElementById("chat-entry").value = "";
        this.chatButton.setText(OL.CHAT_TEXT);
        document.getElementById("chat-box").style.display = "none";
    }

    zoom() {
        if (!this.zoomed) {
            this.zoomIn();
        } else {
            this.zoomOut();
        }
    }

    zoomIn() {
        this.zoomed = true;
        this.events.emit('zoomIn');
    }

    zoomOut() {
        this.zoomed = false;
        this.events.emit('zoomOut');
    }

    displayPopup(info) {
        if (info.text !== this.prevPopupText || info.title !== "info") {
            this.popup.display(info.title, info.text);
            this.prevPopupText = info.text;
        }
    }
}