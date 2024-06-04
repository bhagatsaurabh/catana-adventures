import { Animations, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { luid } from '../utils';
import { AnimatedLight } from '../helpers/animated-light';

export type BelchAnimationType = 'move' | 'explode';
export interface BelchConfig {
  speed: number;
  power: number;
  lightRadius: number;
  lightIntensity: number;
  lightColor: number;
}

export class Belch {
  id: string;
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<BelchAnimationType, Animations.Animation | false>;
  config: BelchConfig = { speed: 7.5, power: 0, lightRadius: 50, lightIntensity: 1.25, lightColor: 0xafe1af };
  isDestroyed = false;
  light: AnimatedLight;

  constructor(
    public game: Game,
    public direction: number,
    pos: Types.Math.Vector2Like,
    power: number,
  ) {
    this.id = luid();
    this.config.power = power;
    this.setSprite();
    this.setPhysics(pos);
    this.setAnimations();
    this.setHandlers();
    this.setLight();

    (this.sprite as any).isDestroyable = (body: MatterJS.BodyType) => body === this.body;
    this.sprite.anims.play('move', true);

    this.game.objects.belches[this.id] = this;
  }

  private setLight() {
    this.light = new AnimatedLight(
      this.game,
      this.game.lights.addLight(
        this.sprite.x,
        this.sprite.y,
        this.config.lightRadius,
        this.config.lightColor,
        this.game.lightState ? 0 : this.config.lightIntensity,
      ),
      { radius: this.config.lightRadius, intensity: this.config.lightIntensity },
    );
  }
  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'belch');
    this.sprite.setPipeline('Light2D');
    this.sprite.name = this.id;

    const w = this.sprite.width;
    const h = this.sprite.height;

    this.body = this.game.matter.bodies.rectangle(0, 0, w / 2, h / 2, { isSensor: true });
  }
  private setPhysics(pos: Types.Math.Vector2Like) {
    const compoundBody = this.game.matter.body.create({ parts: [this.body], frictionAir: 0 });

    this.sprite.flipX = this.direction === -1;
    this.sprite
      .setExistingBody(compoundBody)
      .setFixedRotation()
      .setPosition(pos.x + (this.sprite.flipX ? -20 : 20), pos.y)
      .setIgnoreGravity(true);
  }
  private setAnimations() {
    const move = this.sprite.anims.create({
      key: 'move',
      frames: this.sprite.anims.generateFrameNumbers('belch', {
        frames: [5, 4, 3],
      }),
      frameRate: 24,
      repeat: -1,
    });
    const explode = this.sprite.anims.create({
      key: 'explode',
      frames: this.sprite.anims.generateFrameNumbers('belch', {
        frames: [2, 1, 0],
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
    this.game.matter.world.on(Physics.Matter.Events.BEFORE_UPDATE, (event: { delta: number; timestamp: number }) =>
      this.beforeUpdate(event.delta, event.timestamp),
    );
    this.game.matter.world.on(
      Physics.Matter.Events.COLLISION_ACTIVE,
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) => this.onCollide(event),
    );
  }
  private beforeUpdate(_delta: number, _time: number) {
    if (this.isDestroyed) return;

    this.light.source.x = this.sprite.x;
    this.light.source.y = this.sprite.y;
  }
  private onCollide(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    if (this.isDestroyed) return;

    for (let i = 0; i < event.pairs.length; i += 1) {
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];

      if (bodyA === this.body || bodyB === this.body) {
        const belchBody = bodyA === this.body ? bodyA : bodyB;
        const otherBody = bodyA === belchBody ? bodyB : bodyA;

        if (otherBody.gameObject?.texture?.key !== 'demon-flower' && !this.isDestroyed) {
          this.explode();
        }
      }
      continue;
    }
  }

  private explode() {
    this.isDestroyed = true;
    this.game.lights.removeLight(this.light.source);
    this.sprite.setVelocityX(0);
    this.sprite.anims.play('explode', true).once(Animations.Events.ANIMATION_COMPLETE, () => this.destroy());
    return;
  }

  destroy() {
    delete this.game.objects.belches[this.id];
    this.sprite.destroy();
  }
}
