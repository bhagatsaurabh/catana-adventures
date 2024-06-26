import { Boot } from './scenes/boot';
import { Game as MainGame } from './scenes/game';
import { GameOver } from './scenes/gameover';
import { MainMenu } from './scenes/mainmenu';
import { Preloader } from './scenes/preloader';

import { Game, Types } from 'phaser';

const config: Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  stableSort: false,
  width: 640,
  height: 480,
  parent: 'container',
  backgroundColor: '#000000',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      debug: {
        showBody: false,
        showStaticBody: false,
      },
    },
  },
  disableContextMenu: true,
  scene: [Boot, Preloader, MainMenu, MainGame, GameOver],
};

export default new Game(config);
