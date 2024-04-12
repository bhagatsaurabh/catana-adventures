import { KeyInput, PlayerInput, PlayerInputs } from '../types/types';
import { keyMap } from '../utils/constants';

export class InputManager {
  static input: PlayerInputs = {};

  private constructor() {}

  private static keyDown(event: KeyboardEvent) {
    if (typeof PlayerInput[keyMap[event.code as KeyInput]] !== 'undefined') {
      InputManager.input[keyMap[event.code as KeyInput]] = true;
    }
  }
  private static keyUp(event: KeyboardEvent) {
    if (typeof PlayerInput[keyMap[event.code as KeyInput]] !== 'undefined') {
      InputManager.input[keyMap[event.code as KeyInput]] = false;
    }
  }

  static setup() {
    window.addEventListener('keydown', InputManager.keyDown);
    window.addEventListener('keyup', InputManager.keyUp);
  }
  static destroy() {
    window.removeEventListener('keydown', InputManager.keyDown);
    window.removeEventListener('keyup', InputManager.keyUp);
  }
}
