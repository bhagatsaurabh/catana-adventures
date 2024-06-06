import { Scene } from 'phaser';
import { InputManager } from '../helpers/input-manager';

export class Boot extends Scene {
  constructor() {
    super('boot');
  }

  preload() {
    // this.load.image('background', 'assets/bg.png');
  }

  create() {
    this.scene.start('preloader');
    InputManager.sceneChange(false);
  }
}
