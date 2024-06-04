import { Cameras, Display, GameObjects, Scene, Tilemaps, Tweens } from 'phaser';
import { Player } from '../models/player';
import { InputManager } from '../helpers/input-manager';
import { choose, clamp, rand } from '../utils';
import { Chomper } from '../models/chomper';
import { Fireball } from '../models/fireball';
import { Belch } from '../models/belch';
import { DemonFlower } from '../models/demon-flower';
import { FlyFly } from '../models/flyfly';
import { Skeleton } from '../models/skeleton';

export class Game extends Scene {
  camera: Cameras.Scene2D.Camera;
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
  raycasterPlugin: PhaserRaycaster;
  raycaster: Raycaster;
  ambientTweens: { on: Tweens.Tween; off: Tweens.Tween };
  cameraTweens: { on: Tweens.Tween; off: Tweens.Tween };
  lightState = true;

  constructor() {
    super('game');
  }

  create() {
    this.input.once('pointerdown', () => {
      this.scene.start('gameover');
    });

    this.raycaster = this.raycasterPlugin.createRaycaster({ debug: true });
    this.setMap();
    this.setPhysics();
    this.player = new Player(this);
    this.setCamera();
    InputManager.setup();
    this.setUI();
    this.setClouds();
    this.setParallaxBackground();
    this.createMonsters();
    this.lights.enable().setAmbientColor(0xffffff);
    this.setTweens();
  }

  private setPhysics() {
    this.matter.set60Hz();
    this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
  }
  private setCamera() {
    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.camera.setBackgroundColor(0xcee6cf);
    this.smoothMoveCameraTowards(this.player);
  }
  private setMap() {
    this.map = this.add.tilemap('level-1-1');
    const landscapeTileset = this.map.addTilesetImage('Landscape', 'tiles-landscape')!;
    const groundLayer = this.map.createLayer('Landscape', landscapeTileset)!.setPipeline('Light2D');

    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);
  }
  private setUI() {
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
  private setParallaxBackground() {
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
    this.background.layer0.setOrigin(0, 0).setDepth(-10).setPipeline('Light2D');
    this.background.layer1.setOrigin(0, 0).setDepth(-10).setPipeline('Light2D');
  }
  private setClouds() {
    let choices = ['cloud1', 'cloud2', 'cloud3'];
    for (let i = 0; i < 50; i += 1) {
      const gameObject = this.add.image(rand(0, this.map.widthInPixels), rand(0, 450), choose(choices));
      gameObject.setDepth(-5).setPipeline('Light2D');
      this.clouds.push({
        gameObject,
        direction: choose([-1, 1]),
        speed: rand(0.5, 1),
      });
    }
  }
  private createMonsters() {
    new Chomper(this, { x: 900, y: this.map.heightInPixels - 120 });
    new DemonFlower(this, { x: 784, y: this.map.heightInPixels - 144 });
    new FlyFly(this, { x: 600, y: this.map.heightInPixels - 200 });
    new Skeleton(this, { x: 320, y: this.map.heightInPixels - 400 });
  }
  private setTweens() {
    this.ambientTweens = {
      on: this.tweens.addCounter({
        from: 16,
        to: 255,
        duration: 1000,
        paused: true,
        onUpdate: (tween) => {
          const value = Math.floor(tween.getValue());
          this.lights.setAmbientColor(Phaser.Display.Color.GetColor(value, value, value));
        },
      }),
      off: this.tweens.addCounter({
        from: 255,
        to: 16,
        duration: 1000,
        paused: true,
        onUpdate: (tween) => {
          const value = Math.floor(tween.getValue());
          this.lights.setAmbientColor(Phaser.Display.Color.GetColor(value, value, value));
        },
      }),
    };

    this.cameraTweens = {
      on: this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1000,
        paused: true,
        onUpdate: (tween) => {
          this.camera.setBackgroundColor(
            Display.Color.Interpolate.ColorWithColor(
              Display.Color.IntegerToColor(0x111111),
              Display.Color.IntegerToColor(0xcee6cf),
              100,
              Math.floor(tween.getValue()),
            ),
          );
        },
      }),
      off: this.tweens.addCounter({
        from: 0,
        to: 100,
        duration: 1000,
        paused: true,
        onUpdate: (tween) => {
          this.camera.setBackgroundColor(
            Display.Color.Interpolate.ColorWithColor(
              Display.Color.IntegerToColor(0xcee6cf),
              Display.Color.IntegerToColor(0x111111),
              100,
              Math.floor(tween.getValue()),
            ),
          );
        },
      }),
    };
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

  lightsOn() {
    this.ambientTweens.on.play();
    this.cameraTweens.on.play();
    this.player.torch.off();
    Object.values(this.objects.fireballs).forEach((fireball) => fireball?.light.off());
    Object.values(this.objects.belches).forEach((belch) => belch?.light.off());
    this.lightState = true;
  }
  lightsOff() {
    this.ambientTweens.off.play();
    this.cameraTweens.off.play();
    this.player.torch.on();
    Object.values(this.objects.fireballs).forEach((fireball) => fireball?.light.on());
    Object.values(this.objects.belches).forEach((belch) => belch?.light.on());
    this.lightState = false;
  }
}
