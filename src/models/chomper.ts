import { Animations, GameObjects, Math as M, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { clampLow, denormalize, normalize, rand } from '../utils';
import { Fireball } from './fireball';

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

export class Chomper {
  config: ChomperConfig = {
    speed: 2,
    attackPower: () => rand(6, 12),
    jumpPower: 3,
    jumpCooldown: 1000,
    leapDistance: 37,
    chaseDistance: 128,
    attackDistance: 45,
    maxHealth: 20,
  };
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<ChomperAnimationType, Animations.Animation | false>;
  isDead = false;
  isDestroyed = false;
  isHurting = false;
  direction = 1;
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
    lastJumpedAt: number;
  };
  health = this.config.maxHealth;
  state: ChomperState = 'roam';
  ui: { healthBar: GameObjects.Graphics };

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
    this.sprite = this.game.matter.add.sprite(0, 0, 'chomper');
  }
  private setPhysics() {
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

    this.sprite.setExistingBody(compoundBody).setPosition(this.pos.x, this.pos.y).setFixedRotation();
  }
  private setAnimations() {
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

    if (this.isHurting || this.isDead) return;

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
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    if (this.isHurting || this.isDead) return;

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
    if (this.isHurting || this.isDead) return;

    this.controller.blocked.right = this.controller.numOfTouchingSurfaces.right > 0 ? true : false;
    this.controller.blocked.left = this.controller.numOfTouchingSurfaces.left > 0 ? true : false;
    this.controller.blocked.bottomLeft = this.controller.numOfTouchingSurfaces.bottomLeft > 0 ? true : false;
    this.controller.blocked.bottomRight = this.controller.numOfTouchingSurfaces.bottomRight > 0 ? true : false;
  }

  private applyInputs(time: number) {
    // If chasing or attacking, always face the player
    if (this.state === 'chase' || this.state === 'attack') {
      this.direction = Math.sign(this.game.player.x - this.sprite.x);
      this.sprite.flipX = this.direction === -1;
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
          this.direction = this.direction === -1 ? 1 : -1;
          this.sprite.flipX = this.direction === -1;
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

    this.direction = fireball.sprite.flipX ? 1 : -1;
    this.sprite.flipX = this.direction === -1;

    this.health = clampLow(this.health - fireball.config.power, 0);
    if (this.health === 0) {
      this.die();
    } else {
      this.hurt();
    }
  }
  private hurt() {
    this.isHurting = true;
    this.sprite.setVelocity(this.direction * -1 * 2, -3);
    this.sprite.anims.play('hurt').once(Animations.Events.ANIMATION_COMPLETE, () => (this.isHurting = false));
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
