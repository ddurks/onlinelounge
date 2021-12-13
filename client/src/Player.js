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
        let drag = 700;
        //player.setDrag(drag);
        //player.body.setAllowDrag(true);
        this.setBody({
            type: 'rectangle',
            width: 20,
            height: 30
        });
        this.setFrictionAir(0.2);
        this.keysPressed = [0, 0, 0, 0];
        this.setIgnoreGravity(true);

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
        })

        this.alive = true;

        this.username = username;
        this.speed = OL.WALKING_SPEED;
        this.size = 32;
        this.msg = "";
        this.msg_duration = 0;
        this.typing = false;

        this.usernameText = this.generateUsernameText(scene, this);
        this.speakText = this.generateSpeakText(scene, this);
        this.typingIcon = this.generateTypingIcon(scene, this);

        return this;
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
        if (this.body.velocity.x > 0) {
            this.anims.play('right', true);
        } else if ( this.body.velocity.x < 0) {
            this.anims.play('left', true);
        } else if ( this.body.velocity.y > 0) {
            this.anims.play('down', true);
        } else if ( this.body.velocity.y < 0) {
            this.anims.play('up', true);
        } else {
            this.anims.pause();
        }
        console.log(this.body.velocity.x);
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
        this.speakText.x = this.x;
        this.speakText.y = this.y - 3*this.size/2;

        this.typingIcon.x = this.x + this.size /2;
        this.typingIcon.y = this.y - this.size;

        this.usernameText.x = this.x;
        this.usernameText.y = this.y + this.size/2;
    }

    startTyping() {
        this.typingIcon.setActive(true).setVisible(true);
        this.typing = true;
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
    }
}