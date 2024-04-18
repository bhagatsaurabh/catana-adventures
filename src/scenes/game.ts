import { Cameras, GameObjects, Scene, Tilemaps, Types } from 'phaser';
import { Player } from '../models/player';
import { InputManager } from '../helpers/input-manager';
import { choose, clamp, rand } from '../utils';
import { Chomper } from '../models/chomper';
import { Fireball } from '../models/fireball';
import { Belch } from '../models/belch';
import { DemonFlower } from '../models/demon-flower';

export class Game extends Scene {
  camera: Cameras.Scene2D.Camera;
  cursors: Types.Input.Keyboard.CursorKeys;
  player: Player;
  map: Tilemaps.Tilemap;
  ui: { fps?: GameObjects.Text } = {};
  handles: { fps: number } = { fps: -1 };
  clouds: { gameObject: GameObjects.Image; direction: -1 | 1; speed: number }[] = [];
  background: { layer0: GameObjects.TileSprite; layer1: GameObjects.TileSprite };
  objects: { fireballs: Partial<Record<string, Fireball>>; belches: Partial<Record<string, Belch>> } = {
    fireballs: {},
    belches: {},
  };

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
    this.camera.setBackgroundColor('#CEE6CF');
    this.smoothMoveCameraTowards(this.player);

    InputManager.setup();

    this.input.once('pointerdown', () => {
      this.scene.start('gameover');
    });

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

    let choices = ['cloud1', 'cloud2', 'cloud3'];
    for (let i = 0; i < 50; i += 1) {
      const gameObject = this.add.image(rand(0, this.map.widthInPixels), rand(0, 450), choose(choices));
      gameObject.setDepth(-5);
      this.clouds.push({
        gameObject,
        direction: choose([-1, 1]),
        speed: rand(0.5, 1),
      });
    }

    const bgSource1 = this.textures.get('bg-forest-1').getSourceImage();
    const bgSource2 = this.textures.get('bg-forest-2').getSourceImage();
    this.background = {
      layer0: this.add.tileSprite(
        0,
        this.map.heightInPixels - bgSource1.height,
        this.scale.displaySize.width * 1.5,
        bgSource1.height,
        'bg-forest-1',
      ),
      layer1: this.add.tileSprite(
        0,
        this.map.heightInPixels - bgSource2.height,
        this.scale.displaySize.width * 1.5,
        bgSource2.height,
        'bg-forest-2',
      ),
    };
    this.background.layer0.setOrigin(0, 0).setDepth(-10);
    this.background.layer1.setOrigin(0, 0).setDepth(-10);

    this.createChompers();
    this.createDemonFlowers();
  }

  private createChompers() {
    new Chomper(this, { x: 900, y: this.map.heightInPixels - 120 });
  }
  private createDemonFlowers() {
    new DemonFlower(this, { x: 320, y: this.map.heightInPixels - 96 - 16 });
  }

  update(_time: number, _delta: number) {
    const sprite = this.player.controller.sprite;
    if (!sprite) {
      return;
    }

    const prev = this.camera.scrollX;

    this.smoothMoveCameraTowards(this.player, 0.9);
    this.background.layer0.tilePositionX += (prev - this.camera.scrollX) * 0.3 * -1;
    this.background.layer1.tilePositionX += (prev - this.camera.scrollX) * 0.4 * -1;

    this.clouds.forEach((cloud) => {
      if (cloud.gameObject.x < 0) {
        cloud.gameObject.x = this.map.widthInPixels;
      }
      if (cloud.gameObject.x > this.map.widthInPixels) {
        cloud.gameObject.x = 0;
      }
      cloud.gameObject.x += cloud.speed * cloud.direction;
    });

    this.background.layer0.x = clamp(this.camera.scrollX, 0, Infinity);
    this.background.layer1.x = clamp(this.camera.scrollX, 0, Infinity);
  }

  smoothMoveCameraTowards(target: Player, smoothFactor = 0) {
    this.camera.scrollX = clamp(
      smoothFactor * this.camera.scrollX + (1 - smoothFactor) * (target.x - this.camera.width * 0.5),
      0,
      this.map.widthInPixels - this.game.canvas.width,
    );
    this.camera.scrollY =
      smoothFactor * this.camera.scrollY + (1 - smoothFactor) * (target.y - this.camera.height * 0.5);
  }
}
