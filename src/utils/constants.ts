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
};
export const touchMap: Record<TouchInput, PlayerInput> = {
  JoystickLeft: PlayerInput.LEFT,
  JoystickRight: PlayerInput.RIGHT,
  JoystickUp: PlayerInput.JUMP,
  JoystickDown: PlayerInput.CROUCH,
  A: PlayerInput.POWER_ATTACK,
  B: PlayerInput.FAST_ATTACK,
};
export const PI2 = Math.PI * 2;
