import { Scene } from 'phaser';
import { PlayerAnimationType } from '../types/types';

export class Player {
  controller: {
    sprite: Phaser.Physics.Matter.Sprite;
    blocked: { left: boolean; right: boolean; bottom: boolean };
    sensors: { left: MatterJS.BodyType; right: MatterJS.BodyType; bottom: MatterJS.BodyType };
    numTouchingSurfaces: { left: number; right: number; bottom: number };
    time: { leftDown: number; rightDown: number };
    lastJumpedAt: number;
    speed: { run: number; jump: number };
  };
  dimensions: { w: number; h: number; sx: number; sy: number };
  animations: Partial<Record<PlayerAnimationType, Phaser.Animations.Animation | false>>;

  get x(): number {
    return this.controller.sprite.x;
  }
  get y(): number {
    return this.controller.sprite.y;
  }

  constructor(public scene: Scene) {
    this.setController();
    this.setPhysics();
    this.setAnimations();
  }

  private setController() {
    const sprite = this.scene.matter.add.sprite(0, 0, 'neko');

    const w = sprite.width;
    const h = sprite.height;
    const sx = w / 2;
    const sy = h / 2;

    this.dimensions = {w, h, sx, sy};

    this.controller = {
      sprite,
      blocked: {
        left: false,
        right: false,
        bottom: false,
      },
      numTouchingSurfaces: {
        left: 0,
        right: 0,
        bottom: 0,
      },
      sensors: {
        left: this.scene.matter.bodies.rectangle(sx - w * 0.45, sy, 5, h * 0.25, { isSensor: true }),
        right: this.scene.matter.bodies.rectangle(sx + w * 0.45, sy, 5, h * 0.25, { isSensor: true }),
        bottom: this.scene.matter.bodies.rectangle(sx, h, sx, 5, { isSensor: true }),
      },
      time: {
        leftDown: 0,
        rightDown: 0,
      },
      lastJumpedAt: 0,
      speed: {
        run: 5,
        jump: 8,
      },
    };
  }
  private setPhysics() {
    const body = this.scene.matter.bodies.rectangle(
      this.dimensions.sx,
      this.dimensions.sy,
      this.dimensions.w * 0.75,
      this.dimensions.h,
      { chamfer: { radius: 10 } },
    );
    const compoundBody = this.scene.matter.body.create({
      parts: [body, this.controller.sensors.bottom, this.controller.sensors.left, this.controller.sensors.right],
      restitution: 0.05,
    });

    this.controller.sprite.setExistingBody(compoundBody).setFixedRotation().setPosition(32, 500);
  }
  private setAnimations() {
    const idle = this.scene.anims.create({
      key: 'idle',
      frames: this.scene.anims.generateFrameNumbers('neko', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    const walk = this.scene.anims.create({
      key: 'walk',
      frames: this.scene.anims.generateFrameNumbers('neko', { start: 13, end: 20 }),
      frameRate: 10,
      repeat: -1,
    });
    this.animations = { idle, walk };
    /*
    player.animations.add('jump', [29, 30], 15, true);
    player.animations.add('die', [1, 2, 31, 34, 32, 33, 32], 7, false);
    player.animations.add('hurt', [2], 5, true);
    player.animations.add('action_combo', [36, 37, 0, 38, 39, 40, 41, 42, 40, 43, 44, 40, 45, 46], 15, false);
    player.animations.add('action_khh', [10, 11, 12, 11, 12, 11, 12, 11, 12, 13, 14, 15, 14, 15, 14, 15], 13, false);
    player.animations.add('getgun', [60, 61, 62, 63], 12, false);
    player.animations.add('idle_gun', [65, 66, 67, 68, 69, 70, 71, 72], 10, true);
    player.animations.add('walk_gun', [83, 84, 85, 86, 87, 88, 89, 90], 10, true);
    player.animations.add('jump_gun', [112, 113], 10, true); */
  }
}
