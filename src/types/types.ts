export type PlayerAnimationType =
  | 'idle'
  | 'walk'
  | 'jump-ready'
  | 'jump'
  | 'jump-land'
  | 'dead'
  | 'power-attack'
  | 'fast-attack'
  | 'combo-attack'
  | 'combo-kick';

export enum PlayerInput {
  LEFT,
  RIGHT,
  JUMP,
  CROUCH,
  POWER_ATTACK,
  FAST_ATTACK,
  COMBO_ATTACK,
  COMBO_KICK,
}

export enum KeyInput {
  KEY_ARROW_LEFT = 'ArrowLeft',
  KEY_ARROW_RIGHT = 'ArrowRight',
  KEY_ARROW_UP = 'ArrowUp',
  KEY_ARROW_DOWN = 'ArrowDown',
  KEY_CTRL_LEFT = 'ControlLeft',
  KEY_CTRL_RIGHT = 'ControlRight',
  KEY_SHIFT_LEFT = 'ShiftLeft',
  KEY_SHIFT_RIGHT = 'ShiftRight',
  KEY_Z = 'KeyZ',
  KEY_X = 'KeyX',
}
export enum TouchInput {
  JOYSTICK_LEFT = 'JoystickLeft',
  JOYSTICK_RIGHT = 'JoystickRight',
  JOYSTICK_UP = 'JoystickUp',
  JOYSTICK_DOWN = 'JoystickDown',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export type PlayerInputs = Partial<Record<PlayerInput, boolean>>;
