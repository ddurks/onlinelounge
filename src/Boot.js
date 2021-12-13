import { OL } from './utils';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }
    preload() {
        this.load.image('logo', 'assets/online_lounge_login.png');
    }
    create() {
        OL.world = {
            width: this.cameras.main.width,
            height: this.cameras.main.height,
            centerX: this.cameras.main.centerX,
            centerY: this.cameras.main.centerY
        };
        this.scene.start('Preloader');
    }
}