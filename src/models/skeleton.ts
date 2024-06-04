import { Animations, GameObjects, Math as M, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { chance, choose, clampLow, denormalize, luid, normalize, rand } from '../utils';
import { Fireball } from './fireball';
import { DeterministicRandomPath } from '../utils/drp';
import { AnimatedLight } from '../helpers/animated-light';

export type SkeletonAnimationType =
  | 'idle'
  | 'move'
  | 'attack'
  | 'hurt'
  | 'die'
  | 'transform-in'
  | 'transform-out'
  | 'skull';
export interface SkeletonConfig {
  speed: number;
  attackPower: () => number;
  chaseDistance: number;
  attackDistance: number;
  maxHealth: number;
  dynamicDormancyDuration: number;
  dormancyCooldown: number;
  dormancyProbability: number;
  etherealFormThreshold: number;
  etherealFormProbability: number;
  lastDormantAt: number;
  dormancyStartedAt: number;
  minDormancyDuration: number;
  maxDormancyDuration: number;
  lightColor: number;
  lightRadius: number;
  lightIntensity: number;
}
export type SkeletonState = 'roam' | 'chase' | 'attack' | 'fly';

export class Skeleton {
  id: string;
  config: SkeletonConfig = {
    speed: 1,
    attackPower: () => rand(6, 12),
    chaseDistance: 200,
    attackDistance: 45,
    maxHealth: 30,
    dynamicDormancyDuration: rand(3000, 7000),
    minDormancyDuration: 3000,
    maxDormancyDuration: 7000,
    dormancyCooldown: rand(3000, 5000),
    dormancyProbability: rand(0.35, 0.55),
    etherealFormThreshold: 0.25,
    etherealFormProbability: /* rand(0.2, 0.3) */ 1,
    lastDormantAt: -1,
    dormancyStartedAt: -1,
    lightColor: 0xee4b2b,
    lightRadius: 65,
    lightIntensity: 0.9,
  };
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<SkeletonAnimationType, Animations.Animation | false>;
  flags: {
    isHurting: boolean;
    isDead: boolean;
    isDestroyed: boolean;
    isDormant: boolean;
    isTransforming: 'in' | 'out' | false;
  } = {
    isHurting: false,
    isDead: false,
    isDestroyed: false,
    isDormant: false,
    isTransforming: false,
  };
  controller: {
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
  };
  health = this.config.maxHealth;
  state: SkeletonState = 'roam';
  ui: { healthBar: GameObjects.Graphics };
  get direction(): number {
    return this.sprite.flipX ? -1 : 1;
  }
  set direction(value: number) {
    this.sprite.flipX = value === -1;
  }
  path: DeterministicRandomPath;
  pathOrigin: { x: number; y: number };
  pathTS: number;
  inPos: { x: number; y: number };
  outPos: { x: number; y: number };
  prevPathX: number;
  light: AnimatedLight;

  constructor(
    public game: Game,
    public pos: Types.Math.Vector2Like,
  ) {
    this.id = luid();
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();
    this.setUI();
    this.setLight();

    (this.sprite as any).isDestroyable = (body: MatterJS.BodyType) => body === this.body;
    this.sprite.anims.play('idle');
  }

  private setLight() {
    this.light = new AnimatedLight(
      this.game,
      this.game.lights.addLight(this.sprite.x, this.sprite.y, this.config.lightRadius, this.config.lightColor, 0),
      { radius: this.config.lightRadius, intensity: this.config.lightIntensity },
    );
  }
  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'skeleton');
    this.sprite.setPipeline('Light2D');
    this.sprite.name = `skeleton-${this.id}`;
  }
  private setPhysics() {
    const w = this.sprite.width;
    const h = this.sprite.height;
    this.controller = {
      sensors: {
        left: this.game.matter.bodies.rectangle(0, w / 2, 5, 10, { isSensor: true }),
        right: this.game.matter.bodies.rectangle(w, w / 2, 5, 10, { isSensor: true }),
        bottomLeft: this.game.matter.bodies.rectangle(w * 0.25, w - 2.5, 10, 5, { isSensor: true }),
        bottomRight: this.game.matter.bodies.rectangle(w * 0.75, w - 2.5, 10, 5, { isSensor: true }),
      },
      numOfTouchingSurfaces: { left: 0, right: 0, bottomLeft: 0, bottomRight: 0 },
      blocked: { left: false, right: false, bottomLeft: false, bottomRight: false },
    };

    this.body = this.game.matter.bodies.rectangle(w / 2, w / 2 + 7, w / 3, h / 1.5);
    (this.body as any).props = { destroyable: true };

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

    this.sprite.setExistingBody(compoundBody).setPosition(this.pos.x, this.pos.y).setFixedRotation();
  }
  private setAnimations() {
    const idle = this.sprite.anims.create({
      key: 'idle',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', { start: 0, end: 3 }),
      frameRate: 6,
      repeat: -1,
    });
    const move = this.sprite.anims.create({
      key: 'move',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', { start: 8, end: 11 }),
      frameRate: 8,
      repeat: -1,
    });
    const attack = this.sprite.anims.create({
      key: 'attack',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', { start: 16, end: 19 }),
      frameRate: 17,
      repeat: 0,
    });
    const hurt = this.sprite.anims.create({
      key: 'hurt',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', { start: 24, end: 26 }),
      frameRate: 8,
      repeat: 0,
    });
    const die = this.sprite.anims.create({
      key: 'die',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', { start: 24, end: 30 }),
      frameRate: 15,
      repeat: 0,
    });
    const transformIn = this.sprite.anims.create({
      key: 'transform-in',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', { start: 32, end: 37 }),
      frameRate: 14,
      repeat: 0,
    });
    const transformOut = this.sprite.anims.create({
      key: 'transform-out',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', {
        frames: [37, 36, 35, 34, 33, 32],
      }),
      frameRate: 14,
      repeat: 0,
    });
    const skull = this.sprite.anims.create({
      key: 'skull',
      frames: this.sprite.anims.generateFrameNumbers('skeleton', {
        start: 37,
        end: 38,
      }),
      frameRate: 16,
      repeat: -1,
    });

    this.animations = {
      idle,
      move,
      attack,
      hurt,
      die,
      'transform-in': transformIn,
      'transform-out': transformOut,
      skull,
    };
  }
  private setHandlers() {
    this.game.matter.world.on(Physics.Matter.Events.BEFORE_UPDATE, (event: { delta: number; timestamp: number }) =>
      this.beforeUpdate(event.delta, event.timestamp),
    );
    this.game.matter.world.on(
      Physics.Matter.Events.COLLISION_ACTIVE,
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) => this.collisionActive(event),
    );
    this.game.matter.world.on(Physics.Matter.Events.AFTER_UPDATE, (event: { delta: number; timestamp: number }) =>
      this.afterUpdate(event.delta, event.timestamp),
    );
  }
  private setUI() {
    const healthBar = this.game.add.graphics();
    this.ui = { healthBar };
  }
  private updateUI() {
    if (this.flags.isDestroyed) return;

    this.ui.healthBar.x = this.sprite.x - 15;
    this.ui.healthBar.y = this.sprite.y - this.sprite.height / 2;
    this.ui.healthBar.clear();
    this.ui.healthBar.lineStyle(1, 0xffffff);
    this.ui.healthBar.strokeRect(0, 0, 30, 4);
    const normHealth = normalize(this.health, 0, this.config.maxHealth);
    this.ui.healthBar.fillStyle(normHealth >= 0.75 ? 0x00ff00 : normHealth >= 0.25 ? 0xffff00 : 0xff0000);
    this.ui.healthBar.fillRect(1, 1, denormalize(normalize(this.health, 0, this.config.maxHealth), 0, 28), 2);
  }

  private beforeUpdate(_delta: number, time: number) {
    this.updateUI();

    if (this.flags.isDead && !this.flags.isDestroyed && this.state === 'fly') {
      this.sprite.setPosition(this.outPos.x, this.outPos.y - this.sprite.height / 1.5);
    }
    if (this.flags.isHurting || this.flags.isDead) return;

    this.light.source.x = this.sprite.x;
    this.light.source.y = this.sprite.y;
    const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);

    if (this.state !== 'fly' && !this.flags.isTransforming) {
      if (distanceToPlayer <= this.config.chaseDistance && !this.game.player.flags.isDead) {
        this.state = 'chase';
        if (this.flags.isDormant) {
          this.flags.isDormant = false;
          this.config.lastDormantAt = time;
        }
      } else {
        this.state = 'roam';
      }

      this.applyInputs(time);
    } else if (!this.flags.isTransforming) {
      if (distanceToPlayer > 750) {
        this.transform('out', time);
      } else {
        this.fly(time);
      }
    } else if (this.flags.isTransforming === 'out') {
      this.sprite.setPosition(this.inPos.x, this.inPos.y - this.sprite.height / 1.5);
    }

    this.controller.numOfTouchingSurfaces.left = 0;
    this.controller.numOfTouchingSurfaces.right = 0;
    this.controller.numOfTouchingSurfaces.bottomLeft = 0;
    this.controller.numOfTouchingSurfaces.bottomRight = 0;
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) {
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
        } else if (bodyA.gameObject?.texture?.key === 'fireball' || bodyB.gameObject?.texture?.key === 'fireball') {
          const fireballGO = (
            bodyA.gameObject?.texture?.key === 'fireball' ? bodyA.gameObject : bodyB.gameObject
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
      }
    }
  }
  private afterUpdate(_delta: number, _time: number) {
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

    if (this.flags.isDormant && time - this.config.dormancyStartedAt > this.config.dynamicDormancyDuration) {
      this.flags.isDormant = false;
      this.config.lastDormantAt = time;
      this.direction = choose([-1, 1]);
    }

    // If roaming or chasing, move around
    if ((this.state === 'roam' || this.state === 'chase') && !this.flags.isDormant) {
      if (
        this.state === 'roam' &&
        time - this.config.lastDormantAt > this.config.dormancyCooldown &&
        chance(this.config.dormancyProbability)
      ) {
        this.flags.isDormant = true;
        this.config.dormancyStartedAt = time;
        this.config.dynamicDormancyDuration = rand(this.config.minDormancyDuration, this.config.maxDormancyDuration);
        this.sprite.anims.play('idle', true);
        return;
      }

      let canMove = this.controller.blocked.bottomRight || this.controller.blocked.bottomLeft;
      if (canMove) {
        this.move();
      }
      if (
        ((this.direction === 1 && !this.controller.blocked.bottomRight) ||
          (this.direction === -1 && !this.controller.blocked.bottomLeft)) &&
        canMove &&
        this.state !== 'chase'
      ) {
        this.direction = this.direction * -1;
      }
    }
  }

  private move() {
    if (
      this.state === 'chase' &&
      ((this.direction === 1 && !this.controller.blocked.bottomRight) ||
        (this.direction === -1 && !this.controller.blocked.bottomLeft))
    ) {
      this.sprite.anims.play('idle', true);
    } else {
      this.sprite.anims.play('move', true);
      this.sprite.setVelocity(this.direction * this.config.speed, 0);
    }
  }
  private attack() {
    if (this.state === 'attack') return;
    else if (this.state === 'fly') {
      this.game.player.hit(this.config.attackPower(), this.direction, this.sprite.name);
    } else {
      this.state = 'attack';
      this.sprite.anims.play('attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => (this.state = 'roam'));
      this.game.player.hit(this.config.attackPower(), this.direction, this.sprite.name);
    }
  }
  private fly(time: number) {
    if (this.flags.isDead) return;
    if (this.game.player.flags.isDead) {
      this.transform('out', time);
      return;
    }

    this.prevPathX = this.sprite.x;
    const newPos = this.path.next(time - this.pathTS);
    this.sprite.x = this.pathOrigin.x + newPos.x;
    this.sprite.y = this.pathOrigin.y + newPos.y;
    this.direction = Math.sign(this.sprite.x - this.prevPathX);

    this.pathOrigin.x += Math.sign(this.game.player.x - this.pathOrigin.x) * 0.75;
    this.pathOrigin.y += Math.sign(this.game.player.y - this.pathOrigin.y) * 0.75;
  }
  private transform(dir: 'in' | 'out', time?: number) {
    this.flags.isTransforming = dir;
    if (dir === 'in') {
      this.inPos = { x: this.sprite.x, y: this.sprite.y };
    } else {
      this.outPos = { x: this.sprite.x, y: this.sprite.y };
    }
    this.sprite.anims.play(`transform-${dir}`).once(Animations.Events.ANIMATION_COMPLETE, () => {
      if ((this.flags.isTransforming as any) === 'in') {
        this.state = 'fly';
        this.game.lightsOff();
        this.light.on();
        this.body.isSensor = true;
        this.pathOrigin = { x: this.sprite.x, y: this.sprite.y };
        this.path = new DeterministicRandomPath({ x: this.sprite.x, y: this.sprite.y }, 150, 150, 150);
        this.pathTS = time ?? 0;
      } else {
        this.state = 'roam';
        this.game.lightsOn();
        this.light.off();
        this.body.isSensor = false;
      }
      this.sprite.anims.play(dir === 'in' ? 'skull' : 'idle');
      this.flags.isTransforming = false;
    });
  }
  hit(time: number, fireball?: Fireball) {
    if (!fireball) return;

    this.direction = fireball.direction * -1;

    this.health = clampLow(this.health - fireball.config.power, 0);
    if (this.health === 0) {
      this.die();
    } else {
      this.hurt();
      if (
        normalize(this.health, 0, this.config.maxHealth) <= this.config.etherealFormThreshold &&
        chance(this.config.etherealFormProbability)
      ) {
        this.transform('in', time);
      }
    }
  }
  private hurt() {
    this.flags.isHurting = true;
    this.sprite.setVelocity(this.direction * -1 * 2, -3);
    this.sprite.anims.play('hurt').once(Animations.Events.ANIMATION_COMPLETE, () => {
      this.flags.isHurting = false;
      this.sprite.anims.play('idle');
    });
  }
  private die() {
    if (this.flags.isDead) return;

    if (!this.game.lightState) {
      this.outPos = { x: this.sprite.x, y: this.sprite.y };
      this.game.lightsOn();
      this.light.off();
    }
    this.flags.isDead = true;
    this.game.lights.removeLight(this.light.source);
    (this.sprite.body as MatterJS.BodyType).isSensor = true;
    this.sprite.anims.play('die').once(Animations.Events.ANIMATION_COMPLETE, () => this.destroy());
  }
  destroy() {
    this.flags.isDestroyed = true;
    this.sprite.destroy();
    this.ui.healthBar.destroy();
  }
}
