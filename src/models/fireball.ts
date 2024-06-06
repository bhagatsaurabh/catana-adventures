import { Animations, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { luid } from '../utils';
import { AnimatedLight } from '../helpers/animated-light';

export type FireballAnimationType = 'move' | 'explode';
export interface FireballConfig {
  speed: number;
  power: number;
  lightRadius: number;
  lightIntensity: number;
  lightColor: number;
}

export class Fireball {
  id: string;
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<FireballAnimationType, Animations.Animation | false>;
  config: FireballConfig = { speed: 6.5, power: 0, lightRadius: 75, lightIntensity: 1.5, lightColor: 0xffe808 };
  isDestroyed = false;
  light: AnimatedLight;

  get direction(): number {
    return this.sprite.flipX ? -1 : 1;
  }
  set direction(value: number) {
    this.sprite.flipX = value === -1;
  }

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
    this.setLight();

    this.sprite.anims.play('move', true);

    this.game.objects.fireballs[this.sprite.name] = this;
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
    this.sprite = this.game.matter.add.sprite(0, 0, 'fireball');
    this.sprite.setPipeline('Light2D');
    this.sprite.name = `fireball-${this.id}`;

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

    this.direction = this.game.player.direction;
    this.sprite
      .setExistingBody(compoundBody)
      .setFixedRotation()
      .setPosition(
        this.game.player.x + this.direction * 25,
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
    this.sprite.setVelocityX(this.direction * this.config.speed);
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
        const fireballBody = bodyA === this.body ? bodyA : bodyB;
        const otherBody = bodyA === fireballBody ? bodyB : bodyA;

        if (!this.isDestroyed && (otherBody.gameObject?.isDestroyable?.(otherBody) || otherBody.gameObject?.tile)) {
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
    delete this.game.objects.fireballs[this.sprite.name];
    this.sprite.destroy();
  }
}
