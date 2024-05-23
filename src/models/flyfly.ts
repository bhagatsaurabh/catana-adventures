import { Animations, GameObjects, Math as M, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { denormalize, normalize, rand } from '../utils';
import { Fireball } from './fireball';

export type FlyFlyAnimationType = 'idle' | 'bite' | 'die';
export interface FlyFlyConfig {
  speed: number;
  attackPower: () => number;
  chaseDistance: number;
  attackDistance: number;
  maxHealth: number;
}
export type FlyFlyState = 'roam' | 'chase' | 'attack';

export class FlyFly {
  config: FlyFlyConfig = {
    speed: 2,
    attackPower: () => rand(6, 12),
    chaseDistance: 128,
    attackDistance: 45,
    maxHealth: 20,
  };
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<FlyFlyAnimationType, Animations.Animation | false>;
  isDead = false;
  isDestroyed = false;
  lastPos: { x: number; y: number } = { x: 0, y: 0 };
  controller: {
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
  health = this.config.maxHealth;
  state: FlyFlyState = 'roam';
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

    this.sprite.anims.play('idle');
  }

  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'flyfly');
  }
  private setPhysics() {
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

    this.body = this.game.matter.bodies.circle(w / 2, w / 2, w / 2 - 3);

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
      restitution: 0.05,
    });

    this.sprite.setExistingBody(compoundBody).setPosition(this.pos.x, this.pos.y).setFixedRotation();
  }
  private setAnimations() {
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
    if (this.isDestroyed) return;

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

    if (this.isDead) return;

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
    this.controller.numOfTouchingSurfaces.top = 0;
    this.controller.numOfTouchingSurfaces.bottom = 0;
    this.controller.numOfTouchingSurfaces.topLeft = 0;
    this.controller.numOfTouchingSurfaces.topRight = 0;
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    if (this.isDead) return;

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
    if (this.isDead) return;

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
          this.direction = this.direction * -1;
        }
        if (time - this.controller.lastJumpedAt >= this.config.jumpCooldown) {
          // console.log(Math.Distance.Between(this.sprite.x, this.sprite.y, this.lastPos.x, this.lastPos.y));
          this.lastPos = { x: this.sprite.x, y: this.sprite.y };
          this.move();
          this.controller.lastJumpedAt = time;
        }
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
    this.game.player.hit(this.config.attackPower(), this.direction);
  }
  hit(fireball?: Fireball) {
    if (!fireball) return;

    this.direction = fireball.direction * -1;

    this.health = 0;
    this.die();
  }
  private die() {
    if (this.isDead) return;

    (this.sprite.body as MatterJS.BodyType).isSensor = true;
    this.isDead = true;
    this.sprite.anims.play('die').once(Animations.Events.ANIMATION_COMPLETE, () => this.destroy());
  }
  destroy() {
    this.isDestroyed = true;
    this.sprite.destroy();
    this.ui.healthBar.destroy();
  }
}
