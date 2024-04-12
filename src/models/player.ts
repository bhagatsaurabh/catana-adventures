import { Types } from 'phaser';
import { PlayerAnimationType, PlayerInput, PlayerInputs } from '../types/types';
import { Game } from '../scenes/game';
import { clamp } from '../utils';
import { InputManager } from '../helpers/input-manager';
import { PlayerConfig } from '../types/interfaces';

export class Player {
  controller: {
    sprite: Phaser.Physics.Matter.Sprite;
    blocked: { left: boolean; right: boolean; bottom: boolean };
    sensors: { left: MatterJS.BodyType; right: MatterJS.BodyType; bottom: MatterJS.BodyType };
    numTouchingSurfaces: { left: number; right: number; bottom: number };
    lastJumpedAt: number;
  };
  config: PlayerConfig = { maxRunSpeed: 5, speedModifier: 10, dragModifier: 4, jumpSpeed: 8 };
  dimensions: { w: number; h: number; sx: number; sy: number };
  animations: Partial<Record<PlayerAnimationType, Phaser.Animations.Animation | false>>;
  speed: number = 0;

  get x(): number {
    return this.controller.sprite.x;
  }
  get y(): number {
    return this.controller.sprite.y;
  }

  constructor(public game: Game) {
    this.setController();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();

    this.controller.sprite.play('idle', true);
  }

  private setController() {
    const sprite = this.game.matter.add.sprite(0, 0, 'neko');

    const w = sprite.width;
    const h = sprite.height;
    const sx = w / 2;
    const sy = h / 2;

    this.dimensions = { w, h, sx, sy };

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
        left: this.game.matter.bodies.rectangle(sx - w * 0.45, sy, 5, h * 0.25, { isSensor: true }),
        right: this.game.matter.bodies.rectangle(sx + w * 0.45, sy, 5, h * 0.25, { isSensor: true }),
        bottom: this.game.matter.bodies.rectangle(sx, h, sx, 5, { isSensor: true }),
      },
      lastJumpedAt: 0,
    };
  }
  private setPhysics() {
    const body = this.game.matter.bodies.rectangle(
      this.dimensions.sx,
      this.dimensions.sy,
      this.dimensions.w * 0.75,
      this.dimensions.h,
      { chamfer: { radius: 10 } },
    );
    const compoundBody = this.game.matter.body.create({
      parts: [body, this.controller.sensors.bottom, this.controller.sensors.left, this.controller.sensors.right],
      restitution: 0.05,
    });

    this.controller.sprite.setExistingBody(compoundBody).setFixedRotation().setPosition(32, 800);
  }
  private setAnimations() {
    const idle = this.game.anims.create({
      key: 'idle',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    const walk = this.game.anims.create({
      key: 'walk',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 13, end: 20 }),
      frameRate: 10,
      repeat: -1,
    });
    const jump = this.game.anims.create({
      key: 'jump',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 26, end: 33 }),
      frameRate: 10,
      repeat: 0,
    });
    const dead = this.game.anims.create({
      key: 'dead',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 39, end: 45 }),
      frameRate: 10,
      repeat: 0,
    });
    const powerAttack = this.game.anims.create({
      key: 'power-attack',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 52, end: 58 }),
      frameRate: 10,
      repeat: -1,
    });
    const fastAttack = this.game.anims.create({
      key: 'fast-attack',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 65, end: 70 }),
      frameRate: 10,
      repeat: -1,
    });
    const comboAttack = this.game.anims.create({
      key: 'combo-attack',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 78, end: 87 }),
      frameRate: 10,
      repeat: -1,
    });
    const comboKick = this.game.anims.create({
      key: 'combo-kick',
      frames: this.game.anims.generateFrameNumbers('neko', { start: 91, end: 102 }),
      frameRate: 24,
      repeat: -1,
    });

    this.animations = {
      idle,
      walk,
      jump,
      dead,
      'power-attack': powerAttack,
      'fast-attack': fastAttack,
      'combo-attack': comboAttack,
      'combo-kick': comboKick,
    };
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
  private setHandlers() {
    this.game.matter.world.on('beforeupdate', (event: { delta: number; timestamp: number }) =>
      this.beforeUpdate(event.delta, event.timestamp),
    );
    this.game.matter.world.on('collisionactive', (event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) =>
      this.collisionActive(event),
    );
    this.game.matter.world.on('afterupdate', () => this.afterUpdate());
  }

  applyInputs(delta: number, time: number, input: PlayerInputs) {
    if (input[PlayerInput.LEFT] || input[PlayerInput.RIGHT]) {
      this.walk(delta, time, input[PlayerInput.LEFT]);
    } else {
      this.stop(delta, time);
    }
    if (input[PlayerInput.JUMP]) {
      this.jump(delta, time);
    }
    if (input[PlayerInput.CROUCH]) {
      // this.duck(delta, time);
    }
    if (input[PlayerInput.POWER_ATTACK]) {
      // this.powerAttack(delta, time);
    }
    if (input[PlayerInput.FAST_ATTACK]) {
      // this.fastAttack(delta, time);
    }
    if (input[PlayerInput.COMBO_ATTACK]) {
      // this.comboAttack(delta, time);
    }
    if (input[PlayerInput.COMBO_KICK]) {
      // this.comboKick(delta, time);
    }

    // this.playSounds();
  }

  private walk(delta: number, _time: number, isLeft = false) {
    this.controller.sprite.anims.play('walk', true);
    this.controller.sprite.setFlipX(isLeft);

    if (isLeft) {
      this.speed = clamp(
        this.speed - delta * this.config.speedModifier,
        -this.config.maxRunSpeed,
        this.config.maxRunSpeed,
      );
    } else {
      this.speed = clamp(
        this.speed + delta * this.config.speedModifier,
        -this.config.maxRunSpeed,
        this.config.maxRunSpeed,
      );
    }

    this.controller.sprite.setVelocityX(this.speed);
  }
  private jump(_delta: number, time: number) {
    if (time - this.controller.lastJumpedAt > 250 && this.controller.blocked.bottom) {
      this.controller.lastJumpedAt = time;
      this.controller.sprite.setVelocityY(-this.config.jumpSpeed);
    }
  }
  private stop(delta: number, _time: number) {
    if (Math.abs(this.speed) < 0.1) {
      this.speed = 0;
      this.controller.sprite.anims.play('idle', true);
    } else {
      this.speed = clamp(
        this.speed + Math.sign(this.speed) * -1 * delta * this.config.dragModifier,
        -this.config.maxRunSpeed,
        this.config.maxRunSpeed,
      );
    }

    this.controller.sprite.setVelocityX(this.speed);
  }

  private beforeUpdate(delta: number, time: number) {
    this.applyInputs(delta, time, InputManager.input);

    if (this.game.cursors.left.isDown) {
      /* const newSpeed = clamp(
        this.controller.sprite.body!.velocity.x - delta * 0.1,
        -this.controller.speed.run,
        this.controller.speed.run,
      ); */
      // this.controller.sprite.setVelocityX(
      //   newSpeed,
      //   /* Phaser.Math.Linear(this.controller.sprite.body!.velocity.x, newSpeed, this.controlT), */
      // );
    } else if (this.game.cursors.right.isDown) {
      /* this.controller.sprite.anims.play('walk', true);
      this.controller.sprite.setFlipX(false); */
      // this.controlT = clamp(this.controlT + delta * 0.001, -1, 1);
      /* const newSpeed = clamp(
        this.controller.sprite.body!.velocity.x + delta * 0.1,
        -this.controller.speed.run,
        this.controller.speed.run,
      ); */
      // this.controller.sprite.setVelocityX(
      //   newSpeed,
      //   /* Phaser.Math.Linear(this.controller.sprite.body!.velocity.x, this.controller.speed.run, this.controlT), */
      // );
    } else {
      /* this.controlT = 0;
      this.controller.sprite.anims.play('idle', true); */
    }

    this.controller.numTouchingSurfaces.left = 0;
    this.controller.numTouchingSurfaces.right = 0;
    this.controller.numTouchingSurfaces.bottom = 0;
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    const playerBody = this.controller.sprite.body;
    const left = this.controller.sensors.left;
    const right = this.controller.sensors.right;
    const bottom = this.controller.sensors.bottom;

    for (let i = 0; i < event.pairs.length; i += 1) {
      event.pairs[i].bodyA;
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];

      if (bodyA === playerBody || bodyB === playerBody) {
        continue;
      } else if (bodyA === bottom || bodyB === bottom) {
        this.controller.numTouchingSurfaces.bottom += 1;
      } else if ((bodyA === left && bodyB.isStatic) || (bodyB === left && bodyA.isStatic)) {
        this.controller.numTouchingSurfaces.left += 1;
      } else if ((bodyA === right && bodyB.isStatic) || (bodyB === right && bodyA.isStatic)) {
        this.controller.numTouchingSurfaces.right += 1;
      }
    }
  }
  private afterUpdate() {
    this.controller.blocked.right = this.controller.numTouchingSurfaces.right > 0 ? true : false;
    this.controller.blocked.left = this.controller.numTouchingSurfaces.left > 0 ? true : false;
    this.controller.blocked.bottom = this.controller.numTouchingSurfaces.bottom > 0 ? true : false;
  }

  // update(time: number, delta: number, cursors: Types.Input.Keyboard.CursorKeys) {}
}
