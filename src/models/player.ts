import { Animations, Types } from 'phaser';
import { PlayerAnimationType, PlayerInput, PlayerInputs } from '../types/types';
import { Game } from '../scenes/game';
import { clamp, denormalize, normalize } from '../utils';
import { InputManager } from '../helpers/input-manager';
import { PlayerConfig } from '../types/interfaces';
import { Fireball } from './fireball';

export class Player {
  controller: {
    sprite: Phaser.Physics.Matter.Sprite;
    prevBlocked: { left: boolean; right: boolean; bottom: boolean };
    blocked: { left: boolean; right: boolean; bottom: boolean };
    sensors: { left: MatterJS.BodyType; right: MatterJS.BodyType; bottom: MatterJS.BodyType };
    numTouchingSurfaces: { left: number; right: number; bottom: number };
    lastJumpedAt: number;
    lastFastAttackAt: number;
    lastPowerAttackAt: number;
  };
  config: PlayerConfig = {
    maxRunSpeed: 3,
    speedModifier: 0.01,
    dragModifier: 0.01,
    jumpPower: 7,
    fastAttackCooldown: 1200,
    powerAttackCooldown: 1500,
  };
  dimensions: { w: number; h: number; sx: number; sy: number };
  animations: Partial<Record<PlayerAnimationType, Animations.Animation | false>>;
  speed: number = 0;
  private standingBody: MatterJS.BodyType;
  private standingSensors: { left: MatterJS.BodyType; right: MatterJS.BodyType; bottom: MatterJS.BodyType };

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

    this.controller.sprite.setScale(1.5, 1.5);
  }

  private setController() {
    const sprite = this.game.matter.add.sprite(0, 0, 'neko');

    const w = sprite.width;
    const h = sprite.height;
    const sx = w / 2;
    const sy = h / 2;

    this.dimensions = { w, h, sx, sy };

    this.standingSensors = {
      left: this.game.matter.bodies.rectangle(sx - w * 0.35 + 2.5, h, 5, h * 0.25, { isSensor: true }),
      right: this.game.matter.bodies.rectangle(sx + w * 0.35 - 2.5, h, 5, h * 0.25, { isSensor: true }),
      bottom: this.game.matter.bodies.rectangle(sx, h * 1.5 - 1.5, sx * 0.75, 5, { isSensor: true }),
    };

    this.controller = {
      sprite,
      prevBlocked: {
        left: false,
        right: false,
        bottom: false,
      },
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
      sensors: this.standingSensors,
      lastJumpedAt: 0,
      lastFastAttackAt: 0,
      lastPowerAttackAt: 0,
    };
  }
  private setPhysics() {
    const bodyS = this.game.matter.bodies.rectangle(
      this.dimensions.sx,
      this.dimensions.h,
      this.dimensions.w * 0.55,
      this.dimensions.h - 3,
      { chamfer: { radius: 10 } },
    );

    this.standingBody = this.game.matter.body.create({
      parts: [bodyS, this.standingSensors.bottom, this.standingSensors.left, this.standingSensors.right],
      restitution: 0.05,
    });

    this.controller.sprite.setExistingBody(this.standingBody).setFixedRotation().setPosition(32, 800);
    this.game.matter.body.setCentre(
      this.controller.sprite.body as MatterJS.BodyType,
      { x: 0, y: this.dimensions.h / 2 },
      true,
    );
  }
  private setAnimations() {
    const idle = this.controller.sprite.anims.create({
      key: 'idle',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
    const walk = this.controller.sprite.anims.create({
      key: 'walk',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 13, end: 20 }),
      frameRate: 30,
      repeat: -1,
    });
    const jump = this.controller.sprite.anims.create({
      key: 'jump',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 28, end: 29 }),
      frameRate: 20,
      repeat: -1,
    });
    const jumpLand = this.controller.sprite.anims.create({
      key: 'jump-land',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 30, end: 33 }),
      frameRate: 20,
      repeat: 0,
    });
    const dead = this.controller.sprite.anims.create({
      key: 'dead',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 39, end: 45 }),
      frameRate: 10,
      repeat: 0,
    });
    const powerAttack = this.controller.sprite.anims.create({
      key: 'power-attack',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 52, end: 58 }),
      frameRate: 18,
      repeat: 0,
    });
    const fastAttack = this.controller.sprite.anims.create({
      key: 'fast-attack',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 65, end: 70 }),
      frameRate: 60,
      repeat: 0,
    });
    const comboAttack = this.controller.sprite.anims.create({
      key: 'combo-attack',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 78, end: 87 }),
      frameRate: 15,
      repeat: 0,
    });
    const comboKick = this.controller.sprite.anims.create({
      key: 'combo-kick',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 91, end: 102 }),
      frameRate: 20,
      repeat: 0,
    });
    const crouchIn = this.controller.sprite.anims.create({
      key: 'crouch-in',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 104, end: 106 }),
      frameRate: 24,
      repeat: 0,
    });
    const crouchOut = this.controller.sprite.anims.create({
      key: 'crouch-out',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 106, end: 108 }),
      frameRate: 24,
      repeat: 0,
    });

    this.animations = {
      idle,
      walk,
      jump,
      'jump-land': jumpLand,
      dead,
      'power-attack': powerAttack,
      'fast-attack': fastAttack,
      'combo-attack': comboAttack,
      'combo-kick': comboKick,
      'crouch-in': crouchIn,
      'crouch-out': crouchOut,
    };
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

  prevInput: PlayerInputs = {};
  isDucking = false;
  applyInputs(delta: number, time: number, input: PlayerInputs) {
    let isMoving = false;
    if (input[PlayerInput.LEFT] || input[PlayerInput.RIGHT]) {
      isMoving = true;
      this.walk(delta, time, input[PlayerInput.LEFT]);
    } else {
      this.stop(delta, time);
    }

    let isJumping = false;
    if (input[PlayerInput.JUMP]) {
      isJumping = true;
      this.jump(delta, time);
    }

    if (
      ((!this.prevInput[PlayerInput.CROUCH] && input[PlayerInput.CROUCH]) ||
        (input[PlayerInput.CROUCH] /* && !this.controller.prevBlocked.bottom */ && this.controller.blocked.bottom)) &&
      !isMoving &&
      !isJumping
    ) {
      this.duckIn(delta, time);
    } else if (this.prevInput[PlayerInput.CROUCH] && !input[PlayerInput.CROUCH]) {
      this.duckOut(delta, time);
    }
    if ((isMoving || isJumping) && this.isDucking) {
      this.isDucking = false;
      this.game.matter.body.scale(this.controller.sprite.body as MatterJS.BodyType, 1, 2);
    }

    if (input[PlayerInput.FAST_ATTACK]) {
      this.fastAttack(delta, time);
    }
    if (input[PlayerInput.POWER_ATTACK]) {
      this.powerAttack(delta, time);
    }

    if (input[PlayerInput.COMBO_ATTACK] && !isMoving && !isJumping) {
      this.comboAttack(delta, time);
    }
    if (input[PlayerInput.COMBO_KICK] && !isMoving && !isJumping) {
      this.comboKick(delta, time);
    }

    this.prevInput = structuredClone(input);
  }

  blockAnimation: string | null = null;
  private animate(input: PlayerInputs) {
    if (this.blockAnimation) {
      if (input[PlayerInput.RIGHT] || input[PlayerInput.LEFT] || input[PlayerInput.JUMP] || input[PlayerInput.CROUCH]) {
        this.blockAnimation = null;
      }
      return;
    }

    if (
      (this.controller.sprite.flipX && input[PlayerInput.RIGHT]) ||
      (!this.controller.sprite.flipX && input[PlayerInput.LEFT])
    ) {
      this.controller.sprite.flipX = !this.controller.sprite.flipX;
    }

    // On-ground or in-air
    if (this.controller.blocked.bottom) {
      // Neko ducking
      if (this.isDucking) {
        this.controller.sprite.anims.currentAnim?.key !== 'crouch-in' &&
          this.controller.sprite.anims.play('crouch-in', true);
        return;
      }
      // Neko landed
      if (!this.controller.prevBlocked.bottom) {
        this.blockAnimation = 'jump-land';
        this.controller.sprite.anims.play('jump-land', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
          this.blockAnimation = null;
        });
        return;
      }
      // Moving or Still
      if (Math.abs(this.speed) > 0) {
        this.controller.sprite.anims.get('walk').msPerFrame = denormalize(
          normalize(Math.abs(this.speed), 0, this.config.maxRunSpeed),
          0,
          1000 / 30,
        );
        this.controller.sprite.anims.play('walk', true);
      } else {
        this.controller.sprite.anims.play('idle', true);
      }
    } else {
      this.controller.sprite.anims.play('jump', true);
    }
  }

  private walk(delta: number, _time: number, isLeft = false) {
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
      this.controller.sprite.setVelocityY(-this.config.jumpPower);
    }
  }
  private stop(delta: number, _time: number) {
    if (this.speed === 0) {
      return;
    }

    if (Math.abs(this.speed) <= 0.1) {
      this.speed = 0;
    } else {
      this.speed = clamp(
        this.speed + Math.sign(this.speed) * -1 * delta * this.config.dragModifier,
        -this.config.maxRunSpeed,
        this.config.maxRunSpeed,
      );
    }

    this.controller.sprite.setVelocityX(this.speed);
  }
  private duckIn(_delta: number, _time: number) {
    if (this.controller.blocked.bottom && !this.isDucking) {
      this.game.matter.body.scale(this.controller.sprite.body as MatterJS.BodyType, 1, 0.5);

      this.isDucking = true;
    }
  }
  private duckOut(_delta: number, _time: number) {
    if (this.isDucking) {
      this.game.matter.body.scale(this.controller.sprite.body as MatterJS.BodyType, 1, 2);

      this.isDucking = false;

      this.blockAnimation = 'crouch-out';
      this.controller.sprite.anims.play('crouch-out', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
        this.blockAnimation = null;
      });
    }
  }
  private fastAttack(_delta: number, time: number) {
    if (time - this.controller.lastFastAttackAt >= this.config.fastAttackCooldown) {
      this.blockAnimation = 'fast-attack';
      this.controller.sprite.anims.play('fast-attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
        this.blockAnimation = null;
      });

      new Fireball(this.game, 'low');
      this.controller.lastFastAttackAt = time;
    }
  }
  private powerAttack(_delta: number, time: number) {
    if (!this.controller.blocked.bottom) return;

    if (time - this.controller.lastPowerAttackAt >= this.config.powerAttackCooldown) {
      this.blockAnimation = 'power-attack';
      this.controller.sprite.anims.play('power-attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
        this.blockAnimation === 'power-attack' && new Fireball(this.game, 'high');
        this.blockAnimation = null;
      });

      this.controller.lastPowerAttackAt = time;
    }
  }
  private comboAttack(_delta: number, _time: number) {
    if (!this.controller.blocked.bottom) return;

    if (!this.blockAnimation) {
      this.blockAnimation = 'combo-attack';
      this.controller.sprite.anims.play('combo-attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
        // this.blockAnimation === 'combo-attack' && new Fireball(this.game, 'high');
        this.blockAnimation = null;
      });
    }
  }
  private comboKick(_delta: number, _time: number) {
    if (!this.controller.blocked.bottom) return;

    if (!this.blockAnimation) {
      this.blockAnimation = 'combo-kick';
      this.controller.sprite.anims.play('combo-kick', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
        // this.blockAnimation === 'combo-attack' && new Fireball(this.game, 'high');
        this.blockAnimation = null;
      });
    }
  }

  private beforeUpdate(delta: number, time: number) {
    this.applyInputs(delta, time, InputManager.input);
    this.animate(InputManager.input);
    // this.playSounds();

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
    this.controller.prevBlocked.right = this.controller.blocked.right;
    this.controller.prevBlocked.left = this.controller.blocked.left;
    this.controller.prevBlocked.bottom = this.controller.blocked.bottom;

    this.controller.blocked.right = this.controller.numTouchingSurfaces.right > 0 ? true : false;
    this.controller.blocked.left = this.controller.numTouchingSurfaces.left > 0 ? true : false;
    this.controller.blocked.bottom = this.controller.numTouchingSurfaces.bottom > 0 ? true : false;
  }
}
