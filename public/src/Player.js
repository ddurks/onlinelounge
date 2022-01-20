import { OL } from './utils';

export const Key = {
    'w':0,
    'a':1,
    's':2,
    'd':3
}

export class Player extends Phaser.Physics.Matter.Sprite {
    constructor(scene, x, y, texture, username) {
        super(scene.matter.world, x, y, texture);

        scene.add.existing(this);
        this.bodyWidth = 20;
        this.bodyHeight = 30;
        this.setBody({
            type: 'rectangle',
            width: this.bodyWidth,
            height: this.bodyHeight
        });
        this.setFrictionAir(0.2);
        this.keysPressed = [0, 0, 0, 0];
        this.setFixedRotation();
        this.setMass(1);
        this.setOrigin(0.5, 0.5);

        this.anims.create({
            key: 'down', 
            frameRate: OL.WALKING_FRAMERATE,
            frames: this.anims.generateFrameNumbers(texture, { frames: [0, 1, 0, 2] }),
            repeat: -1
        });
        this.anims.create({
            key: 'left', 
            frameRate: OL.WALKING_FRAMERATE,
            frames: this.anims.generateFrameNumbers(texture, { frames: [9, 10, 9, 11] }),
            repeat: -1
        });
        this.anims.create({
            key: 'right', 
            frameRate: OL.WALKING_FRAMERATE,
            frames: this.anims.generateFrameNumbers(texture, { frames: [3, 4, 3, 5] }),
            repeat: -1
        });
        this.anims.create({
            key: 'up', 
            frameRate: OL.WALKING_FRAMERATE,
            frames: this.anims.generateFrameNumbers(texture, { frames: [6, 7, 6, 8] }),
            repeat: -1
        });
        this.anims.create({
            key: 'icon',
            frameRate: 0,
            frames: this.anims.generateFrameNumbers(texture, { frames: [12] }),
            repeat: 0
        });

        this.alive = true;

        this.fit = texture;
        this.username = username;
        this.size = 32;
        this.msg = "";
        this.msg_duration = 0;
        this.typing = false;
        this.direction = Key.s;

        this.usernameText = this.generateUsernameText(scene, this);
        this.speakText = this.generateSpeakText(scene, this);
        this.typingIcon = this.generateTypingIcon(scene, this);

        this.generateItems(scene, this);

        return this;
    }

    generateItems(scene, player) {
        this.gun = scene.add.sprite(player.x - 12, player.y + 8, 'gun', 0).setVisible(false);
    }

    generateSpeakText(scene, player) {
        var speakText = scene.add.text(player.x,player.y-player.size, "", {
            fontFamily: 'Arial',
            fontSize: '16px',
            wordWrap: {
                width: 400,
                useAdvancedWrap: true
            },
            align: 'center'
        });
        speakText.setStroke('#000000', 3);
        speakText.setOrigin(0.5, 0);
        return speakText;
    }

    generateTypingIcon(scene, player) {
        var typingIcon = scene.add.sprite(player.x + player.size / 2, player.y - player.size, 'typingIcon');

        typingIcon.anims.create({
            key: 'typing', 
            frameRate: 3,
            frames: typingIcon.anims.generateFrameNumbers('typingIcon', { frames: [0, 1, 2, 3] }),
            repeat: -1
        });

        typingIcon.anims.play('typing');
        typingIcon.setActive(false).setVisible(false);

        return typingIcon;
    }

    generateUsernameText(scene, player) {
        var usernameText = scene.add.text(player.x + 2,player.y, player.username, {
            fontFamily: 'gaming1',
            color:  '#ffffff' ,
            fontSize: '32px',
            shadow: {
                offsetX: -2,
                offsetY: 2,
                color: '#000',
                blur: 0,
                stroke: true,
                fill: true,
            },
        });
        usernameText.setOrigin(0.5, 0);
        usernameText.setAlign('center');
        return usernameText;
    }

    animForPlayerFromVelocity() {
        console.log(this.frame);
        if (this.body.velocity.x > 0) {
            this.anims.play('right', true);
            this.direction = Key.d;
        } else if ( this.body.velocity.x < 0) {
            this.anims.play('left', true);
            this.direction = Key.a;
        } else if ( this.body.velocity.y > 0) {
            this.anims.play('down', true);
            this.direction = Key.s;
        } else if ( this.body.velocity.y < 0) {
            this.anims.play('up', true);
            this.direction = Key.w;
        } else {
            this.anims.pause();
        }
    }

    updateFromData(playerData) {
        this.setVelocityX(playerData.velocity.x);
        this.setVelocityY(playerData.velocity.y);
        this.x = playerData.position.x;
        this.y = playerData.position.y;
        this.animForPlayerFromVelocity();
        if (playerData.typing) {
            this.typingIcon.setActive(true).setVisible(true);
        } else {
            if (this.typingIcon.active) {
                this.typingIcon.setActive(false).setVisible(false);
            }
            this.speakText.setText(playerData.msg);
        }

        this.updatePlayerStuff();
    }

    updatePlayerStuff() {
        if (this.body) {
            this.speakText.x = this.x;
            this.speakText.y = this.y - 3*this.size/2;

            this.typingIcon.x = this.x + this.size /2;
            this.typingIcon.y = this.y - this.size;

            this.usernameText.x = this.x;
            this.usernameText.y = this.y + this.size/2;

            if (this.gun.visible) {
                if (this.direction === Key.s) {
                    this.gun.x = this.x - 12;
                    this.gun.y = this.y + 8;
                    this.gun.setFrame(0);
                } else if (this.direction === Key.d) {
                    this.gun.x = this.x + 14;
                    this.gun.y = this.y + 8;
                    this.gun.setFrame(1);
                } else if (this.direction === Key.w) {
                    this.gun.x = this.x - 12;
                    this.gun.y = this.y + 8;
                    this.gun.setFrame(2);
                } else if (this.direction === Key.a) {
                    this.gun.x = this.x - 14;
                    this.gun.y = this.y + 8;
                    this.gun.setFrame(3);
                }
            }
        }
    }

    startTyping() {
        this.typingIcon.setActive(true).setVisible(true);
        this.typing = true;
    }

    setHoldGun(isHolding) {
        this.gun.setVisible(isHolding);
    }

    setMsg(text) {
        this.msg = text;
        this.msg_duration = 0;
        this.speakText.setText(this.msg);
        this.typingIcon.setActive(false).setVisible(false);
        this.typing = false;
    }

    msgDecayHandler(delta) {
        if (this.msg !== "") {
            if (this.msg_duration > OL.MSG_MAXTIME) {
                this.msg = "";
                this.speakText.setText(this.msg);
                this.msg_duration = 0;
            } else {
                this.msg_duration += delta;
            }
        }
    }

    destroyStuff() {
        this.speakText.destroy();
        this.usernameText.destroy();
        this.typingIcon.destroy();
        this.gun.destroy();
    }
}