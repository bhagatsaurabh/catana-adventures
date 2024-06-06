export class ScoreKeeper {
  score = 0;
  constructor() {}

  monsterKilled(
    type: 'chomper' | 'demon-flower' | 'flyfly' | 'skeleton',
    stats: { noOfPowerAttacks: number; noOfFastAttacks: number },
  ) {
    if (type === 'chomper') {
      this.score +=
        25 +
        (stats.noOfPowerAttacks ? Math.round(10 / stats.noOfPowerAttacks) : 0) +
        (stats.noOfFastAttacks ? Math.round(20 / stats.noOfFastAttacks) : 0);
    } else if (type === 'demon-flower') {
      this.score +=
        55 +
        (stats.noOfPowerAttacks ? Math.round(20 / stats.noOfPowerAttacks) : 0) +
        (stats.noOfFastAttacks ? Math.round(40 / stats.noOfFastAttacks) : 0);
    } else if (type == 'flyfly') {
      this.score +=
        15 +
        (stats.noOfPowerAttacks ? Math.round(5 / stats.noOfPowerAttacks) : 0) +
        (stats.noOfFastAttacks ? Math.round(10 / stats.noOfFastAttacks) : 0);
    } else if (type === 'skeleton') {
      this.score +=
        70 +
        (stats.noOfPowerAttacks ? Math.round(30 / stats.noOfPowerAttacks) : 0) +
        (stats.noOfFastAttacks ? Math.round(50 / stats.noOfFastAttacks) : 0);
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
