import { Cameras, GameObjects, Scene, Tilemaps, Types } from 'phaser';
import { Player } from '../models/player';
import { InputManager } from '../helpers/input-manager';

export class Game extends Scene {
  camera: Cameras.Scene2D.Camera;
  cursors: Types.Input.Keyboard.CursorKeys;
  player: Player;
  map: Tilemaps.Tilemap;
  ui: { fps?: GameObjects.Text } = {};
  handles: { fps: number } = { fps: -1 };

  constructor() {
    super('game');
  }

  create() {
    this.map = this.add.tilemap('level-1-1');
    const landscapeTileset = this.map.addTilesetImage('Landscape', 'tiles-landscape')!;
    const groundLayer = this.map.createLayer('Landscape', landscapeTileset)!;

    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    this.matter.set60Hz();
    this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    this.cursors = this.input.keyboard!.createCursorKeys();

    this.player = new Player(this);

    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.camera.setBackgroundColor('#000000');
    this.smoothMoveCameraTowards(this.player);
    InputManager.setup();

    this.input.once('pointerdown', () => {
      this.scene.start('gameover');
    });
    // this.smoothedControls = new SmoothedHorionztalControl(0.001);

    this.ui.fps = this.add.text(16, 16, `FPS: ${this.game.loop.actualFps.toFixed(1)}`, {
      fontSize: '20px',
      padding: { x: 20, y: 10 },
      backgroundColor: '#000000',
      color: '#ffffff',
    });
    this.ui.fps.setScrollFactor(0);

    this.handles.fps = setInterval(() => {
      this.ui.fps!.text = `FPS: ${this.game.loop.actualFps.toFixed(1)}`;
    }, 500) as unknown as number;
  }

  update(_time: number, _delta: number) {
    const sprite = this.player.controller.sprite;
    if (!sprite) {
      return;
    }

    if (sprite.y > this.map.heightInPixels) {
      console.log('dead');
      sprite.destroy();
      // this.player.controller.sprite = null;
      // this.restart();
      return;
    }

    // this.player.update(time, delta, this.cursors);
    this.smoothMoveCameraTowards(this.player, 0.9);
  }

  smoothMoveCameraTowards(target: Player, smoothFactor = 0) {
    this.camera.scrollX =
      smoothFactor * this.camera.scrollX + (1 - smoothFactor) * (target.x - this.camera.width * 0.5);
    this.camera.scrollY =
      smoothFactor * this.camera.scrollY + (1 - smoothFactor) * (target.y - this.camera.height * 0.5);
  }
}
