
export class Time {
  constructor(
    public ms = 0,
    public videoIndex = 0,
  ) {}

  static deserialize(json: any) {
    return new Time(
      json.ms,
      json.videoIndex,
    );
  }
  equals(other: Time) {
    return this.ms === other.ms && this.videoIndex === other.videoIndex;
  }
  toString() {
    return `${this.ms}-${this.videoIndex}`;
  }
}
