export enum PlayerInput {
  LEFT,
  RIGHT,
  JUMP,
  CROUCH,
  POWER_ATTACK,
  FAST_ATTACK,
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
}
export enum TouchInput {
  JOYSTICK_LEFT = 'JoystickLeft',
  JOYSTICK_RIGHT = 'JoystickRight',
  JOYSTICK_UP = 'JoystickUp',
  JOYSTICK_DOWN = 'JoystickDown',
  A = 'A',
  B = 'B',
}

export type PlayerInputs = Partial<Record<PlayerInput, boolean>>;
