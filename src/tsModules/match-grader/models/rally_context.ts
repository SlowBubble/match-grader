import { MatchStat } from "./match_stat";
import { Rally, RallyResult } from "./rally";
import {  isTieBreakTime, PersonScore, Score } from "./score";
import { isForcingWin, isUnforcedError } from './risk_level';

export class RallyContext {
  constructor(
    public rally = new Rally(),
    public scoreBeforeRally = new Score(),
    public matchStatBeforeRally = new MatchStat(),
  ) {}

  getResultStr(myName: string, oppoName: string) {
    const server = this.rally.isMyServe ? myName : oppoName;
    const returner = this.rally.isMyServe ? oppoName : myName;
    if (this.rally.result === RallyResult.PtServer) {
      return `Pt. ${server}`;
    } else if (this.rally.result === RallyResult.PtReturner) {
      return `Pt. ${returner}`;
    }
    return this.rally.result;
  }

  getResultSymbolStr() {
    if (this.rally.result === RallyResult.PtServer) {
      return this.rally.isMyServe ? `${greenBall} ${whiteBall}` : `${whiteBall} ${greenBall}`;
    } else if (this.rally.result === RallyResult.PtReturner) {
      return this.rally.isMyServe ? `${redBall} ${whiteBall}` : `${whiteBall} ${redBall}`;
    } else if (this.rally.result === RallyResult.Fault) {
      if (this.isSecondServe()) {
        return this.rally.isMyServe ? `${redHeart} ${whiteBall}` : `${whiteBall} ${redHeart}`;
      }
      return this.rally.isMyServe ? `${yellowBall} ${whiteBall}` : `${whiteBall} ${yellowBall}`;
    }
    return this.rally.result;
  }
  
  toGameScoreStr() {
    const strs = [];
    if (this.isNewSet()) {
      this.scoreBeforeRally.p1.gamesByCompletedSet.forEach((p1Games, idx) => {
        strs.push(`[${p1Games}-${this.scoreBeforeRally.p2.gamesByCompletedSet[idx]}]`);
      });
    }
    if (this.isNewGame()) {
      strs.push(`[${this.scoreBeforeRally.p1.games}-${this.scoreBeforeRally.p2.games}]`);
    }

    return strs.join(' ');
  }

  isDoubleFault() {
      return this.isSecondServe() && this.rally.result === RallyResult.Fault;
  }

  winnerIsMe() {
    return (this.rally.isMyServe && this.rally.result === RallyResult.PtServer) ||
        (!this.rally.isMyServe && (this.rally.result === RallyResult.PtReturner || this.isDoubleFault()));
  }
  winnerIsOppo() {
    return (!this.rally.isMyServe && this.rally.result === RallyResult.PtServer) ||
        (this.rally.isMyServe && (this.rally.result === RallyResult.PtReturner || this.isDoubleFault()));
  }

  getScoreAfterRally() {
    const rally = this.rally;
    const scoreAfterRally = this.scoreBeforeRally.clone();
    if (rally.result === RallyResult.Let) {
      scoreAfterRally.numLets++;
      return scoreAfterRally;
    } else {
      scoreAfterRally.numLets = 0;
    }

    const serverScore = rally.isMyServe ? scoreAfterRally.p1 : scoreAfterRally.p2;
    const returnerScore = rally.isMyServe ? scoreAfterRally.p2 : scoreAfterRally.p1;
    const serverWon = rally.result === RallyResult.PtServer;
    if (serverWon) {
      updateSubjectWin(serverScore, returnerScore);
      return scoreAfterRally;
    }

    let returnerWon = rally.result === RallyResult.PtReturner;
    if (rally.result === RallyResult.Fault) {
      if (serverScore.serve === 0) {
        serverScore.serve = 1;
        return scoreAfterRally;
      }
      returnerWon = true;
    }
    if (returnerWon) {
      updateSubjectWin(returnerScore, serverScore);
    }
    return scoreAfterRally;
  }

  inferWillBeMyServe(){}

  isSecondServe() {
    return this.scoreBeforeRally.p1.serve === 1 || this.scoreBeforeRally.p2.serve === 1;
  }

  isNewSet() {
    if (!this.isNewGame()) {
      return false;
    }
    return this.scoreBeforeRally.p1.games === 0 && this.scoreBeforeRally.p2.games === 0;
  }

  isNewGame() {
    if (this.scoreBeforeRally.numLets > 0) {
      return false;
    }
    return this.scoreBeforeRally.p1.points === 0 && this.scoreBeforeRally.p1.serve === 0
        && this.scoreBeforeRally.p2.points === 0 && this.scoreBeforeRally.p2.serve === 0;
  }

  isMyServeGame() {
    if (!isTieBreakTime(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2)) {
      return this.rally.isMyServe;
    }
      // For a tiebreak, the player who serve first is his serve game.
    const numTieBreakPtsMod4 = (this.scoreBeforeRally.p1.points + this.scoreBeforeRally.p2.points) % 4;
    if (numTieBreakPtsMod4 === 1 || numTieBreakPtsMod4 === 4) {
      return !this.rally.isMyServe;
    }
    return this.rally.isMyServe;
  }

  getPlotForNextRally() {
    const myGamePt = isSubjectGamePoint(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2);
    const oppoGamePt = isSubjectGamePoint(this.scoreBeforeRally.p2, this.scoreBeforeRally.p1);
    if (!myGamePt && !oppoGamePt) {
      return;
    }
    const winnerIsMe = this.winnerIsMe();
    const winnerIsOppo = this.winnerIsOppo();
    const myConversion = myGamePt && winnerIsMe;
    const oppoConversion = oppoGamePt && winnerIsOppo;
    if (!myConversion && !oppoConversion) {
      return;
    }

    return {
      text: 'Converted',
      isMyPlot: myConversion,
    };
  }

  toPlot() {
    const myGamePt = isSubjectGamePoint(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2);
    const oppoGamePt = isSubjectGamePoint(this.scoreBeforeRally.p2, this.scoreBeforeRally.p1);
    const isSetPt = isSubjectSetPoint(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2) || isSubjectSetPoint(this.scoreBeforeRally.p2, this.scoreBeforeRally.p1);
    const myServeGame = this.isMyServeGame();
    const isBreakPt = (myGamePt && !myServeGame) || (oppoGamePt && myServeGame);
    const emphasis = isBreakPt ? '*' : '';
    if (!myGamePt && !oppoGamePt) {
      return;
    }
    let text = 'Game Pt';
    if (isSetPt) {
      text = `${emphasis}Set Pt`;
    } else if (isBreakPt) {
      text = 'Break pt';
    }
    return {
      text: text,
      isMyPlot: myGamePt,
    };
  }
}

const whiteBall = `◯`;
const greenBall = `🟢`;
const yellowBall = `🟡`;
const redBall = `🔴`;
const redHeart = `🟥 `;

export function updateSubjectWin(subjectScore: PersonScore, otherScore: PersonScore) {
  if (isSubjectSetPoint(subjectScore, otherScore)) {
    subjectScore.gamesByCompletedSet.push(subjectScore.games + 1);
    subjectScore.games = 0;
    subjectScore.points = 0;
    subjectScore.serve = 0;
    otherScore.gamesByCompletedSet.push(otherScore.games);
    otherScore.games = 0;
    otherScore.points = 0;
    otherScore.serve = 0;
    return;
  }
  if (isSubjectGamePoint(subjectScore, otherScore)) {
    subjectScore.games += 1;
    subjectScore.points = 0;
    subjectScore.serve = 0;
    otherScore.points = 0;
    otherScore.serve = 0;
    return;
  }
  subjectScore.points += 1;
  subjectScore.serve = 0;
  otherScore.serve = 0;
}

function isSubjectGamePoint(subjectScore: PersonScore, otherScore: PersonScore) {
  let deuceScore = isTieBreakTime(subjectScore, otherScore) ? 6 : 3;
  return subjectScore.points >= deuceScore && subjectScore.points - otherScore.points >= 1;
}

function isSubjectSetPoint(subjectScore: PersonScore, otherScore: PersonScore) {
  if (!isSubjectGamePoint(subjectScore, otherScore)) {
    return false;
  }
  if (isTieBreakTime(subjectScore, otherScore)) {
    return true;
  }
  return subjectScore.games >= 5 && subjectScore.games - otherScore.games >= 1;
}


export function annotateMatchStat(rallyContexts: RallyContext[]) {
  const stat = new MatchStat();
  rallyContexts.forEach((rallyContext) => {
    rallyContext.matchStatBeforeRally = stat.clone();
    if (rallyContext.rally.result === RallyResult.Let) {
      return;
    }
    // Check game points and set points using direct score comparison
    if (isSubjectGamePoint(rallyContext.scoreBeforeRally.p1, rallyContext.scoreBeforeRally.p2)) {
      stat.p1Stats.numGamePts++;
      if (isSubjectSetPoint(rallyContext.scoreBeforeRally.p1, rallyContext.scoreBeforeRally.p2)) {
        stat.p1Stats.numSetPts++;
      }
    }
    if (isSubjectGamePoint(rallyContext.scoreBeforeRally.p2, rallyContext.scoreBeforeRally.p1)) {
      stat.p2Stats.numGamePts++;
      if (isSubjectSetPoint(rallyContext.scoreBeforeRally.p2, rallyContext.scoreBeforeRally.p1)) {
        stat.p2Stats.numSetPts++;
      }
    }

    const p1Won = rallyContext.winnerIsMe();
    const p2Won = rallyContext.winnerIsOppo();
    const isSecondServe = rallyContext.isSecondServe();
    const p1ShotQuality = p1Won ? rallyContext.rally.stat.winnerLastShotQuality : rallyContext.rally.stat.loserPreviousShotQuality;
    const p2ShotQuality = p2Won ? rallyContext.rally.stat.winnerLastShotQuality : rallyContext.rally.stat.loserPreviousShotQuality;
    const p1HasWeakShot = (p1ShotQuality > 0 && p1ShotQuality < 3) || (p2ShotQuality > 3 && p1ShotQuality <= 3);
    const p2HasWeakShot = (p2ShotQuality > 0 && p2ShotQuality < 3) || (p1ShotQuality > 3 && p2ShotQuality <= 3);
    if (p2HasWeakShot) {
      if (rallyContext.rally.isMyServe) {
        if (isSecondServe) {
          stat.p1Stats.numSecondServeForcingChances++;
        } else {
          stat.p1Stats.numFirstServeForcingChances++;
        }
      } else {
        if (isSecondServe) {
          stat.p2Stats.numSecondServeForcingChancesForReturner++;
        } else {
          stat.p2Stats.numFirstServeForcingChancesForReturner++;
        }
      }
    }
    if (p1HasWeakShot) {
      if (rallyContext.rally.isMyServe) {
        if (isSecondServe) {
          stat.p1Stats.numSecondServeForcingChancesForReturner++;
        } else {
          stat.p1Stats.numFirstServeForcingChancesForReturner++;
        }
      } else {
        if (isSecondServe) {
          stat.p2Stats.numSecondServeForcingChances++;
        } else {
          stat.p2Stats.numFirstServeForcingChances++;
        }
      }
    }

    function isReturnerPtForSecondServe(rallyContext: RallyContext) {
      if (!rallyContext.isSecondServe()) {
        return false;
      }
      return rallyContext.rally.result === RallyResult.PtReturner || rallyContext.rally.result === RallyResult.Fault;
    }
    if (rallyContext.rally.isMyServe) {
      const serverStats = stat.p1Stats;
      const isSecondServe = rallyContext.isSecondServe();
      
      if (isSecondServe) {
        serverStats.numSecondServes++;
        if (rallyContext.rally.result !== RallyResult.Fault) {
          serverStats.numSecondServesMade++;
          if (rallyContext.rally.result === RallyResult.PtServer) {
            serverStats.numSecondServesWon++;
            if (isForcingWin(rallyContext)) {
              serverStats.numSecondServeForcingWins++;
            }
          } else if (isReturnerPtForSecondServe(rallyContext) && isForcingWin(rallyContext)) {
            serverStats.numSecondServeForcingWinsByReturner++;
          }
        }
        if (isReturnerPtForSecondServe(rallyContext) && isUnforcedError(rallyContext)) {
          serverStats.numSecondServeUnforcedErrors++;
        }
        if (rallyContext.rally.result === RallyResult.PtServer && isUnforcedError(rallyContext)) {
          serverStats.numSecondServeUnforcedErrorsByReturner++;
        }
      } else {
        serverStats.numFirstServes++;
        if (rallyContext.rally.result !== RallyResult.Fault) {
          serverStats.numFirstServesMade++;
          if (rallyContext.rally.result === RallyResult.PtServer) {
            serverStats.numFirstServesWon++;
            if (isForcingWin(rallyContext)) {
              serverStats.numFirstServeForcingWins++;
            }
          } else if (rallyContext.rally.result === RallyResult.PtReturner && isForcingWin(rallyContext)) {
            serverStats.numFirstServeForcingWinsByReturner++;
          }
        }
        if (rallyContext.rally.result === RallyResult.PtReturner && isUnforcedError(rallyContext)) {
          serverStats.numFirstServeUnforcedErrors++;
        }
        if (rallyContext.rally.result === RallyResult.PtServer && isUnforcedError(rallyContext)) {
          serverStats.numFirstServeUnforcedErrorsByReturner++;
        }
      }
    } else {
      const serverStats = stat.p2Stats;
      const isSecondServe = rallyContext.isSecondServe();
      
      if (!isSecondServe) {
        serverStats.numFirstServes++;
        if (rallyContext.rally.result !== RallyResult.Fault) {
          serverStats.numFirstServesMade++;
          if (rallyContext.rally.result === RallyResult.PtServer) {
            serverStats.numFirstServesWon++;
            if (isForcingWin(rallyContext)) {
              serverStats.numFirstServeForcingWins++;
            }
          } else if (rallyContext.rally.result === RallyResult.PtReturner && isForcingWin(rallyContext)) {
            serverStats.numFirstServeForcingWinsByReturner++;
          }
        }
        if (rallyContext.rally.result === RallyResult.PtReturner && isUnforcedError(rallyContext)) {
          serverStats.numFirstServeUnforcedErrors++;
        }
        if (rallyContext.rally.result === RallyResult.PtServer && isUnforcedError(rallyContext)) {
          serverStats.numFirstServeUnforcedErrorsByReturner++;
        }
      } else {
        serverStats.numSecondServes++;
        if (rallyContext.rally.result !== RallyResult.Fault) {
          serverStats.numSecondServesMade++;
          if (rallyContext.rally.result === RallyResult.PtServer) {
            serverStats.numSecondServesWon++;
            if (isForcingWin(rallyContext)) {
              serverStats.numSecondServeForcingWins++;
            }
          } else if (isReturnerPtForSecondServe(rallyContext) && isForcingWin(rallyContext)) {
            serverStats.numSecondServeForcingWinsByReturner++;
          }
        }
        if (isReturnerPtForSecondServe(rallyContext) && isUnforcedError(rallyContext)) {
          serverStats.numSecondServeUnforcedErrors++;
        }
        if (rallyContext.rally.result === RallyResult.PtServer && isUnforcedError(rallyContext)) {
          serverStats.numSecondServeUnforcedErrorsByReturner++;
        }
      }
    }
  });
}
