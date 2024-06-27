import { Animations, GameObjects, Math as M, Types } from 'phaser';
import { Game } from '../scenes/game';
import { rand, randRadial } from '../utils';
import { Fireball } from './fireball';
import { Monster, MonsterFlags } from './monster';

export type FlyFlyAnimationType = 'idle' | 'bite' | 'die';
export interface FlyFlyConfig {
  maxHealth: number;
  speed: number;
  attackPower: () => number;
  chaseDistance: number;
  attackDistance: number;
  territoryRadius: number;
  waypointThreshold: number;
}
export type FlyFlyState = 'roam' | 'chase' | 'attack';
export interface FlyFlyFlags extends MonsterFlags {}

export class FlyFly extends Monster<FlyFlyConfig, FlyFlyState, FlyFlyFlags, FlyFlyAnimationType> {
  declare controller: {
    sensors: {
      topLeft: MatterJS.BodyType;
      top: MatterJS.BodyType;
      topRight: MatterJS.BodyType;
      left: MatterJS.BodyType;
      right: MatterJS.BodyType;
      bottomLeft: MatterJS.BodyType;
      bottomRight: MatterJS.BodyType;
      bottom: MatterJS.BodyType;
    };
    numOfTouchingSurfaces: {
      topLeft: number;
      top: number;
      topRight: number;
      left: number;
      right: number;
      bottomLeft: number;
      bottomRight: number;
      bottom: number;
    };
    blocked: {
      topLeft: boolean;
      top: boolean;
      topRight: boolean;
      left: boolean;
      right: boolean;
      bottomLeft: boolean;
      bottomRight: boolean;
      bottom: boolean;
    };
  };
  origin: Types.Math.Vector2Like;
  nextWaypoint: Types.Math.Vector2Like = { x: 0, y: 0 };
  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  constructor(game: Game, pos: Types.Math.Vector2Like) {
    super(
      game,
      'flyfly',
      pos,
      'roam',
      {
        speed: 1.5,
        attackPower: () => rand(6, 12),
        chaseDistance: 175,
        attackDistance: 45,
        maxHealth: 20,
        territoryRadius: 300,
        waypointThreshold: 3,
      },
      'idle',
    );

    this.origin = { x: pos.x, y: pos.y };
    this.nextWaypoint = { x: pos.x, y: pos.y };
  }

  setPhysics() {
    const w = this.sprite.width;
    this.controller = {
      sensors: {
        left: this.game.matter.bodies.rectangle(0, w / 2, 5, 5, { isSensor: true }),
        right: this.game.matter.bodies.rectangle(w, w / 2, 5, 5, { isSensor: true }),
        top: this.game.matter.bodies.rectangle(w / 2, 0, 5, 5, { isSensor: true }),
        bottom: this.game.matter.bodies.rectangle(w / 2, w, 5, 5, { isSensor: true }),
        bottomLeft: this.game.matter.bodies.rectangle(0, w, 5, 5, { isSensor: true }),
        bottomRight: this.game.matter.bodies.rectangle(w, w, 5, 5, { isSensor: true }),
        topLeft: this.game.matter.bodies.rectangle(0, 0, 5, 5, { isSensor: true }),
        topRight: this.game.matter.bodies.rectangle(w, 0, 5, 5, { isSensor: true }),
      },
      numOfTouchingSurfaces: {
        left: 0,
        right: 0,
        bottomLeft: 0,
        bottomRight: 0,
        top: 0,
        bottom: 0,
        topLeft: 0,
        topRight: 0,
      },
      blocked: {
        left: false,
        right: false,
        bottomLeft: false,
        bottomRight: false,
        top: false,
        bottom: false,
        topLeft: false,
        topRight: false,
      },
    };

    this.body = this.game.matter.bodies.circle(w / 2, w / 2, w / 3, {
      isSensor: true,
      restitution: 0.05,
      friction: 0,
    });

    const compoundBody = this.game.matter.body.create({
      parts: [
        this.body,
        this.controller.sensors.left,
        this.controller.sensors.right,
        this.controller.sensors.bottomLeft,
        this.controller.sensors.bottomRight,
        this.controller.sensors.top,
        this.controller.sensors.bottom,
        this.controller.sensors.topLeft,
        this.controller.sensors.topRight,
      ],
      ignoreGravity: true,
    });

    this.sprite.setExistingBody(compoundBody).setPosition(this.spawnPos.x, this.spawnPos.y).setFixedRotation();
  }
  setAnimations() {
    const idle = this.sprite.anims.create({
      key: 'idle',
      frames: this.sprite.anims.generateFrameNumbers('flyfly', { start: 0, end: 4 }),
      frameRate: 16,
      repeat: -1,
    });
    const bite = this.sprite.anims.create({
      key: 'bite',
      frames: this.sprite.anims.generateFrameNumbers('flyfly', { start: 8, end: 12 }),
      frameRate: 17,
      repeat: 0,
    });
    const die = this.sprite.anims.create({
      key: 'die',
      frames: this.sprite.anims.generateFrameNumbers('flyfly', { start: 16, end: 23 }),
      frameRate: 15,
      repeat: 0,
    });

    this.animations = {
      idle,
      bite,
      die,
    };
  }

  beforeUpdate(_delta: number, time: number) {
    if (this.flags.isDead) return;

    const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
    if (distanceToPlayer <= this.config.chaseDistance) {
      this.state = 'chase';
    } else {
      this.state = 'roam';
    }
    /* if (this.intersections.find((point: any) => point?.object?.name?.includes('neko'))) {
      this.state = 'chase';
    } else {
      this.state = 'roam';
    } */

    this.applyInputs(time);

    this.controller.numOfTouchingSurfaces.left = 0;
    this.controller.numOfTouchingSurfaces.right = 0;
    this.controller.numOfTouchingSurfaces.bottomLeft = 0;
    this.controller.numOfTouchingSurfaces.bottomRight = 0;
    this.controller.numOfTouchingSurfaces.top = 0;
    this.controller.numOfTouchingSurfaces.bottom = 0;
    this.controller.numOfTouchingSurfaces.topLeft = 0;
    this.controller.numOfTouchingSurfaces.topRight = 0;
  }
  collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) {
    if (this.flags.isDead) return;

    const left = this.controller.sensors.left;
    const right = this.controller.sensors.right;
    const bottomLeft = this.controller.sensors.bottomLeft;
    const bottomRight = this.controller.sensors.bottomRight;
    const top = this.controller.sensors.top;
    const bottom = this.controller.sensors.bottom;
    const topLeft = this.controller.sensors.topLeft;
    const topRight = this.controller.sensors.topRight;
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
      } else if ((bodyA === left && bodyB.isStatic) || (bodyB === left && bodyA.isStatic)) {
        this.controller.numOfTouchingSurfaces.left += 1;
      } else if ((bodyA === right && bodyB.isStatic) || (bodyB === right && bodyA.isStatic)) {
        this.controller.numOfTouchingSurfaces.right += 1;
      } else if (bodyA === top || bodyB === top) {
        this.controller.numOfTouchingSurfaces.top += 1;
      } else if (bodyA === bottom || bodyB === bottom) {
        this.controller.numOfTouchingSurfaces.bottom += 1;
      } else if ((bodyA === topLeft && bodyB.isStatic) || (bodyB === topLeft && bodyA.isStatic)) {
        this.controller.numOfTouchingSurfaces.topLeft += 1;
      } else if ((bodyA === topRight && bodyB.isStatic) || (bodyB === topRight && bodyA.isStatic)) {
        this.controller.numOfTouchingSurfaces.topRight += 1;
      }
    }
  }
  afterUpdate(_delta: number, _time: number) {
    if (this.flags.isDead) return;

    this.controller.blocked.right = this.controller.numOfTouchingSurfaces.right > 0 ? true : false;
    this.controller.blocked.left = this.controller.numOfTouchingSurfaces.left > 0 ? true : false;
    this.controller.blocked.bottomLeft = this.controller.numOfTouchingSurfaces.bottomLeft > 0 ? true : false;
    this.controller.blocked.bottomRight = this.controller.numOfTouchingSurfaces.bottomRight > 0 ? true : false;
    this.controller.blocked.top = this.controller.numOfTouchingSurfaces.top > 0 ? true : false;
    this.controller.blocked.bottom = this.controller.numOfTouchingSurfaces.bottom > 0 ? true : false;
    this.controller.blocked.topLeft = this.controller.numOfTouchingSurfaces.topLeft > 0 ? true : false;
    this.controller.blocked.topRight = this.controller.numOfTouchingSurfaces.topRight > 0 ? true : false;
  }

  private applyInputs(_time: number) {
    // If chasing or attacking, always face the player
    if (this.state === 'chase' || this.state === 'attack') {
      this.direction = Math.sign(this.game.player.x - this.sprite.x);
    }

    // If roaming or chasing, move around
    if (this.state === 'roam' || this.state === 'chase') {
      this.move();
    }
  }

  private move() {
    if (this.flags.isDead) return;

    const waypoint = this.state === 'chase' ? { x: this.game.player.x, y: this.game.player.y } : this.nextWaypoint;
    const distanceToWaypoint = M.Distance.Between(this.x, this.y, waypoint.x, waypoint.y);
    if (distanceToWaypoint <= this.config.waypointThreshold && this.state !== 'chase') {
      this.nextWaypoint = randRadial(this.origin.x, this.origin.y, this.config.territoryRadius);
    } else {
      this.direction = Math.sign(waypoint.x - this.x);
    }
    this.sprite.anims.play('idle', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.state !== 'attack') this.sprite.anims.play('idle', true);
    });
    const a = new M.Vector2(waypoint);
    const b = new M.Vector2({ x: this.x, y: this.y });
    const velocityVec = a.subtract(b).normalize().scale(this.config.speed);
    this.sprite.setVelocity(velocityVec.x, velocityVec.y);
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

    this.health = 0;
    this.die();
  }
  die() {
    if (this.flags.isDead) return;

    this.sprite.setVelocity(0);
    (this.sprite.body as MatterJS.BodyType).isSensor = true;
    this.flags.isDead = true;
    this.sprite.anims.play('die').once(Animations.Events.ANIMATION_COMPLETE, () => this.dispose());
  }
  hurt() {}
}
