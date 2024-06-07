import { Scene } from 'phaser';
import { InputManager } from '../helpers/input-manager';

export class Boot extends Scene {
  constructor() {
    super('boot');
  }

  preload() {}

  create() {
    this.scene.start('preloader');
    InputManager.sceneChange(false);
  }
}
