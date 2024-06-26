import { Scene, GameObjects } from 'phaser';
import { InputManager } from '../helpers/input-manager';
import { fullscreen } from '../helpers/fullscreen';

export class MainMenu extends Scene {
  title: GameObjects.Text;

  constructor() {
    super('mainmenu');
  }

  create() {
    this.title = this.add
      .text(320, 250, 'Press to Start', {
        fontFamily: 'Arial Black',
        fontSize: 23,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5);

    InputManager.sceneChange(false);

    let isStarted = false;
    this.input.once('pointerdown', async () => {
      if (isStarted) return;
      isStarted = true;
      this.scene.start('game');
      await fullscreen();
    });
    this.input.keyboard?.once('keydown', () => {
      if (isStarted) return;
      isStarted = true;
      this.scene.start('game');
    });
  }
}
