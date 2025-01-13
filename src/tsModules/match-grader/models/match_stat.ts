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

  getP1ForcingWinPct() {
    const totalPoints = this.getTotalNumPoints();
    if (totalPoints === 0) {
      return '';
    }
    const serverForcingWins = this.p1Stats.numFirstServeForcingWins + this.p1Stats.numSecondServeForcingWins;
    const returnerForcingWins = this.p2Stats.numFirstServeForcingWinsByReturner + this.p2Stats.numSecondServeForcingWinsByReturner;
    return `${Math.floor(((serverForcingWins + returnerForcingWins) / totalPoints) * 100)}%`;
  }

  getP2ForcingWinPct() {
    const totalPoints = this.getTotalNumPoints();
    if (totalPoints === 0) {
      return '';
    }
    const serverForcingWins = this.p2Stats.numFirstServeForcingWins + this.p2Stats.numSecondServeForcingWins;
    const returnerForcingWins = this.p1Stats.numFirstServeForcingWinsByReturner + this.p1Stats.numSecondServeForcingWinsByReturner;
    return `${Math.floor(((serverForcingWins + returnerForcingWins) / totalPoints) * 100)}%`;
  }

  getP1ForcingWinPctOnServe() {
    const totalServePoints = this.p1Stats.numFirstServesMade + this.p1Stats.numSecondServes;
    if (totalServePoints === 0) {
      return '';
    }
    const forcingWins = this.p1Stats.numFirstServeForcingWins + this.p1Stats.numSecondServeForcingWins;
    return `${Math.floor((forcingWins / totalServePoints) * 100)}%`;
  }

  getP2ForcingWinPctOnServe() {
    const totalServePoints = this.p2Stats.numFirstServesMade + this.p2Stats.numSecondServes;
    if (totalServePoints === 0) {
      return '';
    }
    const forcingWins = this.p2Stats.numFirstServeForcingWins + this.p2Stats.numSecondServeForcingWins;
    return `${Math.floor((forcingWins / totalServePoints) * 100)}%`;
  }

  getP1ForcingWinPctOnFirstServe() {
    if (this.p1Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numFirstServeForcingWins / this.p1Stats.numFirstServesMade) * 100)}%`;
  }

  getP2ForcingWinPctOnFirstServe() {
    if (this.p2Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numFirstServeForcingWins / this.p2Stats.numFirstServesMade) * 100)}%`;
  }

  getP1ForcingWinPctOnSecondServe() {
    if (this.p1Stats.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numSecondServeForcingWins / this.p1Stats.numSecondServes) * 100)}%`;
  }

  getP2ForcingWinPctOnSecondServe() {
    if (this.p2Stats.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numSecondServeForcingWins / this.p2Stats.numSecondServes) * 100)}%`;
  }

  getP1ForcingWinPctOnReturn() {
    const oppoTotalServes = this.p2Stats.numFirstServesMade + this.p2Stats.numSecondServes;
    if (oppoTotalServes === 0) {
      return '';
    }
    const forcingWins = this.p1Stats.numFirstServeForcingWinsByReturner + this.p1Stats.numSecondServeForcingWinsByReturner;
    return `${Math.floor((forcingWins / oppoTotalServes) * 100)}%`;
  }

  getP2ForcingWinPctOnReturn() {
    const oppoTotalServes = this.p1Stats.numFirstServesMade + this.p1Stats.numSecondServes;
    if (oppoTotalServes === 0) {
      return '';
    }
    const forcingWins = this.p2Stats.numFirstServeForcingWinsByReturner + this.p2Stats.numSecondServeForcingWinsByReturner;
    return `${Math.floor((forcingWins / oppoTotalServes) * 100)}%`;
  }

  getP1ForcingWinPctOnFirstReturn() {
    if (this.p2Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numFirstServeForcingWinsByReturner / this.p2Stats.numFirstServesMade) * 100)}%`;
  }

  getP2ForcingWinPctOnFirstReturn() {
    if (this.p1Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numFirstServeForcingWinsByReturner / this.p1Stats.numFirstServesMade) * 100)}%`;
  }

  getP1ForcingWinPctOnSecondReturn() {
    if (this.p2Stats.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numSecondServeForcingWinsByReturner / this.p2Stats.numSecondServesMade) * 100)}%`;
  }

  getP2ForcingWinPctOnSecondReturn() {
    if (this.p1Stats.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numSecondServeForcingWinsByReturner / this.p1Stats.numSecondServesMade) * 100)}%`;
  }

  getP1UnforcedErrorPct() {
    const totalPoints = this.getTotalNumPoints();
    if (totalPoints === 0) {
      return '';
    }
    const serverUEs = this.p1Stats.numFirstServeUnforcedErrors + this.p1Stats.numSecondServeUnforcedErrors;
    const returnerUEs = this.p2Stats.numFirstServeUnforcedErrorsByReturner + this.p2Stats.numSecondServeUnforcedErrorsByReturner;
    return `${Math.floor(((serverUEs + returnerUEs) / totalPoints) * 100)}%`;
  }

  getP2UnforcedErrorPct() {
    const totalPoints = this.getTotalNumPoints();
    if (totalPoints === 0) {
      return '';
    }
    const serverUEs = this.p2Stats.numFirstServeUnforcedErrors + this.p2Stats.numSecondServeUnforcedErrors;
    const returnerUEs = this.p1Stats.numFirstServeUnforcedErrorsByReturner + this.p1Stats.numSecondServeUnforcedErrorsByReturner;
    return `${Math.floor(((serverUEs + returnerUEs) / totalPoints) * 100)}%`;
  }

  getP1UnforcedErrorPctOnServe() {
    const totalServePoints = this.p1Stats.numFirstServesMade + this.p1Stats.numSecondServes;
    if (totalServePoints === 0) {
      return '';
    }
    const UEs = this.p1Stats.numFirstServeUnforcedErrors + this.p1Stats.numSecondServeUnforcedErrors;
    return `${Math.floor((UEs / totalServePoints) * 100)}%`;
  }

  getP2UnforcedErrorPctOnServe() {
    const totalServePoints = this.p2Stats.numFirstServesMade + this.p2Stats.numSecondServes;
    if (totalServePoints === 0) {
      return '';
    }
    const UEs = this.p2Stats.numFirstServeUnforcedErrors + this.p2Stats.numSecondServeUnforcedErrors;
    return `${Math.floor((UEs / totalServePoints) * 100)}%`;
  }

  getP1UnforcedErrorPctOnFirstServe() {
    if (this.p1Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numFirstServeUnforcedErrors / this.p1Stats.numFirstServesMade) * 100)}%`;
  }

  getP2UnforcedErrorPctOnFirstServe() {
    if (this.p2Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numFirstServeUnforcedErrors / this.p2Stats.numFirstServesMade) * 100)}%`;
  }

  getP1UnforcedErrorPctOnSecondServe() {
    if (this.p1Stats.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numSecondServeUnforcedErrors / this.p1Stats.numSecondServes) * 100)}%`;
  }

  getP2UnforcedErrorPctOnSecondServe() {
    if (this.p2Stats.numSecondServes === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numSecondServeUnforcedErrors / this.p2Stats.numSecondServes) * 100)}%`;
  }

  getP1UnforcedErrorPctOnReturn() {
    const oppoTotalServes = this.p2Stats.numFirstServesMade + this.p2Stats.numSecondServesMade;
    if (oppoTotalServes === 0) {
      return '';
    }
    const UEs = this.p2Stats.numFirstServeUnforcedErrorsByReturner + this.p2Stats.numSecondServeUnforcedErrorsByReturner;
    return `${Math.floor((UEs / oppoTotalServes) * 100)}%`;
  }

  getP2UnforcedErrorPctOnReturn() {
    const oppoTotalServes = this.p1Stats.numFirstServesMade + this.p1Stats.numSecondServesMade;
    if (oppoTotalServes === 0) {
      return '';
    }
    const UEs = this.p1Stats.numFirstServeUnforcedErrorsByReturner + this.p1Stats.numSecondServeUnforcedErrorsByReturner;
    return `${Math.floor((UEs / oppoTotalServes) * 100)}%`;
  }

  getP1UnforcedErrorPctOn1stServeReturn() {
    if (this.p2Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numFirstServeUnforcedErrorsByReturner / this.p2Stats.numFirstServesMade) * 100)}%`;
  }

  getP2UnforcedErrorPctOn1stServeReturn() {
    if (this.p1Stats.numFirstServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numFirstServeUnforcedErrorsByReturner / this.p1Stats.numFirstServesMade) * 100)}%`;
  }

  getP1UnforcedErrorPctOn2ndServeReturn() {
    if (this.p2Stats.numSecondServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p2Stats.numSecondServeUnforcedErrorsByReturner / this.p2Stats.numSecondServesMade) * 100)}%`;
  }

  getP2UnforcedErrorPctOn2ndServeReturn() {
    if (this.p1Stats.numSecondServesMade === 0) {
      return '';
    }
    return `${Math.floor((this.p1Stats.numSecondServeUnforcedErrorsByReturner / this.p1Stats.numSecondServesMade) * 100)}%`;
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
    public numFirstServeForcingWins = 0,
    public numSecondServeForcingWins = 0,
    public numFirstServeForcingWinsByReturner = 0,
    public numSecondServeForcingWinsByReturner = 0,
    public numFirstServeUnforcedErrors = 0,
    public numSecondServeUnforcedErrors = 0,
    public numFirstServeUnforcedErrorsByReturner = 0,
    public numSecondServeUnforcedErrorsByReturner = 0,
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
      json.numSecondServesWon,
      json.numFirstServeForcingWins,
      json.numSecondServeForcingWins,
      json.numFirstServeForcingWinsByReturner,
      json.numSecondServeForcingWinsByReturner,
      json.numFirstServeUnforcedErrors,
      json.numSecondServeUnforcedErrors,
      json.numFirstServeUnforcedErrorsByReturner,
      json.numSecondServeUnforcedErrorsByReturner,
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
