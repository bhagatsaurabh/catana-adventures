import { Animations, GameObjects, Math as M, Types } from 'phaser';
import { Game } from '../scenes/game';
import { clampLow, rand } from '../utils';
import { Fireball } from './fireball';
import { Monster, MonsterFlags } from './monster';

export type ChomperAnimationType = 'idle' | 'move' | 'bite' | 'hurt' | 'die';
export interface ChomperConfig {
  speed: number;
  attackPower: () => number;
  jumpPower: number;
  jumpCooldown: number;
  leapDistance: number;
  chaseDistance: number;
  attackDistance: number;
  maxHealth: number;
}
export type ChomperState = 'roam' | 'chase' | 'attack';
export interface ChomperFlags extends MonsterFlags {}

export class Chomper extends Monster<ChomperConfig, ChomperState, ChomperFlags, ChomperAnimationType> {
  declare controller: {
    sensors: {
      left: MatterJS.BodyType;
      right: MatterJS.BodyType;
      bottomLeft: MatterJS.BodyType;
      bottomRight: MatterJS.BodyType;
    };
    numOfTouchingSurfaces: {
      left: number;
      right: number;
      bottomLeft: number;
      bottomRight: number;
    };
    blocked: {
      left: boolean;
      right: boolean;
      bottomLeft: boolean;
      bottomRight: boolean;
    };
    lastJumpedAt: number;
  };

  constructor(game: Game, pos: Types.Math.Vector2Like) {
    super(
      game,
      'chomper',
      pos,
      'roam',
      {
        maxHealth: 20,
        speed: 2,
        attackPower: () => rand(6, 12),
        jumpPower: 3,
        jumpCooldown: 1000,
        leapDistance: 37,
        chaseDistance: 128,
        attackDistance: 45,
      },
      'idle',
    );
  }

  setPhysics() {
    const w = this.sprite.width;
    this.controller = {
      sensors: {
        left: this.game.matter.bodies.rectangle(0, w / 2, 5, 10, { isSensor: true }),
        right: this.game.matter.bodies.rectangle(w, w / 2, 5, 10, { isSensor: true }),
        bottomLeft: this.game.matter.bodies.rectangle(0, w - 2.5, 10, 5, { isSensor: true }),
        bottomRight: this.game.matter.bodies.rectangle(w, w - 2.5, 10, 5, { isSensor: true }),
      },
      numOfTouchingSurfaces: { left: 0, right: 0, bottomLeft: 0, bottomRight: 0 },
      blocked: { left: false, right: false, bottomLeft: false, bottomRight: false },
      lastJumpedAt: 0,
    };

    this.body = this.game.matter.bodies.circle(w / 2, w / 2, w / 2 - 3);

    const compoundBody = this.game.matter.body.create({
      parts: [
        this.body,
        this.controller.sensors.left,
        this.controller.sensors.right,
        this.controller.sensors.bottomLeft,
        this.controller.sensors.bottomRight,
      ],
      restitution: 0.05,
    });

    this.sprite.setExistingBody(compoundBody).setPosition(this.spawnPos.x, this.spawnPos.y).setFixedRotation();
  }
  setAnimations() {
    const idle = this.sprite.anims.create({
      key: 'idle',
      frames: this.sprite.anims.generateFrameNumbers('chomper', {
        start: 0,
        end: 3,
      }),
      frameRate: 16,
      repeat: -1,
    });
    const move = this.sprite.anims.create({
      key: 'move',
      frames: this.sprite.anims.generateFrameNumbers('chomper', {
        start: 7,
        end: 11,
      }),
      frameRate: 12,
      repeat: 0,
    });
    const bite = this.sprite.anims.create({
      key: 'bite',
      frames: this.sprite.anims.generateFrameNumbers('chomper', {
        start: 14,
        end: 19,
      }),
      frameRate: 17,
      repeat: 0,
    });
    const hurt = this.sprite.anims.create({
      key: 'hurt',
      frames: this.sprite.anims.generateFrameNumbers('chomper', {
        start: 21,
        end: 23,
      }),
      frameRate: 20,
      repeat: 0,
    });
    const die = this.sprite.anims.create({
      key: 'die',
      frames: this.sprite.anims.generateFrameNumbers('chomper', { frames: [21, 22, 23, 24, 25, 26, 27, 20] }),
      frameRate: 15,
      repeat: 0,
    });

    this.animations = {
      idle,
      move,
      bite,
      hurt,
      die,
    };
  }

  beforeUpdate(_delta: number, time: number) {
    if (this.flags.isHurting || this.flags.isDead) return;

    const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
    if (distanceToPlayer <= this.config.chaseDistance) {
      this.state = 'chase';
    } else {
      this.state = 'roam';
    }

    this.applyInputs(time);

    this.controller.numOfTouchingSurfaces.left = 0;
    this.controller.numOfTouchingSurfaces.right = 0;
    this.controller.numOfTouchingSurfaces.bottomLeft = 0;
    this.controller.numOfTouchingSurfaces.bottomRight = 0;
  }
  collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) {
    if (this.flags.isHurting || this.flags.isDead) return;

    const left = this.controller.sensors.left;
    const right = this.controller.sensors.right;
    const bottomLeft = this.controller.sensors.bottomLeft;
    const bottomRight = this.controller.sensors.bottomRight;
    const player = this.game.player.controller.sprite;

    for (let i = 0; i < event.pairs.length; i += 1) {
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];

      if (bodyA === this.body || bodyB === this.body) {
        if (bodyA.gameObject === player || bodyB.gameObject === player) {
          this.attack();
        } else if (bodyA.gameObject?.name?.includes('fireball') || bodyB.gameObject?.name?.includes('fireball')) {
          const fireballGO = (
            bodyA.gameObject?.name?.includes('fireball') ? bodyA.gameObject : bodyB.gameObject
          ) as GameObjects.GameObject;
          this.hit(event.timestamp, this.game.objects.fireballs[fireballGO.name]);
        }
        continue;
      } else if (bodyA === bottomLeft || bodyB === bottomLeft) {
        this.controller.numOfTouchingSurfaces.bottomLeft += 1;
      } else if (bodyA === bottomRight || bodyB === bottomRight) {
        this.controller.numOfTouchingSurfaces.bottomRight += 1;
      } else if (
        (bodyA === left && !bodyB.gameObject?.name?.includes('coin') && (bodyB.isStatic || bodyB.gameObject)) ||
        (bodyB === left && !bodyA.gameObject?.name?.includes('coin') && (bodyA.isStatic || bodyA.gameObject))
      ) {
        this.controller.numOfTouchingSurfaces.left += 1;
      } else if (
        (bodyA === right && !bodyB.gameObject?.name?.includes('coin') && (bodyB.isStatic || bodyB.gameObject)) ||
        (bodyB === right && !bodyA.gameObject?.name?.includes('coin') && (bodyA.isStatic || bodyA.gameObject))
      ) {
        this.controller.numOfTouchingSurfaces.right += 1;
      }
    }
  }
  afterUpdate(_delta: number, _time: number) {
    if (this.flags.isHurting || this.flags.isDead) return;

    this.controller.blocked.right = this.controller.numOfTouchingSurfaces.right > 0 ? true : false;
    this.controller.blocked.left = this.controller.numOfTouchingSurfaces.left > 0 ? true : false;
    this.controller.blocked.bottomLeft = this.controller.numOfTouchingSurfaces.bottomLeft > 0 ? true : false;
    this.controller.blocked.bottomRight = this.controller.numOfTouchingSurfaces.bottomRight > 0 ? true : false;
  }

  private applyInputs(time: number) {
    // If chasing or attacking, always face the player
    if (this.state === 'chase' || this.state === 'attack') {
      this.direction = Math.sign(this.game.player.x - this.sprite.x);
    }

    // If roaming or chasing, move around
    if (this.state === 'roam' || this.state === 'chase') {
      if (this.controller.blocked.bottomRight || this.controller.blocked.bottomLeft) {
        if (
          !this.game.map.getTileAtWorldXY(
            this.sprite.x + this.direction * this.config.leapDistance,
            this.sprite.y + this.sprite.height,
          )
        ) {
          this.direction *= -1;
        }
        if (time - this.controller.lastJumpedAt >= this.config.jumpCooldown) {
          this.move();
          this.controller.lastJumpedAt = time;
        }
      }
      if (
        (this.controller.blocked.left && this.direction === -1) ||
        (this.controller.blocked.right && this.direction === 1)
      ) {
        this.direction *= -1;
      }
    }
  }
  private move() {
    this.sprite.anims.play('move').once(Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.state !== 'attack') {
        this.sprite.anims.play('idle');
      }
    });
    this.sprite.setVelocity(this.direction * this.config.speed, -this.config.jumpPower);
  }
  private attack() {
    if (this.state === 'attack') return;

    this.state = 'attack';

    this.sprite.anims.play('bite', true).once(Animations.Events.ANIMATION_COMPLETE, () => (this.state = 'roam'));
    this.game.player.hit(this.config.attackPower(), this.direction, this.sprite.name);
  }

  hit(_time: number, fireball?: Fireball) {
    if (!fireball) return;

    this.stats[fireball.type === 'high' ? 'noOfPowerAttacks' : 'noOfFastAttacks'] += 1;
    this.direction = fireball.direction * -1;

    this.health = clampLow(this.health - fireball.config.power, 0);
    if (this.health === 0) {
      this.die();
    } else {
      this.hurt();
    }
  }
  die() {
    if (this.flags.isDead) return;

    (this.sprite.body as MatterJS.BodyType).isSensor = true;
    this.flags.isDead = true;
    this.sprite.anims.play('die').once(Animations.Events.ANIMATION_COMPLETE, () => this.dispose());
  }
  hurt() {
    this.flags.isHurting = true;
    this.sprite.setVelocity(this.direction * -1 * 2, -3);
    this.sprite.anims.play('hurt').once(Animations.Events.ANIMATION_COMPLETE, () => (this.flags.isHurting = false));
  }
}
