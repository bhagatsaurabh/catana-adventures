import { KeyInput, PlayerInput, PlayerInputs } from '../types/types';
import { keyMap, touchMap } from '../utils/constants';
import { loadIds } from './ids';

export class InputManager {
  static input: PlayerInputs = {};
  private static mQuery = window.matchMedia('(pointer: coarse) and (hover: none)');
  private static isTouchSupported = false;
  private static ids = loadIds();

  private static joystickVCancel = () => {
    InputManager.input[touchMap['JoystickUp']] = false;
    InputManager.input[touchMap['JoystickDown']] = false;
  };
  private static joystickHCancel = () => {
    InputManager.input[touchMap['JoystickLeft']] = false;
    InputManager.input[touchMap['JoystickRight']] = false;
  };
  private static powerAttackCancel = () => (InputManager.input[touchMap['A']] = false);
  private static fastAttackCancel = () => (InputManager.input[touchMap['B']] = false);

  static {
    const changeListener = () => {
      InputManager.isTouchSupported = InputManager.mQuery.matches;
    };
    changeListener();
    InputManager.mQuery.onchange = changeListener;
    InputManager.ids.touchControls.oncontextmenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };

    InputManager.ids.joystickUp.onpointerdown = () => {
      InputManager.input[touchMap['JoystickUp']] = true;
      InputManager.input[touchMap['JoystickDown']] = false;
    };
    InputManager.ids.joystickUp.onpointerup = InputManager.joystickVCancel;
    InputManager.ids.joystickUp.onpointercancel = InputManager.joystickVCancel;
    InputManager.ids.joystickUp.onpointerout = InputManager.joystickVCancel;
    InputManager.ids.joystickUp.onpointerleave = InputManager.joystickVCancel;

    InputManager.ids.joystickDown.onpointerdown = () => {
      InputManager.input[touchMap['JoystickUp']] = false;
      InputManager.input[touchMap['JoystickDown']] = true;
    };
    InputManager.ids.joystickDown.onpointerup = InputManager.joystickVCancel;
    InputManager.ids.joystickDown.onpointercancel = InputManager.joystickVCancel;
    InputManager.ids.joystickDown.onpointerout = InputManager.joystickVCancel;
    InputManager.ids.joystickDown.onpointerleave = InputManager.joystickVCancel;

    InputManager.ids.joystickLeft.onpointerdown = () => {
      InputManager.input[touchMap['JoystickLeft']] = true;
      InputManager.input[touchMap['JoystickRight']] = false;
    };
    InputManager.ids.joystickLeft.onpointerup = InputManager.joystickHCancel;
    InputManager.ids.joystickLeft.onpointercancel = InputManager.joystickHCancel;
    InputManager.ids.joystickLeft.onpointerout = InputManager.joystickHCancel;
    InputManager.ids.joystickLeft.onpointerleave = InputManager.joystickHCancel;

    InputManager.ids.joystickRight.onpointerdown = () => {
      InputManager.input[touchMap['JoystickLeft']] = false;
      InputManager.input[touchMap['JoystickRight']] = true;
    };
    InputManager.ids.joystickRight.onpointerup = InputManager.joystickHCancel;
    InputManager.ids.joystickRight.onpointercancel = InputManager.joystickHCancel;
    InputManager.ids.joystickRight.onpointerout = InputManager.joystickHCancel;
    InputManager.ids.joystickRight.onpointerleave = InputManager.joystickHCancel;

    InputManager.ids.powerAttack.onpointerdown = () => {
      InputManager.input[touchMap['A']] = true;
    };
    InputManager.ids.powerAttack.onpointerup = InputManager.powerAttackCancel;
    InputManager.ids.powerAttack.onpointercancel = InputManager.powerAttackCancel;
    InputManager.ids.powerAttack.onpointerout = InputManager.powerAttackCancel;
    InputManager.ids.powerAttack.onpointerleave = InputManager.powerAttackCancel;

    InputManager.ids.fastAttack.onpointerdown = () => {
      InputManager.input[touchMap['B']] = true;
    };
    InputManager.ids.fastAttack.onpointerup = InputManager.fastAttackCancel;
    InputManager.ids.fastAttack.onpointercancel = InputManager.fastAttackCancel;
    InputManager.ids.fastAttack.onpointerout = InputManager.fastAttackCancel;
    InputManager.ids.fastAttack.onpointerleave = InputManager.fastAttackCancel;
  }

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
  static sceneChange(canShowTouchControls: boolean) {
    InputManager.ids.touchControls.style.display =
      InputManager.isTouchSupported && canShowTouchControls ? 'flex' : 'none';
    InputManager.ids.bgMedia.style.display = canShowTouchControls ? 'none' : 'block';
  }
}
