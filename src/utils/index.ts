export const clamp = (val: number, min: number, max: number) => Math.max(Math.min(val, max), min);
export const normalize = (val: number, min: number, max: number) => (val - min) / (max - min);
export const denormalize = (norm: number, min: number, max: number) => norm * (max - min) + min;
export const rand = (min: number, max: number) => {
  const buf = new Uint32Array(1);
  window.crypto.getRandomValues(buf);
  return denormalize(buf[0] / (0xffffffff + 1), min, max);
};
export const choose = <T>(vals: T[]): T => vals[Math.round(rand(0, vals.length - 1))];
