export class ScoreKeeper {
  score = 0;
  constructor() {}

  monsterKilled(
    type: 'chomper' | 'demon-flower' | 'flyfly' | 'skeleton',
    noOfPowerAttacks: number,
    noOfFastAttacks: number,
  ) {
    if (type === 'chomper') {
      this.score += 25 + Math.round(10 / noOfPowerAttacks) + Math.round(20 / noOfFastAttacks);
    } else if (type === 'demon-flower') {
      this.score += 55 + Math.round(20 / noOfPowerAttacks) + Math.round(40 / noOfFastAttacks);
    } else if (type == 'flyfly') {
      this.score += 15 + Math.round(5 / noOfPowerAttacks) + Math.round(10 / noOfFastAttacks);
    } else if (type === 'skeleton') {
      this.score += 70 + Math.round(30 / noOfPowerAttacks) + Math.round(50 / noOfFastAttacks);
    }
  }
  levelCompleted(time: number) {
    if (time <= 70000) this.score += 1000;
    else if (time > 70000 && time <= 100000) this.score += 750;
    else this.score += 500;
  }
  coinCollected(type: 'gold' | 'silver' | 'bronze') {
    if (type === 'gold') this.score += 10;
    else if (type === 'silver') this.score += 5;
    else this.score += 2;
  }
}
