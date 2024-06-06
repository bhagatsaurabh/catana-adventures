import { Scene } from 'phaser';
import { InputManager } from '../helpers/input-manager';

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
    this.load.json('monsters-1-1', 'maps/monsters-1-1.json');
    this.load.json('coins-1-1', 'maps/coins-1-1.json');
    this.load.spritesheet('coins', 'spritesheets/coins.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('neko', 'spritesheets/neko.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('fireball', 'spritesheets/fireball.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('belch', 'spritesheets/belch.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('chomper', 'spritesheets/chomper.png', { frameWidth: 40, frameHeight: 40 });
    this.load.spritesheet('flyfly', 'spritesheets/flyfly.png', { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet('demon-flower', 'spritesheets/demon-flower.png', { frameWidth: 50, frameHeight: 50 });
    this.load.spritesheet('skeleton', 'spritesheets/skeleton.png', { frameWidth: 64, frameHeight: 64 });
    this.load.image('cloud1', 'sprites/cloud1.png');
    this.load.image('cloud2', 'sprites/cloud2.png');
    this.load.image('cloud3', 'sprites/cloud3.png');
    this.load.image('bg-forest-1', 'sprites/bg-forest-1.png');
    this.load.image('bg-forest-2', 'sprites/bg-forest-2.png');
  }

  create() {
    //  When all the assets have loaded, it's often worth creating global objects here that the rest of the game can use.
    //  For example, you can define global animations here, so we can use them in other scenes.

    //  Move to the MainMenu. You could also swap this for a Scene Transition, such as a camera fade.
    InputManager.sceneChange(false);

    this.scene.start('mainmenu');
  }
}
