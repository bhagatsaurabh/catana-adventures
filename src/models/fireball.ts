import { Animations, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { luid } from '../utils';

export type FireballAnimationType = 'move' | 'explode';
export interface FireballConfig {
  speed: number;
  power: number;
}

export class Fireball {
  id: string;
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<FireballAnimationType, Animations.Animation | false>;
  config: FireballConfig = { speed: 6.5, power: 0 };
  isDestroyed = false;

  constructor(
    public game: Game,
    public type: 'low' | 'high',
  ) {
    this.id = luid();
    this.config.power = type === 'low' ? 5 : 10;
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();

    this.sprite.anims.play('move', true);

    this.game.objects.fireballs[this.id] = this;
  }

  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'fireball');
    this.sprite.name = this.id;

    const w = this.sprite.width;
    const h = this.sprite.height;

    if (this.type === 'low') {
      this.body = this.game.matter.bodies.rectangle(0, 0, w, h / 2, { isSensor: true });
    } else {
      this.body = this.game.matter.bodies.rectangle(0, 0, w, h / 2, { isSensor: true });
    }
  }
  private setPhysics() {
    const compoundBody = this.game.matter.body.create({ parts: [this.body], frictionAir: 0 });

    this.sprite.flipX = this.game.player.controller.sprite.flipX;
    this.sprite
      .setExistingBody(compoundBody)
      .setFixedRotation()
      .setPosition(
        this.game.player.x + (this.sprite.flipX ? -25 : 25),
        this.game.player.y - this.game.player.controller.sprite.height / 1.5,
      )
      .setIgnoreGravity(true);
  }
  private setAnimations() {
    const move = this.sprite.anims.create({
      key: 'move',
      frames: this.sprite.anims.generateFrameNumbers('fireball', {
        start: this.type === 'low' ? 0 : 7,
        end: this.type === 'low' ? 3 : 10,
      }),
      frameRate: 24,
      repeat: -1,
    });
    const explode = this.sprite.anims.create({
      key: 'explode',
      frames: this.sprite.anims.generateFrameNumbers('fireball', {
        start: this.type === 'low' ? 4 : 11,
        end: this.type === 'low' ? 6 : 13,
      }),
      frameRate: 20,
      repeat: 0,
    });

    this.animations = {
      move,
      explode,
    };
  }
  private setHandlers() {
    this.sprite.setVelocityX(this.sprite.flipX ? -this.config.speed : this.config.speed);
    this.game.matter.world.on(
      Physics.Matter.Events.COLLISION_ACTIVE,
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) => this.onCollide(event),
    );
  }
  private onCollide(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    if (this.isDestroyed) return;

    for (let i = 0; i < event.pairs.length; i += 1) {
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];

      if (bodyA === this.body || bodyB === this.body) {
        const fireballBody = bodyA === this.body ? bodyA : bodyB;
        const otherBody = bodyA === fireballBody ? bodyB : bodyA;

        if (otherBody.gameObject?.texture?.key !== 'neko' && !this.isDestroyed) {
          this.explode();
        }
      }
      continue;
    }
  }

  private explode() {
    this.isDestroyed = true;
    this.sprite.setVelocityX(0);
    this.sprite.anims.play('explode', true).once(Animations.Events.ANIMATION_COMPLETE, () => this.destroy());
    return;
  }

  destroy() {
    delete this.game.objects.fireballs[this.id];
    this.sprite.destroy();
  }
}
