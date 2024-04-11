import { Scene } from 'phaser';

export class Preloader extends Scene {
  constructor() {
    super('preloader');
  }

  init() {
    //  We loaded this image in our Boot Scene, so we can display it here
    // this.add.image(512, 384, 'background');

    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);
    const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);
    this.load.on('progress', (progress: number) => (bar.width = 4 + 460 * progress));
  }

  preload() {
    this.load.setPath('assets');

    this.load.tilemapTiledJSON('level-1-1', 'maps/level-1-1.json');
    this.load.image('tiles-landscape', 'spritesheets/tiles-landscape.png');
    this.load.spritesheet('neko', 'spritesheets/neko_final.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    this.scene.start('mainmenu');
  }
}
