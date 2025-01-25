import { Time } from "./models/Time";

export class FilterState {
  constructor(
    public rallyStartTimes: Time[] = [],
  ) {}

  isDefaultState() {
    return this.rallyStartTimes.length === 0;
  }
}
