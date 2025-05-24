
export class Score {
  constructor(
    public p1 = new PersonScore(),
    public p2 = new PersonScore(),
    public numLets = 0,
  ) {}
  static deserialize(json: any) {
    return new Score(
      PersonScore.deserialize(json.p1),
      PersonScore.deserialize(json.p2),
      json.numLets,
    );
  }
  clone() {
    return Score.deserialize(JSON.parse(JSON.stringify(this)));
  }

  toPointsStr() {
    if (isTieBreakTime(this.p1, this.p2)) {
      return `${this.p1.points}-${this.p2.points}`;
    } else if (this.p1.points <= 3 && this.p2.points <= 3) {
      let p1TennisPt = ptToTennisPt.get(this.p1.points);
      let p2TennisPt = ptToTennisPt.get(this.p2.points);
      if (p1TennisPt === undefined || p2TennisPt === undefined) {
        p1TennisPt = `${this.p1.points}`;
        p2TennisPt = `${this.p2.points}`;
      }
      return `${p1TennisPt}-${p2TennisPt}`;
    } 
    if (this.p1.points === this.p2.points) {
      return `40-40 #${this.p1.points - 2}`;
    }
    if (this.p1.points > this.p2.points) {
      return 'Ad-__';
    }
    return '__-Ad';
  }
  getP1PointsStr() {
    let p1TennisPt = ptToTennisPt.get(this.p1.points);
    let p2TennisPt = ptToTennisPt.get(this.p2.points);
    if (p1TennisPt !== undefined && p2TennisPt !== undefined) {
      return p1TennisPt;
    }
    if (this.p1.points === this.p2.points) {
      return `40`;
    }
    if (this.p1.points > this.p2.points) {
      return 'Ad';
    }
    return '__';
  }
  getP2PointsStr() {
    let p1TennisPt = ptToTennisPt.get(this.p1.points);
    let p2TennisPt = ptToTennisPt.get(this.p2.points);
    if (p1TennisPt !== undefined && p2TennisPt !== undefined) {
      return p2TennisPt;
    }
    if (this.p1.points === this.p2.points) {
      return `40`;
    }
    if (this.p1.points > this.p2.points) {
      return '__';
    }
    return 'Ad';
  }
}

const ptToTennisPt = new Map([
  [0, `00`],
  [1, `15`],
  [2, `30`],
  [3, `40`],
]);

export function isTieBreakTime(subjectScore: PersonScore, otherScore: PersonScore) {
  return subjectScore.games === 6 && otherScore.games === 6;
}

export class PersonScore {
  constructor(
    public serve = 0,
    public points = 0,
    public games = 0,
    public gamesByCompletedSet: number[] = [],
  ) {}
  static deserialize(json: any) {
    return new PersonScore(
      json.serve,
      json.points,
      json.games,
      json.gamesByCompletedSet.map((num: number) => num),
    );
  }
  clone() {
    return PersonScore.deserialize(JSON.parse(JSON.stringify(this)));
  }
}
