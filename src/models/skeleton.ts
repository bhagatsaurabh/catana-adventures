import { Animations, GameObjects, Math as M, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { chance, choose, clampLow, denormalize, normalize, rand } from '../utils';
import { Fireball } from './fireball';

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
}
export type SkeletonState = 'roam' | 'chase' | 'attack' | 'fly';

export class Skeleton {
  config: SkeletonConfig = {
    speed: 1,
    attackPower: () => rand(6, 12),
    chaseDistance: 200,
    attackDistance: 45,
    maxHealth: 30,
    dynamicDormancyDuration: 3000,
    dormancyCooldown: 4000,
    dormancyProbability: 0.45,
    etherealFormThreshold: 0.25,
    etherealFormProbability: 0.2,
    lastDormantAt: -1,
    dormancyStartedAt: -1,
    minDormancyDuration: 3000,
    maxDormancyDuration: 7000,
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
  lastPos: { x: number; y: number } = { x: 0, y: 0 };
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

  constructor(
    public game: Game,
    public pos: Types.Math.Vector2Like,
  ) {
    this.lastPos = { x: pos.x, y: pos.y };
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();
    this.setUI();

    (this.sprite as any).isDestroyable = (body: MatterJS.BodyType) => body === this.body;
    this.sprite.anims.play('idle');
  }

  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'skeleton');
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
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) => this.collisionActive(event),
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

    if (!this.flags.isHurting && !this.flags.isDead && this.state !== 'fly') {
      const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
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
    }

    this.controller.numOfTouchingSurfaces.left = 0;
    this.controller.numOfTouchingSurfaces.right = 0;
    this.controller.numOfTouchingSurfaces.bottomLeft = 0;
    this.controller.numOfTouchingSurfaces.bottomRight = 0;
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    if (this.flags.isHurting || this.flags.isDead || this.state === 'fly') return;

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
          this.hit(this.game.objects.fireballs[fireballGO.name]);
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

    this.state = 'attack';

    this.sprite.anims.play('attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => (this.state = 'roam'));
    this.game.player.hit(this.config.attackPower(), this.direction);
  }
  private transform(dir: 'in' | 'out') {
    this.flags.isTransforming = dir;
    this.sprite.anims.play(`transform-${dir}`).once(Animations.Events.ANIMATION_COMPLETE, () => {
      this.flags.isTransforming = false;
      if (dir === 'in') {
        setTimeout(() => this.transform('out'), 4000);
        this.state = 'fly';
        this.body.isSensor = true;
      } else {
        this.body.isSensor = false;
      }
      this.sprite.anims.play(dir === 'in' ? 'skull' : 'idle');
    });
  }
  hit(fireball?: Fireball) {
    if (!fireball) return;

    this.direction = fireball.direction * -1;

    this.health = clampLow(this.health - fireball.config.power, 0);
    if (this.health === 0) {
      this.die();
    } else {
      this.hurt();
      if (normalize(this.health, 0, this.config.maxHealth) <= this.config.etherealFormThreshold) {
        this.transform('in');
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

    (this.sprite.body as MatterJS.BodyType).isSensor = true;
    this.flags.isDead = true;
    this.sprite.anims.play('die').once(Animations.Events.ANIMATION_COMPLETE, () => this.destroy());
  }
  destroy() {
    this.flags.isDestroyed = true;
    this.sprite.destroy();
    this.ui.healthBar.destroy();
  }
}
