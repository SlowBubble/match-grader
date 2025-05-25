import { RallyContext } from "../models/rally_context";
import { isForcingWin, isSafeForcingWin } from "../models/risk_level";
import { Score } from "../models/score";

export const easyWin = '🥬';
export const mediumWin = '🍋';
export const hardWin = '🌶️';
const easyWinSecondServe = `${easyWin}*`;
const mediumWinSecondServe = `${mediumWin}*`;
const hardWinSecondServe = `${hardWin}*`;
const doubleFault = `${easyWin}**`;

export enum Level {
  None = 'None',
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
}

class PointEasiness {
  constructor(
    public isForcingWin = false,
    public isSafeForcingWin = false,
    public isDoubleFault = false,
    public isSecondServe = false,
    public winnerIsMe = false,
    public serverIsMe = false,
    public scoreBeforeRally: Score = new Score(),
  ) {}
  getStr(winnerIsMe: boolean) {
    if (winnerIsMe !== this.winnerIsMe) {
      return '';
    }
    if (this.isDoubleFault) {
      return doubleFault;
    }
    if (this.isForcingWin) {
      if (this.isSafeForcingWin) {
        return this.isSecondServe ? mediumWinSecondServe : mediumWin;
      }
      return this.isSecondServe ? hardWinSecondServe : hardWin;
    }
    return this.isSecondServe ? easyWinSecondServe : easyWin;
  }
  getLevel(winnerIsMe: boolean) {
    if (winnerIsMe !== this.winnerIsMe) {
      return Level.None;
    }
    if (this.isDoubleFault) {
      return Level.Easy;
    }
    if (this.isForcingWin) {
      if (this.isSafeForcingWin) {
        return Level.Medium;
      }
      return Level.Hard;
    }
    return Level.Easy;
  }
}

export function getRallyContextsByGame(rallyContexts: RallyContext[]): RallyContext[][] {
  const games: RallyContext[][] = [];
  let currentGame: RallyContext[] = [];
  
  rallyContexts.forEach((rallyCtx) => {
    if (rallyCtx.isNewGame() && currentGame.length > 0) {
      games.push(currentGame);
      currentGame = [];
    }
    currentGame.push(rallyCtx);
  });
  
  // Push the last game if it has any rallies
  if (currentGame.length > 0) {
    games.push(currentGame);
  }

  return games;
}

export function getEasinessByGame(rallyContexts: RallyContext[]): PointEasiness[][] {
  return getRallyContextsByGame(rallyContexts).map((game) => {
    return game.filter(rallyCtx => rallyCtx.winnerIsMe() || rallyCtx.winnerIsOppo()).map((rallyCtx) => {
      return new PointEasiness(
        isForcingWin(rallyCtx),
        isSafeForcingWin(rallyCtx),
        rallyCtx.isDoubleFault(),
        rallyCtx.isSecondServe(),
        rallyCtx.winnerIsMe(),
        rallyCtx.rally.isMyServe,
        rallyCtx.scoreBeforeRally,
      );
    });
  });
}

export function getEasinessForGame(rallyContexts: RallyContext[], rallyCtxIdx: number): PointEasiness[] {
  const games = getEasinessByGame(rallyContexts.slice(0, rallyCtxIdx));
  return games[games.length - 1] || [];
}