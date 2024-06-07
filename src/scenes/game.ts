import { Cameras, Display, GameObjects, Scene, Tilemaps, Tweens, Types } from 'phaser';
import { Player } from '../models/player';
import { InputManager } from '../helpers/input-manager';
import { choose, clamp, rand } from '../utils';
import { Chomper } from '../models/chomper';
import { Fireball } from '../models/fireball';
import { Belch } from '../models/belch';
import { DemonFlower } from '../models/demon-flower';
import { Skeleton } from '../models/skeleton';
import { FlyFly } from '../models/flyfly';
import { Coin } from '../models/coin';
import { ScoreKeeper } from '../helpers/score-keeper';

export class Game extends Scene {
  camera: Cameras.Scene2D.Camera;
  player: Player;
  map: Tilemaps.Tilemap;
  ui: { fps?: GameObjects.Text; score?: GameObjects.Text } = {};
  handles: { fps: number } = { fps: -1 };
  clouds: { gameObject: GameObjects.Image; direction: -1 | 1; speed: number }[] = [];
  background: { layer0: GameObjects.TileSprite; layer1: GameObjects.TileSprite };
  objects: {
    fireballs: Partial<Record<string, Fireball>>;
    belches: Partial<Record<string, Belch>>;
    skulls: Partial<Record<string, Skeleton>>;
  } = {
    fireballs: {},
    belches: {},
    skulls: {},
  };
  raycasterPlugin: PhaserRaycaster;
  raycaster: Raycaster;
  ambientTweens: { on: Tweens.Tween; off: Tweens.Tween };
  cameraTweens: { on: Tweens.Tween; off: Tweens.Tween };
  lightState = true;
  scoreKeeper: ScoreKeeper;
  flags: { isExiting: boolean; isOver: boolean } = { isExiting: false, isOver: false };

  constructor() {
    super('game');
  }

  create() {
    /* this.input.on('pointerdown', (pointer: Input.Pointer) => {
      console.log(pointer.worldX, pointer.worldY);
    }); */

    this.raycaster = this.raycasterPlugin.createRaycaster({ debug: false });
    this.setMap();
    this.setPhysics();
    this.player = new Player(this, { x: 32, y: 800 });
    // this.player = new Player(this, { x: 9300, y: 600 });
    this.setCamera();
    InputManager.setup();
    this.setClouds();
    this.setParallaxBackground();
    this.createMonsters();
    this.createCoins();
    this.lights.enable().setAmbientColor(0xffffff);
    this.setTweens();
    this.createExitSensors();
    this.scoreKeeper = new ScoreKeeper();
    this.setUI();

    InputManager.sceneChange(true);
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

    this.ui.score = this.add.text(816, 16, `Score: ${this.scoreKeeper.score.toString().padStart(6, ' ')}`, {
      fontSize: '20px',
      padding: { x: 20, y: 10 },
      backgroundColor: '#000000',
      color: '#ffffff',
    });
    this.ui.score.setScrollFactor(0);
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
    const monsters = this.cache.json.get('monsters-1-1');
    monsters.chompers.forEach((chomper: Types.Math.Vector2Like) => new Chomper(this, { x: chomper.x, y: chomper.y }));
    monsters.flowers.forEach((dmnflr: Types.Math.Vector2Like) => new DemonFlower(this, { x: dmnflr.x, y: dmnflr.y }));
    monsters.skeletons.forEach((skltn: Types.Math.Vector2Like) => new Skeleton(this, { x: skltn.x, y: skltn.y }));
    monsters.flyflys.forEach((flyfly: Types.Math.Vector2Like) => new FlyFly(this, { x: flyfly.x, y: flyfly.y }));
  }
  private createCoins() {
    const coins = this.cache.json.get('coins-1-1');
    coins.forEach(
      (coin: { x: number; y: number; type: 'gold' | 'silver' | 'bronze' }) =>
        new Coin(this, { x: coin.x, y: coin.y }, coin.type),
    );
  }
  private setTweens() {
    this.ambientTweens = {
      on: this.tweens.addCounter({
        from: 16,
        to: 255,
        duration: 1000,
        paused: true,
        persist: true,
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
        persist: true,
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
        persist: true,
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
        persist: true,
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
  private createExitSensors() {
    const exitSensor = this.matter.add.rectangle(9472, 332, 5, 636, { isStatic: true, isSensor: true });
    exitSensor.onCollideCallback = (pair: Types.Physics.Matter.MatterCollisionPair) => {
      if (
        !this.flags.isExiting &&
        ((pair.bodyA === exitSensor && pair.bodyB.gameObject?.name === 'neko') ||
          (pair.bodyB === exitSensor && pair.bodyA.gameObject?.name === 'neko'))
      ) {
        this.flags.isExiting = true;
        this.player.exit();
      }
    };

    const overSensor = this.matter.add.rectangle(9588, 332, 5, 636, { isStatic: true, isSensor: true });
    overSensor.onCollideCallback = (pair: Types.Physics.Matter.MatterCollisionPair) => {
      if (
        this.flags.isExiting &&
        ((pair.bodyA === overSensor && pair.bodyB.gameObject?.name === 'neko') ||
          (pair.bodyB === overSensor && pair.bodyA.gameObject?.name === 'neko'))
      ) {
        this.flags.isExiting = false;
        this.over(pair.timeUpdated);
      }
    };
  }
  update(_time: number, _delta: number) {
    if (this.flags.isExiting) {
      this.player.controller.sprite.setVelocityX(this.player.config.maxRunSpeed);
    }

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

    this.ui.score!.text = `Score: ${this.scoreKeeper.score.toString().padStart(6, ' ')}`;
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
    if (this.lightState || Object.values(this.objects.skulls).length) return;

    this.ambientTweens.on.play();
    this.cameraTweens.on.play();
    this.player.torch.off();
    Object.values(this.objects.fireballs).forEach((fireball) => fireball?.light.off());
    Object.values(this.objects.belches).forEach((belch) => belch?.light.off());
    this.lightState = true;
  }
  lightsOff() {
    if (!this.lightState) return;

    this.ambientTweens.off.play();
    this.cameraTweens.off.play();
    this.player.torch.on();
    Object.values(this.objects.fireballs).forEach((fireball) => fireball?.light.on());
    Object.values(this.objects.belches).forEach((belch) => belch?.light.on());
    this.lightState = false;
  }

  over(time: number, completed = true) {
    completed && this.scoreKeeper.levelCompleted(time);
    clearInterval(this.handles.fps);
    this.flags.isOver = true;
    this.scene.start('gameover');
  }
}
