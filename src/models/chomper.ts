import { Animations, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';

export type ChomperAnimationType = 'idle' | 'move' | 'bite' | 'die';
export interface ChomperConfig {
  speed: number;
  attackPower: number;
}

export class Chomper {
  config: ChomperConfig = { speed: 0.5, attackPower: 2 };
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<ChomperAnimationType, Animations.Animation | false>;
  isDead = false;
  direction = 1;
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

  constructor(
    public game: Game,
    public pos: Types.Math.Vector2Like,
  ) {
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();

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
      frameRate: 10,
      repeat: -1,
    });
    const bite = this.sprite.anims.create({
      key: 'bite',
      frames: this.sprite.anims.generateFrameNumbers('chomper', {
        start: 14,
        end: 19,
      }),
      frameRate: 24,
      repeat: 0,
    });
    const die = this.sprite.anims.create({
      key: 'die',
      frames: this.sprite.anims.generateFrameNumbers('chomper', {
        start: 21,
        end: 27,
      }),
      frameRate: 24,
      repeat: 0,
    });

    this.animations = {
      idle,
      move,
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

  private beforeUpdate(_delta: number, _time: number) {
    if (
      (this.direction === 1 && !this.controller.blocked.bottomRight) ||
      (this.direction === -1 && !this.controller.blocked.bottomLeft)
    ) {
      this.direction = this.direction === -1 ? 1 : -1;
      this.sprite.flipX = !this.sprite.flipX;
    }
    this.move();

    this.controller.numOfTouchingSurfaces.left = 0;
    this.controller.numOfTouchingSurfaces.right = 0;
    this.controller.numOfTouchingSurfaces.bottomLeft = 0;
    this.controller.numOfTouchingSurfaces.bottomRight = 0;
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    const left = this.controller.sensors.left;
    const right = this.controller.sensors.right;
    const bottomLeft = this.controller.sensors.bottomLeft;
    const bottomRight = this.controller.sensors.bottomRight;

    for (let i = 0; i < event.pairs.length; i += 1) {
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];

      if (bodyA === this.body || bodyB === this.body) {
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
    this.controller.blocked.right = this.controller.numOfTouchingSurfaces.right > 0 ? true : false;
    this.controller.blocked.left = this.controller.numOfTouchingSurfaces.left > 0 ? true : false;
    this.controller.blocked.bottomLeft = this.controller.numOfTouchingSurfaces.bottomLeft > 0 ? true : false;
    this.controller.blocked.bottomRight = this.controller.numOfTouchingSurfaces.bottomRight > 0 ? true : false;
  }

  private move() {
    this.sprite.anims.play('move', true);
    this.sprite.setVelocityX(this.direction * 0.5);
  }
}
