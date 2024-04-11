import { Cameras, Scene, Tilemaps, Types } from 'phaser';
import { Player } from '../models/player';

export class Game extends Scene {
  camera: Cameras.Scene2D.Camera;
  cursors: Types.Input.Keyboard.CursorKeys;
  player: Player;
  map: Tilemaps.Tilemap;

  constructor() {
    super('game');
  }

  create() {
    this.map = this.add.tilemap('level-1-1');
    const landscapeTileset = this.map.addTilesetImage('Landscape', 'tiles-landscape')!;
    const groundLayer = this.map.createLayer('Landscape', landscapeTileset)!;

    // map.setCollisionBetween(1, 100000, true, undefined, groundLayer);

    groundLayer.setCollisionByProperty({ collides: true });
    this.matter.world.convertTilemapLayer(groundLayer);

    this.matter.set60Hz();
    this.matter.world.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);

    this.player = new Player(this);

    this.camera = this.cameras.main;
    this.camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
    this.camera.setBackgroundColor(0x00ff00);

    this.smoothMoveCameraTowards(this.player);

    this.input.once('pointerdown', () => {
      this.scene.start('gameover');
    });
    this.cursors = this.input.keyboard!.createCursorKeys();
    // this.smoothedControls = new SmoothedHorionztalControl(0.001);
  }

  update(_time: number, _delta: number) {
    const sprite = this.player.controller.sprite;
    if (!sprite) {
      return;
    }

    if (sprite.y > this.map.heightInPixels) {
      console.log('dead');
      sprite.destroy();
      // this.player.controller.sprite = null;
      // this.restart();
      return;
    }

    /* let oldVelocityX;
    let targetVelocityX;
    let newVelocityX;
    if (this.cursors.left.isDown && !this.player.controller.blocked.left) {
      this.smoothedControls.moveLeft(delta, this.playerController);
      sprite.anims.play('left', true);

      oldVelocityX = matterSprite.body.velocity.x;
      targetVelocityX = -this.playerController.speed.run;
      newVelocityX = Phaser.Math.Linear(oldVelocityX, targetVelocityX, -this.smoothedControls.value);

      matterSprite.setVelocityX(newVelocityX);
    } else if (this.cursors.right.isDown && !this.playerController.blocked.right) {
      this.smoothedControls.moveRight(delta);
      matterSprite.anims.play('right', true);

      // Lerp the velocity towards the max run using the smoothed controls. This simulates a
      // player controlled acceleration.
      oldVelocityX = matterSprite.body.velocity.x;
      targetVelocityX = this.playerController.speed.run;
      newVelocityX = Phaser.Math.Linear(oldVelocityX, targetVelocityX, this.smoothedControls.value);

      matterSprite.setVelocityX(newVelocityX);
    } else {
      this.smoothedControls.reset();
      matterSprite.anims.play('idle', true);
    } */

    /* const canJump = time - this.player.controller.lastJumpedAt > 250;
    console.log(this.player.controller.blocked.bottom);
    if (this.cursors.up.isDown && canJump && this.player.controller.blocked.bottom) {
      sprite.setVelocityY(-this.player.controller.speed.jump);
      this.player.controller.lastJumpedAt = time;
    } */

    this.smoothMoveCameraTowards(this.player, 0.9);
  }

  smoothMoveCameraTowards(target: Player, smoothFactor = 0) {
    this.camera.scrollX =
      smoothFactor * this.camera.scrollX + (1 - smoothFactor) * (target.x - this.camera.width * 0.5);
    this.camera.scrollY =
      smoothFactor * this.camera.scrollY + (1 - smoothFactor) * (target.y - this.camera.height * 0.5);
  }
}
