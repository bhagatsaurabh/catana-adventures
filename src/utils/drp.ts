import { rand } from '.';
import { PI2 } from './constants';

export class DeterministicRandomPath {
  rpsC: { x: number; y: number };
  rpsP: { x: number; y: number };
  rps: { x: number; y: number };

  constructor(
    public center: { x: number; y: number },
    public distC: number,
    public distP: number,
    public dist: number,
  ) {
    this.rpsC = { x: rand(0.1, 0.15), y: rand(0.1, 0.15) };
    this.rpsP = { x: rand(0.02, 0.024), y: rand(0.02, 0.024) };
    this.rps = { x: rand(0.22, 0.25), y: rand(0.22, 0.25) };
  }

  movePoints(time: number) {
    let phaseX = (time / 1000) * PI2 * this.rpsC.x;
    let phaseY = (time / 1000) * PI2 * this.rpsC.y;
    this.center.x = 100 + Math.cos(phaseX) * this.distC;
    this.center.y = 100 + Math.sin(phaseY) * this.distC;

    phaseX = (time / 1000) * PI2 * this.rpsP.x;
    phaseY = (time / 1000) * PI2 * this.rpsP.y;
    this.center.x = this.center.x + Math.cos(phaseX) * this.distP;
    this.center.y = this.center.y + Math.sin(phaseY) * this.distP;
  }
  getCoords(time: number) {
    let phaseX = (time / 1000) * PI2 * this.rps.x;
    let phaseY = (time / 1000) * PI2 * this.rps.y;
    const xx = Math.cos(phaseX) * this.dist;
    const yy = Math.sin(phaseY) * this.dist;
    return { x: xx, y: yy };
  }
  next(time: number) {
    this.movePoints(time);
    return this.getCoords(time);
  }
}
