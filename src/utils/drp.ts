import { PI2 } from './constants';

export class DeterministicRandomPath {
  constructor(
    public center = { x: 100, y: 100 },
    public rpsC = { x: 0.43, y: 0.47 },
    public rpsP = { x: 0.093, y: 0.097 },
    public rps = { x: 1, y: 0.8 },
    public distC = 20,
    public distP = 30,
    public dist = 30,
  ) {}

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
