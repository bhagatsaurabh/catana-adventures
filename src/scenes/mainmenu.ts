import { Scene, GameObjects } from 'phaser';
import { InputManager } from '../helpers/input-manager';

export class MainMenu extends Scene {
  title: GameObjects.Text;

  constructor() {
    super('mainmenu');
  }

  create() {
    this.title = this.add
      .text(512, 400, 'Press to Start', {
        fontFamily: 'Arial Black',
        fontSize: 38,
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
      this.scene.start('game');
    });
    this.input.keyboard?.once('keydown', () => {
      if (isStarted) return;
      isStarted = true;
      this.scene.start('game');
    });
  }
}
