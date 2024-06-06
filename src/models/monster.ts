import { Animations, GameObjects, Physics, Types } from 'phaser';
import { Game } from '../scenes/game';
import { denormalize, luid, normalize } from '../utils';
import { Fireball } from './fireball';

export type MonsterType = 'chomper' | 'demon-flower' | 'flyfly' | 'skeleton';
export interface MonsterConfig {
  maxHealth: number;
}
export interface MonsterFlags {
  isHurting: boolean;
  isDead: boolean;
  isDisposed: boolean;
}

export abstract class Monster<C extends MonsterConfig, S extends string, F extends MonsterFlags, A extends string> {
  id: string;
  animations: Record<A, Animations.Animation | false>;
  sprite: Physics.Matter.Sprite;
  body: MatterJS.BodyType;
  health: number;
  ui: { healthBar: GameObjects.Graphics };
  flags: F;
  stats: { noOfPowerAttacks: number; noOfFastAttacks: number } = { noOfPowerAttacks: 0, noOfFastAttacks: 0 };
  controller?: any;

  get direction(): number {
    return this.sprite.flipX ? -1 : 1;
  }
  set direction(value: number) {
    this.sprite.flipX = value === -1;
  }

  constructor(
    public game: Game,
    public type: MonsterType,
    public spawnPos: Types.Math.Vector2Like,
    public state: S,
    public config: C,
    defaultAnimation: A,
  ) {
    this.id = luid();
    this.flags = { isDead: false, isDisposed: false, isHurting: false } as F;
    this.health = this.config.maxHealth;
    this.setSprite();
    this.setPhysics();
    this.setAnimations();
    this.setHandlers();
    this.setUI();

    (this.sprite as any).isDestroyable = (body: MatterJS.BodyType) => body === this.body;
    this.sprite.anims.play(defaultAnimation);
  }

  private setUI() {
    const healthBar = this.game.add.graphics();
    this.ui = { healthBar };
  }
  private setSprite() {
    this.sprite = this.game.matter.add.sprite(0, 0, this.type);
    this.sprite.setPipeline('Light2D');
    this.sprite.name = `${this.type}-${this.id}`;
  }
  private updateUI() {
    if (this.flags.isDisposed) return;

    this.ui.healthBar.x = this.sprite.x - 15;
    this.ui.healthBar.y = this.sprite.y - this.sprite.height / 2;
    this.ui.healthBar.clear();
    this.ui.healthBar.lineStyle(1, 0xffffff);
    this.ui.healthBar.strokeRect(0, 0, 30, 4);
    const normHealth = normalize(this.health, 0, this.config.maxHealth);
    this.ui.healthBar.fillStyle(normHealth >= 0.75 ? 0x00ff00 : normHealth >= 0.25 ? 0xffff00 : 0xff0000);
    this.ui.healthBar.fillRect(1, 1, denormalize(normalize(this.health, 0, this.config.maxHealth), 0, 28), 2);
  }
  private setHandlers() {
    this.game.matter.world.on(Physics.Matter.Events.BEFORE_UPDATE, (event: { delta: number; timestamp: number }) => {
      this._beforeUpdate();
      this.beforeUpdate(event.delta, event.timestamp);
    });
    this.game.matter.world.on(
      Physics.Matter.Events.COLLISION_ACTIVE,
      (event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }) => this.collisionActive(event),
    );
    this.game.matter.world.on(Physics.Matter.Events.AFTER_UPDATE, (event: { delta: number; timestamp: number }) =>
      this.afterUpdate(event.delta, event.timestamp),
    );
  }
  private _beforeUpdate() {
    this.updateUI();
  }

  abstract setPhysics(): void;
  abstract setAnimations(): void;
  abstract hit(time: number, fireball?: Fireball): void;
  abstract hurt(time: number): void;
  abstract die(): void;
  abstract beforeUpdate(delta: number, time: number): void;
  abstract collisionActive(event: { pairs: Types.Physics.Matter.MatterCollisionPair[]; timestamp: number }): void;
  abstract afterUpdate(delta: number, time: number): void;

  dispose() {
    this.game.scoreKeeper.monsterKilled(this.type, this.stats);

    this.flags.isDisposed = true;
    this.sprite.destroy();
    this.ui.healthBar.destroy();
  }
}
