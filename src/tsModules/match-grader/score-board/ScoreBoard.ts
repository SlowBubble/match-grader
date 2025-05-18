import { MatchData } from "../models/gradebook_models";
import { RallyContext } from "../models/rally_context";
import { isForcingWin, isSafeForcingWin } from "../models/risk_level";




export class ScoreBoard {
  public matchData = new MatchData;
  public rallyContexts: RallyContext[] = [];

  public rallyCtxIdx = 0;
  private memoizedTable: CellInfo[][] = [[]];

  // Must call this to set up things.
  setMatchData(matchData: MatchData) {
    this.matchData = matchData;
    this.rallyContexts = this.matchData.getRallyContexts();
  }
  setRallyCtxIdx(rallyCtxIdx: number) {
    this.rallyCtxIdx = rallyCtxIdx;
    this.memoizedTable = this.computeTable();
  }
  getTable(): CellInfo[][] {
    return this.memoizedTable;
  }
  render(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    const CELL_PADDING = 12;
    const textSize = 20;
    ctx.font = `bold ${textSize}px Arial`;
  
    // Calculate column widths
    const colWidths = new Array(this.memoizedTable[0].length).fill(0);
    this.memoizedTable.forEach(row => {
      row.forEach((cell, colIndex) => {
        const textWidth = ctx.measureText(cell.text).width;
        colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
      });
    });
  
    const textHeight = textSize * 3 / 4;
    const cellHeight = textHeight + (CELL_PADDING * 2);
    const totalTableHeight = cellHeight * this.memoizedTable.length;
    const xOffset = 10;
    const bottomMargin = 30;
    const yOffset = canvasHeight - totalTableHeight - bottomMargin;
  
    this.memoizedTable.forEach((row, rowIndex) => {
      let x = xOffset;
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidths[colIndex];
        ctx.fillStyle = cell.color || 'black';
        ctx.fillRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
        ctx.strokeStyle = 'white';
        ctx.strokeRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
        ctx.fillStyle = cell.textColor || 'white';
        ctx.fillText(cell.text, x + CELL_PADDING, yOffset + (rowIndex * cellHeight) + CELL_PADDING + textHeight);
        x += cellWidth;
      });
    });
  }

  private getScoreTable(): CellInfo[][] {
    const rallyCtx = this.rallyContexts[this.rallyCtxIdx];
    const score = rallyCtx.scoreBeforeRally;
    const isSecondServe = rallyCtx.isSecondServe();
    let p1ServeNum = 0;
    let p2ServeNum = 0;
    if (rallyCtx.rally.isMyServe) {
      p1ServeNum = isSecondServe ? 2 : 1;
    } else {
      p2ServeNum = isSecondServe ? 2 : 1;
    }
    const p1ServeStr = ''.padStart(p1ServeNum, '*');
    const p2ServeStr = ''.padStart(p2ServeNum, '*');
  
    let p1PointsColor = '';
    if (rallyCtx.rally.isMyServe) {
      p1PointsColor = getColor(score.p1.points - score.p2.points, isSecondServe);
    }
    let p2PointsColor = '';
    if (!rallyCtx.rally.isMyServe) {
      p2PointsColor = getColor(score.p2.points - score.p1.points, isSecondServe);
    }
    const row1 = [new CellInfo(this.matchData.myName)];
    const p1GamesBySet = score.p1.gamesByCompletedSet.concat([score.p1.games]);
    const p2GamesBySet = score.p2.gamesByCompletedSet.concat([score.p2.games]);
    p1GamesBySet.forEach((games, idx) => {
      row1.push(new CellInfo(games.toString(), getColorForGames(games - p2GamesBySet[idx]), 'black'));
    });
    row1.push(new CellInfo(`${score.getP1PointsStr()} ${p1ServeStr}`, p1PointsColor));
  
    const row2 = [new CellInfo(this.matchData.oppoName)];
    p2GamesBySet.forEach((games, idx) => {
      row2.push(new CellInfo(games.toString(), getColorForGames(games - p1GamesBySet[idx]), 'black'));
    });
    row2.push(new CellInfo(`${score.getP2PointsStr()} ${p2ServeStr}`, p2PointsColor));
    return [row1, row2];
  }
  private getHistoryTable(): CellInfo[][] {
    const row1: CellInfo[] = [];
    const row2: CellInfo[] = [];

    // Filter out all context to the right of the last one which isNewGame.
    const lastRallyIdx = this.rallyContexts
      .slice(0, this.rallyCtxIdx)
      .findLastIndex(rallyCtx => rallyCtx.isNewGame());
    const contexts = this.rallyContexts.slice(lastRallyIdx, this.rallyCtxIdx)
      .filter(rallyCtx => rallyCtx.winnerIsMe() || rallyCtx.winnerIsOppo());

    // If player 1 wins, add an O to row1, else add an O to row2
    contexts.forEach((rallyCtx) => {
      const resSymbol = getResultSymbol(
        rallyCtx.isDoubleFault(), rallyCtx.isSecondServe(),
        isForcingWin(rallyCtx), isSafeForcingWin(rallyCtx));
      if (rallyCtx.winnerIsMe()) {
        row1.push(new CellInfo(resSymbol));
        row2.push(new CellInfo(''));
      } else {
        row1.push(new CellInfo(''));
        row2.push(new CellInfo(resSymbol));
      }
    });
    return [row1, row2]
  }
  
  private computeTable(): CellInfo[][] {
    const tables = [];
    tables.push(this.getScoreTable());
    tables.push(this.getHistoryTable());
    const combined = [];
    // Combine the tables row by row
    for (let i = 0; i < Math.max(tables[0].length, tables[1].length); i++) {
      const row: CellInfo[] = [];
      tables.forEach(table => {
        if (i < table.length) {
          row.push(...table[i]);
        } else {
          row.push(new CellInfo());
        }
      });
      combined.push(row);
    }
    return combined;
  }
}

const easyWin = '🟢';
const mediumWin = '🟡';
const hardWin = '🔴';
const easyWinSecondServe = '🍏';
const mediumWinSecondServe = '🍋';
const hardWinSecondServe = '🍎';
const doubleFault = '💚';

function getResultSymbol(isDoubleFault = false, secondServe = false, isForced = false, isSafe = false): string {
  if (isDoubleFault) {
    return doubleFault;
  }
  if (isForced) {
    if (isSafe) {
      return secondServe ? mediumWinSecondServe : mediumWin;
    }
    return secondServe ? hardWinSecondServe : hardWin;
  }
  return secondServe ? easyWinSecondServe : easyWin;
}

class CellInfo {
  constructor(
    public text: string = '',
    public color: string = '',
    public textColor: string = '',
  ) {}
}

function getColor(num: number, isSecondServe = false): string {
  if (num >= 2) {
    return '#3a3';
  } else if (num >= 1) {
    return '#272';
  } else if (num === 0) {
    if (isSecondServe) {
      return '#600';
    }
    return '#152';
  } else if (num <= -1) {
    return '#b01';
  }
  return '#901';
}

function getColorForGames(num: number): string {
  if (num >= 2) {
    return '#ff6';
  } else if (num >= 0) {
    return '#fc0';
  }
  return '#ea0';
}
