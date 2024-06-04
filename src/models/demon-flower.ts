import { Animations, GameObjects, Math as M, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { clampLow, denormalize, luid, normalize, rand } from '../utils';
import { Fireball } from './fireball';
import { Belch } from './belch';

interface DemonFlowerFlags {
  isAttacking: boolean;
  isBelching: boolean;
  isHurting: boolean;
  isDead: boolean;
  isDestroyed: boolean;
}
export type DemonFlowerAnimationType = 'idle' | 'attack' | 'belch-start' | 'belch-end' | 'hurt' | 'die';
export interface DemonFlowerConfig {
  belchSpeed: number;
  attackPower: () => number;
  senseDistance: number;
  attackDistance: number;
  belchTimestamp: number;
  belchCooldown: number;
  maxHealth: number;
}
export type DemonFlowerState = 'idle' | 'belch' | 'attack';

export class DemonFlower {
  id: string;
  config: DemonFlowerConfig = {
    belchSpeed: 4,
    attackPower: () => rand(12, 16),
    senseDistance: 192,
    attackDistance: 50,
    belchCooldown: 2000,
    belchTimestamp: 0,
    maxHealth: 30,
  };
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  animations: Record<DemonFlowerAnimationType, Animations.Animation | false>;
  flags: DemonFlowerFlags = {
    isAttacking: false,
    isBelching: false,
    isHurting: false,
    isDead: false,
    isDestroyed: false,
  };
  health = this.config.maxHealth;
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
    this.id = luid();
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();
    this.setUI();

    (this.sprite as any).isDestroyable = (body: MatterJS.BodyType) => body === this.body;
    this.sprite.anims.play('idle');
  }

  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, 'demon-flower');
    this.sprite.setPipeline('Light2D');
    this.sprite.name = `demonflower-${this.id}`;
  }
  private setPhysics() {
    const h = this.sprite.height;

    this.body = this.game.matter.bodies.circle(20, 20, h / 2.5, {
      isStatic: true,
      isSensor: true,
      restitution: 0.05,
      friction: 0,
    });

    this.sprite.setExistingBody(this.body).setPosition(this.pos.x, this.pos.y).setFixedRotation();
    this.game.matter.body.setCentre(this.body, { x: 2, y: -6 }, true);
  }
  private setAnimations() {
    const idle = this.sprite.anims.create({
      key: 'idle',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 0,
        end: 3,
      }),
      frameRate: 10,
      repeat: -1,
    });
    const attack = this.sprite.anims.create({
      key: 'attack',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 28,
        end: 32,
      }),
      frameRate: 13,
      repeat: 0,
    });
    const belchStart = this.sprite.anims.create({
      key: 'belch-start',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 42,
        end: 52,
      }),
      frameRate: 12,
      repeat: 0,
    });
    const belchEnd = this.sprite.anims.create({
      key: 'belch-end',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', {
        start: 53,
        end: 55,
      }),
      frameRate: 12,
      repeat: 0,
    });
    const hurt = this.sprite.anims.create({
      key: 'hurt',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', { start: 56, end: 58 }),
      frameRate: 12,
      repeat: 0,
    });
    const die = this.sprite.anims.create({
      key: 'die',
      frames: this.sprite.anims.generateFrameNumbers('demon-flower', { start: 56, end: 64 }),
      frameRate: 15,
      repeat: 0,
    });

    this.animations = {
      idle,
      attack,
      'belch-start': belchStart,
      'belch-end': belchEnd,
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
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) => this.collisionActive(event),
    );
  }
  private setUI() {
    const healthBar = this.game.add.graphics();
    this.ui = { healthBar };
  }
  private updateUI() {
    if (this.flags.isDestroyed) return;

    this.ui.healthBar.x = this.sprite.x - 10;
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

    if (this.flags.isHurting || this.flags.isDead) return;

    let state: DemonFlowerState = 'idle';
    const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
    if (distanceToPlayer <= this.config.senseDistance) {
      state = distanceToPlayer <= this.config.attackDistance ? 'attack' : 'belch';
    } else {
      state = 'idle';
    }

    this.applyInputs(time, state);
  }
  private collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) {
    if (this.flags.isHurting || this.flags.isDead) return;

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
      }
    }
  }

  private applyInputs(time: number, state: DemonFlowerState) {
    if (state === 'belch' || state === 'attack') {
      this.direction = Math.sign(this.game.player.x - this.sprite.x);
    }

    if (state === 'idle') {
      this.sprite.anims.play('idle', true);
      this.flags.isBelching = false;
      this.flags.isAttacking = false;
    }
    if (state === 'belch') {
      this.belch(time);
    } else if (state === 'attack') {
      this.attack();
    }
  }

  private attack() {
    if (this.flags.isAttacking) return;

    this.flags.isAttacking = true;

    this.sprite.anims.play('attack', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
      this.flags.isAttacking = false;
      if (this.flags.isDead) return;

      const distanceToPlayer = M.Distance.Between(this.sprite.x, this.sprite.y, this.game.player.x, this.game.player.y);
      if (distanceToPlayer <= this.config.attackDistance) {
        this.game.player.hit(this.config.attackPower(), this.direction * -1, this.sprite.name);
      }
    });
  }
  private belch(time: number) {
    if (this.flags.isBelching) return;
    if (time - this.config.belchTimestamp < this.config.belchCooldown) {
      this.sprite.anims.play('idle', true);
      return;
    }

    this.flags.isBelching = true;

    this.sprite.anims.play('belch-start', true).once(Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.flags.isDead) {
        this.flags.isBelching = false;
        return;
      }

      new Belch(this.game, this.direction, { x: this.sprite.x, y: this.sprite.y }, this.config.attackPower());
      this.config.belchTimestamp = time;
      this.sprite.anims
        .play('belch-end', true)
        .once(Animations.Events.ANIMATION_COMPLETE, () => (this.flags.isBelching = false));
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
    }
  }
  private hurt() {
    this.flags.isHurting = true;
    this.flags.isAttacking = false;
    this.flags.isBelching = false;
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
