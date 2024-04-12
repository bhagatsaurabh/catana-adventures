import { KeyInput, PlayerInput, TouchInput } from '../types/types';

export const keyMap: Record<KeyInput, PlayerInput> = {
  ArrowLeft: PlayerInput.LEFT,
  ArrowRight: PlayerInput.RIGHT,
  ArrowUp: PlayerInput.JUMP,
  ArrowDown: PlayerInput.CROUCH,
  ControlLeft: PlayerInput.POWER_ATTACK,
  ControlRight: PlayerInput.POWER_ATTACK,
  ShiftLeft: PlayerInput.FAST_ATTACK,
  ShiftRight: PlayerInput.FAST_ATTACK,
  KeyZ: PlayerInput.COMBO_ATTACK,
  KeyX: PlayerInput.COMBO_KICK,
};
export const touchMap: Record<TouchInput, PlayerInput> = {
  JoystickLeft: PlayerInput.LEFT,
  JoystickRight: PlayerInput.RIGHT,
  JoystickUp: PlayerInput.JUMP,
  JoystickDown: PlayerInput.CROUCH,
  A: PlayerInput.POWER_ATTACK,
  B: PlayerInput.FAST_ATTACK,
  C: PlayerInput.COMBO_ATTACK,
  D: PlayerInput.COMBO_KICK,
};
