import { Animations, GameObjects, Math as M, Types } from 'phaser';
import { Game } from '../scenes/game';
import { clampLow, rand } from '../utils';
import { Fireball } from './fireball';
import { Belch } from './belch';
import { Monster, MonsterFlags } from './monster';

interface DemonFlowerFlags extends MonsterFlags {
  isAttacking: boolean;
  isBelching: boolean;
}
export type DemonFlowerAnimationType = 'idle' | 'attack' | 'belch-start' | 'belch-end' | 'hurt' | 'die';
export interface DemonFlowerConfig {
  belchSpeed: number;
  attackPower: () => number;
  senseDistance: number;
  attackDistance: number;
  belchTimestamp: number;
  belchCooldown: number;
  maxHealth: number;
}
export type DemonFlowerState = 'idle' | 'belch' | 'attack';

export class DemonFlower extends Monster<
  DemonFlowerConfig,
  DemonFlowerState,
  DemonFlowerFlags,
  DemonFlowerAnimationType
> {
  constructor(game: Game, pos: Types.Math.Vector2Like) {
    super(
      game,
      'demon-flower',
      pos,
      'idle',
      {
        belchSpeed: 4,
        attackPower: () => rand(12, 16),
        senseDistance: 192,
        attackDistance: 50,
        belchCooldown: 2000,
        belchTimestamp: 0,
        maxHealth: 30,
      },
      'idle',
    );
  }

  setPhysics() {
    const h = this.sprite.height;

    this.body = this.game.matter.bodies.circle(20, 20, h / 2.5, {
      isStatic: true,
      isSensor: true,
      restitution: 0.05,
      friction: 0,
    });

    this.sprite.setExistingBody(this.body).setPosition(this.spawnPos.x, this.spawnPos.y).setFixedRotation();
    this.game.matter.body.setCentre(this.body, { x: 2, y: -6 }, true);
  }
  setAnimations() {
    const idle = this.sprite.anims.create({
      key: 'idle',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    const attack = this.sprite.anims.create({
      key: 'attack',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 28,
        end: 32,
      }),
      frameRate: 13,
      repeat: 0,
    });
    const belchStart = this.sprite.anims.create({
      key: 'belch-start',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 42,
        end: 52,
      }),
      frameRate: 12,
      repeat: 0,
    });
    const belchEnd = this.sprite.anims.create({
      key: 'belch-end',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 53,
        end: 55,
      }),
      frameRate: 12,
      repeat: 0,
    });
    const hurt = this.sprite.anims.create({
      key: 'hurt',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', { start: 56, end: 58 }),
      frameRate: 12,
      repeat: 0,
    });
    const die = this.sprite.anims.create({
      key: 'die',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', { start: 56, end: 64 }),
      frameRate: 15,
      repeat: 0,
    });

    this.animations = {
      idle,
      attack,
      'belch-start': belchStart,
      'belch-end': belchEnd,
      hurt,
      die,
    };
  }

  beforeUpdate(_delta: number, time: number) {
    if (this.flags.isHurting || this.flags.isDead) return;

    const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
    if (distanceToPlayer <= this.config.senseDistance || this.flags.isBelching) {
      this.state = distanceToPlayer <= this.config.attackDistance ? 'attack' : 'belch';
    } else {
      this.state = 'idle';
    }

    this.applyInputs(time, this.state);
  }
  collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) {
    if (this.flags.isHurting || this.flags.isDead) return;

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
      }
    }
  }
  afterUpdate(_delta: number, _time: number): void {}

  private applyInputs(time: number, state: DemonFlowerState) {
    if (state === 'belch' || state === 'attack') {
      this.direction = Math.sign(this.game.player.x - this.sprite.x);
    }

    if (state === 'idle') {
      this.sprite.anims.play('idle', true);
      this.flags.isBelching = false;
      this.flags.isAttacking = false;
    }
    if (state === 'belch') {
      this.belch(time);
    } else if (state === 'attack') {
      this.attack();
    }
  }
  private attack() {
    if (this.flags.isAttacking) return;

    this.flags.isAttacking = true;

    this.sprite.anims.play('attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
      this.flags.isAttacking = false;
      if (this.flags.isDead) return;

      const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
      if (distanceToPlayer <= this.config.attackDistance) {
        this.game.player.hit(this.config.attackPower(), this.direction * -1, this.sprite.name);
      }
    });
  }
  private belch(time: number, reflex = false) {
    if (this.flags.isBelching) return;
    if (time - this.config.belchTimestamp < this.config.belchCooldown && !reflex) {
      this.sprite.anims.play('idle', true);
      return;
    }

    this.flags.isBelching = true;

    this.sprite.anims.play('belch-start', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.flags.isDead) {
        this.flags.isBelching = false;
        return;
      }

      new Belch(this.game, this.direction, { x: this.sprite.x, y: this.sprite.y }, this.config.attackPower());
      this.config.belchTimestamp = time;
      this.sprite.anims
        .play('belch-end', true)
        .once(Animations.Events.ANIMATION_COMPLETE, () => (this.flags.isBelching = false));
    });
  }
  hit(time: number, fireball?: Fireball) {
    if (!fireball) return;

    this.stats[fireball.type === 'high' ? 'noOfPowerAttacks' : 'noOfFastAttacks'] += 1;
    this.direction = fireball.direction * -1;

    this.health = clampLow(this.health - fireball.config.power, 0);
    if (this.health === 0) {
      this.die();
    } else {
      this.hurt(time);
    }
  }
  hurt(time: number) {
    this.flags.isHurting = true;
    this.flags.isAttacking = false;
    this.flags.isBelching = false;
    this.sprite.anims.play('hurt').once(Animations.Events.ANIMATION_COMPLETE, () => {
      this.flags.isHurting = false;
      this.sprite.anims.play('idle');
      if (this.state === 'idle') {
        this.belch(time, true);
      }
    });
  }
  die() {
    if (this.flags.isDead) return;

    (this.sprite.body as MatterJS.BodyType).isSensor = true;
    this.flags.isDead = true;
    this.sprite.anims.play('die').once(Animations.Events.ANIMATION_COMPLETE, () => this.dispose());
  }
}
