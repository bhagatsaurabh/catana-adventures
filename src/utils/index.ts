export const clamp = (val: number, min: number, max: number) => Math.max(Math.min(val, max), min);
export const clampLow = (val: number, min: number) => Math.max(val, min);
export const normalize = (val: number, min: number, max: number) => (val - min) / (max - min);
export const denormalize = (norm: number, min: number, max: number) => norm * (max - min) + min;
export const rand = (min: number, max: number) => {
  const buf = new Uint32Array(1);
  window.crypto.getRandomValues(buf);
  return denormalize(buf[0] / (0xffffffff + 1), min, max);
};
export const randRadial = (x: number, y: number, r: number) => {
  const R = r * Math.sqrt(rand(0, 1));
  const theta = rand(0, 1) * 2 * Math.PI;

  return { x: x + R * Math.cos(theta), y: y + R * Math.sin(theta) };
};
export const choose = <T>(vals: T[]): T => vals[Math.round(rand(0, vals.length - 1))];
const S4 = () => (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
export const luid = () => `${S4()}${S4()}`;
export const chance = (probability: number) => rand(0, 1) > clamp(probability, 0, 1);
