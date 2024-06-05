import { Animations, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { luid } from '../utils';

type CoinAnimationType = 'spin';

export class Coin {
  id: string;
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<CoinAnimationType, Animations.Animation | false>;
  flags: { isDestroyed: boolean } = { isDestroyed: false };

  constructor(
    public game: Game,
    public pos: Types.Math.Vector2Like,
    public type: 'gold' | 'silver' | 'bronze',
  ) {
    this.id = luid();
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();

    (this.sprite as any).isDestroyable = () => false;
    this.sprite.anims.play('spin');
  }

  private getStartFrame() {
    if (this.type === 'gold') return 0;
    else if (this.type === 'silver') return 8;
    return 16;
  }
  private getEndFrame() {
    if (this.type === 'gold') return 7;
    else if (this.type === 'silver') return 15;
    return 23;
  }
  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'coins');
    this.sprite.setPipeline('Light2D');
    this.sprite.name = `coin-${this.id}`;
  }
  private setPhysics() {
    const w = this.sprite.width;
    this.body = this.game.matter.bodies.circle(w / 4, w / 4, w / 4, { isSensor: true, isStatic: true });
    this.sprite.setExistingBody(this.body).setFixedRotation().setPosition(this.pos.x, this.pos.y);
  }
  private setAnimations() {
    const spin = this.sprite.anims.create({
      key: 'spin',
      frames: this.sprite.anims.generateFrameNumbers('coins', {
        start: this.getStartFrame(),
        end: this.getEndFrame(),
      }),
      frameRate: 12,
      repeat: -1,
    });

    this.animations = { spin };
  }
  private setHandlers() {
    this.game.matter.world.on(
      Physics.Matter.Events.COLLISION_ACTIVE,
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) => this.collisionActive(event),
    );
  }

  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[] }) {
    if (this.flags.isDestroyed) return;

    const player = this.game.player.controller.sprite;

    for (let i = 0; i < event.pairs.length; i += 1) {
      const [bodyA, bodyB] = [event.pairs[i].bodyA, event.pairs[i].bodyB];
      if (
        (bodyA === this.body || bodyB === this.body) &&
        (bodyA.gameObject === player || bodyB.gameObject === player)
      ) {
        this.acquire();
        continue;
      }
    }
  }

  acquire() {
    this.game.scoreKeeper.coinCollected(this.type);
    this.destroy();
  }
  destroy() {
    this.flags.isDestroyed = true;
    this.sprite.destroy();
  }
}
