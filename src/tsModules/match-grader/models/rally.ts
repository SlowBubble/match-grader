import { Time } from "./Time";

export enum RallyResult {
  Fault = 'Fault',
  PtServer = 'PtServer',
  PtReturner = 'PtReturner',
  Let = 'Let',
}

export const rallyResultToIndex = new Map();

export const rallyResultVals = Object.values(RallyResult);
rallyResultVals.forEach((val, idx) => {
  rallyResultToIndex.set(val, idx);
});

export class RallyStat {
  constructor(
    // A rating of 1-5; 0 means no input.
    public winnerLastShotQuality = 0,
    public loserPreviousShotQuality = 0,
  ) {}

  static deserialize(json: any) {
    return new RallyStat(
      json.winnerLastShotQuality,
      json.loserPreviousShotQuality
    );
  }

}
export class Rally {
  constructor(
    public startTime = new Time(),
    public endTime = new Time(),
    public result = RallyResult.Fault,
    public isMyServe = false,
    public stat: RallyStat = new RallyStat(),
    // TODO add scoreOverride: Score | null = null,
  ) {}

  static deserialize(json: any) {
    return new Rally(
      Time.deserialize(json.startTime),
      Time.deserialize(json.endTime),
      json.result,
      json.isMyServe,
      json.stat ? RallyStat.deserialize(json.stat) : new RallyStat(),
    );
  }
  clone() {
    return Rally.deserialize(JSON.parse(JSON.stringify(this)));
  }

  getDurationStr() {
    return `${Math.round((this.endTime.ms - this.startTime.ms) / 1000)}`;
  }
  getResultStr() {
    if (this.result === RallyResult.PtServer) {
      return `Server's W`;
    } else if (this.result === RallyResult.PtReturner) {
      return `Returner's W`;
    }
    return this.result;
  }
}
