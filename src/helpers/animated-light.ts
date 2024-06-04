import { GameObjects, Tweens } from 'phaser';

import { Game } from '../scenes/game';

export class AnimatedLight {
  state = false;
  tweenOn: Tweens.Tween;
  tweenOff: Tweens.Tween;

  constructor(
    public game: Game,
    public source: GameObjects.Light,
    public config: { radius: number; intensity: number },
  ) {
    this.setTweens();
  }

  private setTweens() {
    this.tweenOn = this.game.tweens.add({
      targets: this.source,
      radius: this.config.radius,
      ease: 'Quintic.easeInOut',
      duration: 1000,
      repeat: 0,
      paused: true,
      onUpdate: (tween: Tweens.Tween) => {
        this.source.setIntensity(tween.totalProgress * this.config.intensity);
      },
    });
    this.tweenOff = this.game.tweens.add({
      targets: this.source,
      radius: this.config.radius,
      ease: 'Quintic.easeInOut',
      duration: 1000,
      repeat: 0,
      paused: true,
      onUpdate: (tween: Tweens.Tween) => {
        this.source.setIntensity((1 - tween.totalProgress) * this.config.intensity);
      },
    });
  }

  on() {
    if (this.state) return;
    this.state = true;
    this.tweenOn.play();
  }
  off() {
    if (!this.state) return;
    this.state = false;
    this.tweenOff.play();
  }
}
