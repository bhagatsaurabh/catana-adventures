import { Scene } from 'phaser';
import { InputManager } from '../helpers/input-manager';

export class GameOver extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  // background: Phaser.GameObjects.Image;
  gameover_text: Phaser.GameObjects.Text;

  constructor() {
    super('gameover');
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor('#000000');

    // this.background = this.add.image(512, 384, "background");
    // this.background.setAlpha(0.5);

    this.gameover_text = this.add.text(512, 384, 'Game Over', {
      fontFamily: 'Arial Black',
      fontSize: 64,
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8,
      align: 'center',
    });
    this.gameover_text.setOrigin(0.5);
    this.add
      .text(512, 475, 'Press to Continue', {
        fontFamily: 'Arial Black',
        fontSize: 20,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8,
        align: 'center',
      })
      .setOrigin(0.5);

    InputManager.sceneChange(false);

    let isStarted = false;
    this.input.once('pointerdown', () => {
      if (isStarted) return;
      isStarted = true;
      this.scene.start('mainmenu');
    });
    this.input.keyboard?.once('keydown', () => {
      if (isStarted) return;
      isStarted = true;
      this.scene.start('mainmenu');
    });
  }
}
