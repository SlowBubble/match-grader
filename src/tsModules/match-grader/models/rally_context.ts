import { Rally, RallyResult } from "./rally";
import {  isTieBreakTime, PersonScore, Score } from "./score";

export class RallyContext {
  constructor(
    public rally = new Rally(),
    public scoreBeforeRally = new Score(),
  ) {}

  getResultStr(myName: string, oppoName: string) {
    const server = this.rally.isMyServe ? myName : oppoName;
    const returner = this.rally.isMyServe ? oppoName : myName;
    if (this.rally.result === RallyResult.PtServer) {
      return `Pt. ${server}`;
    } else if (this.rally.result === RallyResult.PtReturner) {
      return `Pt. ${returner}`;
    } else if (this.rally.result === RallyResult.Fault) {
      if (this.isSecondServe()) {
        return this.rally.isMyServe ? `${redHeart} ${whiteBall}` : `${whiteBall} ${redHeart}`;
      }
      return this.rally.isMyServe ? `${yellowBall} ${whiteBall}` : `${whiteBall} ${yellowBall}`;
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

  getScoreAfterRally() {
    const rally = this.rally;
    const scoreAfterRally = this.scoreBeforeRally.clone();

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

  // getPlotForNextRally() {
  //   const myGamePt = isSubjectGamePoint(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2);
  //   const oppoGamePt = isSubjectGamePoint(this.scoreBeforeRally.p2, this.scoreBeforeRally.p1);

  //   const isMyPlot = (
  //     this.scoreBeforeRally.isServerPt && !this.rally.isMyServe) ||
  //     (this.scoreBeforeRally.isReturnerPt && this.rally.isMyServe);
  //   return {
  //     text: converting ? 'Converted' : '',
  //     isMyPlot: isMyPlot,
  //   };
  // }

  toPlot() {
    const strs = [];

    const myGamePt = isSubjectGamePoint(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2);
    const oppoGamePt = isSubjectGamePoint(this.scoreBeforeRally.p2, this.scoreBeforeRally.p1);
    const isSetPt = isSubjectSetPoint(this.scoreBeforeRally.p1, this.scoreBeforeRally.p2) || isSubjectSetPoint(this.scoreBeforeRally.p2, this.scoreBeforeRally.p1);
    const myServeGame = this.isMyServeGame();
    const isBreakPt = (myGamePt && !myServeGame) || (oppoGamePt && myServeGame);
    const emphasis = isBreakPt ? '*' : '';
    let isMyPlot = false;
    if (myGamePt || oppoGamePt) {
      if (isSetPt) {
        strs.push(`${emphasis}Set Pt`);
      } else if (isBreakPt) {
        strs.push('Break pt');
      } else {
        strs.push(`Game Pt`);
      }
      isMyPlot = myGamePt;
    }
    return {
      text: strs.join(' '),
      isMyPlot: isMyPlot,
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

export function isSubjectGamePoint(subjectScore: PersonScore, otherScore: PersonScore) {
  let deuceScore = isTieBreakTime(subjectScore, otherScore) ? 6 : 3;
  return subjectScore.points >= deuceScore && subjectScore.points - otherScore.points >= 1;
}

export function isSubjectSetPoint(subjectScore: PersonScore, otherScore: PersonScore) {
  if (!isSubjectGamePoint(subjectScore, otherScore)) {
    return false;
  }
  if (isTieBreakTime(subjectScore, otherScore)) {
    return true;
  }
  return subjectScore.games >= 5 && subjectScore.games - otherScore.games >= 1;
}
