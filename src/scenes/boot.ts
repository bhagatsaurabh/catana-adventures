import { Scene } from 'phaser';

export class Boot extends Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // this.load.image('background', 'assets/bg.png');
  }

  create() {
    this.scene.start('preloader');
  }
}
