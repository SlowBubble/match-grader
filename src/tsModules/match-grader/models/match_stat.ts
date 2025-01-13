export class MatchStat {
  constructor(
    public p1Stats = new PlayerStat(),
    public p2Stats = new PlayerStat(),
  ) {}

  static deserialize(json: any) {
    return new MatchStat(
      PlayerStat.deserialize(json.p1Stats),
      PlayerStat.deserialize(json.p2Stats)
    );
  }

  clone() {
    return MatchStat.deserialize(JSON.parse(JSON.stringify(this)));
  }

  toString() {
    return JSON.stringify(this, null, 2);
  }

  getTotalNumPoints() {
    // For each player, count first serve points made + second serve attempts (including double faults)
    const p1Points = this.p1Stats.numFirstServesMade + this.p1Stats.numSecondServes;
    const p2Points = this.p2Stats.numFirstServesMade + this.p2Stats.numSecondServes;
    return p1Points + p2Points;
  }

  getP1PointsWon() {
    // Points won on serve (first + second serves)
    const servePointsWon = this.p1Stats.numFirstServesWon + this.p1Stats.numSecondServesWon;
    // Points won on return (when opponent served and lost)
    const returnPointsWon = (this.p2Stats.numFirstServesMade - this.p2Stats.numFirstServesWon) + 
                           (this.p2Stats.numSecondServesMade - this.p2Stats.numSecondServesWon) +
                           (this.p2Stats.numSecondServes - this.p2Stats.numSecondServesMade); // double faults
    return servePointsWon + returnPointsWon;
  }

  getP2PointsWon() {
    // Points won on serve (first + second serves)
    const servePointsWon = this.p2Stats.numFirstServesWon + this.p2Stats.numSecondServesWon;
    // Points won on return (when opponent served and lost)
    const returnPointsWon = (this.p1Stats.numFirstServesMade - this.p1Stats.numFirstServesWon) +
                           (this.p1Stats.numSecondServesMade - this.p1Stats.numSecondServesWon) +
                           (this.p1Stats.numSecondServes - this.p1Stats.numSecondServesMade); // double faults
    return servePointsWon + returnPointsWon;
  }

  getP1WinningPct() {
    const totalPoints = this.getTotalNumPoints();
    if (totalPoints === 0) {
      return '';
    }
    const p1Points = this.getP1PointsWon();
    return `${Math.floor((p1Points / totalPoints) * 100)}%`;
  }

  getP2WinningPct() {
    const totalPoints = this.getTotalNumPoints();
    if (totalPoints === 0) {
      return '';
    }
    const p2Points = this.getP2PointsWon();
    return `${Math.floor((p2Points / totalPoints) * 100)}%`;
  }
}

// The fields should be counter stats (e.g. percentages should be methods only).
// Reduce redundancy by making these as methods instead of fields:
// - numDoubleFaults = numSecondServes - numSecondServesMade
// - numFirstServesLoss = numFirstServesMade - numFirstServesWon
// - numSecondServesLoss = numSecondServes - numSecondServesWon
// - p1.numFirstServeReturnWon = p2.numFirstServeMade - p2.numFirstServesLoss
export class PlayerStat {
  constructor(
    public numGamePts = 0,
    public numSetPts = 0,
    // Don't count let.
    public numFirstServes = 0,
    public numFirstServesMade = 0,
    public numFirstServesWon = 0,
    // Don't count let.
    public numSecondServes = 0,
    public numSecondServesMade = 0,
    public numSecondServesWon = 0,
  ) {}

  static deserialize(json: any) {
    return new PlayerStat(
      json.numGamePts,
      json.numSetPts,
      json.numFirstServes,
      json.numFirstServesMade,
      json.numFirstServesWon,
      json.numSecondServes,
      json.numSecondServesMade,
      json.numSecondServesWon
    );
  }

  clone() {
    return PlayerStat.deserialize(JSON.parse(JSON.stringify(this)));
  }

  getFirstServePct() {
    if (this.numFirstServes === 0) {
      return '';
    }
    return `${Math.floor((this.numFirstServesMade / this.numFirstServes) * 100)}%`;
  }

  getSecondServePct() {
    if (this.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.numSecondServesMade / this.numSecondServes) * 100)}%`;
  }

  getServePct() {
    const totalServes = this.numFirstServes + this.numSecondServes;
    const totalServesMade = this.numFirstServesMade + this.numSecondServesMade;
    if (totalServes === 0) {
      return '';
    }
    return `${Math.floor((totalServesMade / totalServes) * 100)}%`;
  }

  getServePointsWonPct() {
    // numSecondServes is used to include double faults.
    const totalPointsPlayed = this.numFirstServesMade + this.numSecondServes;
    const totalPointsWon = this.numFirstServesWon + this.numSecondServesWon;
    if (totalPointsPlayed === 0) {
      return '';
    }
    return `${Math.floor((totalPointsWon / totalPointsPlayed) * 100)}%`;
  }

  getFirstServePointsWonPct() {
    if (this.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.numFirstServesWon / this.numFirstServesMade) * 100)}%`;
  }

  getSecondServePointsWonPct() {
    // numSecondServes is used to include double faults.
    if (this.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.numSecondServesWon / this.numSecondServes) * 100)}%`;
  }

}
