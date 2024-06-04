import { Animations, GameObjects, Types } from 'phaser';
import { PlayerInput, PlayerInputs } from '../types/types';
import { Game } from '../scenes/game';
import { clamp, clampLow, denormalize, normalize } from '../utils';
import { InputManager } from '../helpers/input-manager';
import { Fireball } from './fireball';
import { AnimatedLight } from '../helpers/animated-light';

export interface PlayerConfig {
  maxRunSpeed: number;
  jumpPower: number;
  speedModifier: number;
  dragModifier: number;
  fastAttackCooldown: number;
  powerAttackCooldown: number;
  hurtCooldown: number;
  maxHealth: number;
  torchIntensity: number;
  torchRadius: number;
}
export type PlayerAnimationType =
  | 'idle'
  | 'walk'
  | 'jump-ready'
  | 'jump'
  | 'jump-land'
  | 'hurt'
  | 'dead'
  | 'power-attack'
  | 'fast-attack'
  | 'crouch-in'
  | 'crouch-out';

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
    hurtCooldown: 1500,
    maxHealth: 100,
    torchIntensity: 1,
    torchRadius: 250,
  };
  dimensions: { w: number; h: number; sx: number; sy: number };
  animations: Partial<Record<PlayerAnimationType, Animations.Animation | false>>;
  speed: number = 0;
  health = this.config.maxHealth;
  ui: { healthBar: GameObjects.Graphics };
  flags: { isHurting: string | false; isDead: boolean; lightState: 'on' | 'off' | false } = {
    isHurting: false,
    isDead: false,
    lightState: false,
  };
  private standingBody: MatterJS.BodyType;
  private standingSensors: { left: MatterJS.BodyType; right: MatterJS.BodyType; bottom: MatterJS.BodyType };
  torch: AnimatedLight;

  get x(): number {
    return this.controller.sprite.x;
  }
  get y(): number {
    return this.controller.sprite.y;
  }
  get direction(): number {
    return this.controller.sprite.flipX ? -1 : 1;
  }
  set direction(value: number) {
    this.controller.sprite.flipX = value === -1;
  }

  constructor(public game: Game) {
    this.setController();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();
    this.setUI();
    this.setLight();

    (this.controller.sprite as any).isDestroyable = () => false;
    this.controller.sprite.setScale(1.5, 1.5);
  }

  private setLight() {
    this.torch = new AnimatedLight(
      this.game,
      this.game.lights.addLight(this.x, this.y, this.config.torchRadius).setColor(0xffffff).setIntensity(0),
      { radius: this.config.torchRadius, intensity: this.config.torchIntensity },
    );
  }
  private setController() {
    const sprite = this.game.matter.add.sprite(0, 0, 'neko');
    sprite.setPipeline('Light2D');

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
    const hurt = this.controller.sprite.anims.create({
      key: 'hurt',
      frames: this.controller.sprite.anims.generateFrameNumbers('neko', { start: 39, end: 41 }),
      frameRate: 5,
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
      hurt,
      dead,
      'power-attack': powerAttack,
      'fast-attack': fastAttack,
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
  private setUI() {
    const healthBar = this.game.add.graphics();
    this.ui = { healthBar };
  }

  private updateUI() {
    this.ui.healthBar.x = this.controller.sprite.x - 15;
    this.ui.healthBar.y = this.controller.sprite.y - this.controller.sprite.height * 1.75;
    this.ui.healthBar.clear();
    this.ui.healthBar.lineStyle(1, 0xffffff);
    this.ui.healthBar.strokeRect(0, 0, 30, 4);
    const normHealth = normalize(this.health, 0, this.config.maxHealth);
    this.ui.healthBar.fillStyle(normHealth >= 0.75 ? 0x00ff00 : normHealth >= 0.25 ? 0xffff00 : 0xff0000);
    this.ui.healthBar.fillRect(1, 1, denormalize(normalize(this.health, 0, this.config.maxHealth), 0, 28), 2);
  }

  prevInput: PlayerInputs = {};
  isDucking = false;
  applyInputs(delta: number, time: number, input: PlayerInputs) {
    if (this.flags.isDead || this.flags.isHurting) return;

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

    this.prevInput = structuredClone(input);
  }

  blockAnimation: string | null = null;
  private animate(input: PlayerInputs) {
    if (this.flags.isDead || this.flags.isHurting) return;

    if (this.blockAnimation) {
      if (input[PlayerInput.RIGHT] || input[PlayerInput.LEFT] || input[PlayerInput.JUMP] || input[PlayerInput.CROUCH]) {
        this.blockAnimation = null;
      }
      return;
    }

    if ((this.direction === -1 && input[PlayerInput.RIGHT]) || (this.direction !== -1 && input[PlayerInput.LEFT])) {
      this.direction = this.direction * -1;
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
  private hurt(direction: number, by: string) {
    this.flags.isHurting = by;
    this.controller.sprite.setVelocity(direction * 2, -3);
    this.direction = direction * -1;
    this.controller.sprite.anims
      .play('hurt')
      .once(Animations.Events.ANIMATION_COMPLETE, () => (this.flags.isHurting = false));
  }
  private die() {
    if (this.flags.isDead) return;

    this.flags.isDead = true;
    this.controller.sprite.anims.play('dead');
  }

  private beforeUpdate(delta: number, time: number) {
    this.torch.source.x = this.x;
    this.torch.source.y = this.y - this.controller.sprite.height / 2;

    if (this.y > this.game.map.heightInPixels) {
      this.hit(Infinity, this.direction, 'bounds');
    }
    this.applyInputs(delta, time, InputManager.input);
    this.animate(InputManager.input);
    this.updateUI();

    this.controller.numTouchingSurfaces.left = 0;
    this.controller.numTouchingSurfaces.right = 0;
    this.controller.numTouchingSurfaces.bottom = 0;
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    const left = this.controller.sensors.left;
    const right = this.controller.sensors.right;
    const bottom = this.controller.sensors.bottom;

    for (let i = 0; i < event.pairs.length; i += 1) {
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];

      if (bodyA.gameObject?.texture?.key === 'neko' || bodyA.gameObject?.texture?.key === 'neko') {
        if (bodyA.gameObject?.texture?.key === 'belch' || bodyB.gameObject?.texture?.key === 'belch') {
          const belchGO = (
            bodyA.gameObject?.texture?.key === 'belch' ? bodyA.gameObject : bodyB.gameObject
          ) as GameObjects.GameObject;
          const belch = this.game.objects.belches[belchGO.name];
          if (!belch!.isDestroyed) {
            this.hit(
              this.game.objects.belches[belchGO.name]!.config.power,
              this.game.objects.belches[belchGO.name]!.sprite.flipX ? -1 : 1,
              belch!.sprite.name,
            );
          }
        }
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

  hit(damage: number, direction: number, by: string) {
    if (this.flags.isHurting === by) return;

    this.health = clampLow(this.health - damage, 0);
    if (this.health === 0) {
      this.die();
    } else {
      this.hurt(direction, by);
    }
  }
}
