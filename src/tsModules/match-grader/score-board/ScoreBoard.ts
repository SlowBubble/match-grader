import { MatchData } from "../models/gradebook_models";
import { RallyContext } from "../models/rally_context";
import { isForcingWin, isSafeForcingWin } from "../models/risk_level";


export enum ScoreboardType {
  NONE,
  PREVIEW,
  CURRENT_SCORE,
  FINAL_STAT,
  ALL_POINTS,
}

export class ScoreBoard {
  public matchData = new MatchData;
  public rallyContexts: RallyContext[] = [];

  public rallyCtxIdx = 0;
  private memoizedCurrentScoreTable: CellInfo[][] = [[]];
  private memoizedFinalStatTable: CellInfo[][] = [[]];
  private memoizedPreviewTable: CellInfo[][] = [[]];

  // Must call this to set up things.
  setMatchData(matchData: MatchData) {
    this.matchData = matchData;
    this.rallyContexts = this.matchData.getRallyContexts();
    console.log(this.rallyContexts);
    this.memoizedFinalStatTable = this.computeFinalStatTable();
    this.memoizedPreviewTable = this.computePreviewTable();
  }
  setRallyCtxIdx(rallyCtxIdx: number) {
    this.rallyCtxIdx = rallyCtxIdx;
    this.memoizedCurrentScoreTable = this.computeCurrentScoreTable();
  }
  render(scoreboardType: ScoreboardType, ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    if (scoreboardType === ScoreboardType.CURRENT_SCORE) {
      this.renderScore(ctx, canvasHeight);
    } else if (scoreboardType === ScoreboardType.ALL_POINTS) {
      // this.renderScore(ctx, canvasHeight);
    } else if (scoreboardType === ScoreboardType.FINAL_STAT) {
      this.renderFinalStat(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.PREVIEW) {
      this.renderPreview(ctx, canvasWidth, canvasHeight);
    }
  }

  private renderPreview(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedPreviewTable, ctx, canvasWidth, canvasHeight);
  }
  private renderFinalStat(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedFinalStatTable, ctx, canvasWidth, canvasHeight);
  }
  // Center the table in both x and y axis.
  // Align the text horizontally in each cell.
  // Make all cells the same width.
  // No borders for each cell.
  private renderComparison(table: CellInfo[][], ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    const CELL_PADDING = 15;
    const Y_CELL_PADDING = 30;
    const BLACK_BORDER = 40;  // Height of black border at top/bottom
    const SIDE_BORDER = 20;   // Width of black border at left/right
    const textSize = 32;
    ctx.font = `bold ${textSize}px Arial`;

    // Calculate maximum width needed for each column
    const colWidths = Array(table[0].length).fill(0);
    table.forEach(row => {
      row.forEach((cell, colIndex) => {
        const textWidth = ctx.measureText(cell.text).width;
        colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
      });
    });

    // Make all cells in each column the same width (use max width)
    const maxColWidth = Math.max(...colWidths);
    colWidths.fill(maxColWidth);

    const textHeight = textSize * 3 / 4;
    const cellHeight = textHeight + (Y_CELL_PADDING * 2);
    const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0) + (SIDE_BORDER * 2);
    const totalTableHeight = cellHeight * table.length + (BLACK_BORDER * 2);

    // Center the table on canvas
    const xOffset = (canvasWidth - totalTableWidth) / 2;
    const yOffset = (canvasHeight - totalTableHeight) / 2;

    // Draw black borders
    ctx.fillStyle = 'black';
    ctx.fillRect(xOffset, yOffset, totalTableWidth, BLACK_BORDER);  // Top border
    ctx.fillRect(xOffset, yOffset + totalTableHeight - BLACK_BORDER, totalTableWidth, BLACK_BORDER);  // Bottom border
    ctx.fillRect(xOffset, yOffset, SIDE_BORDER, totalTableHeight);  // Left border
    ctx.fillRect(xOffset + totalTableWidth - SIDE_BORDER, yOffset, SIDE_BORDER, totalTableHeight);  // Right border

    table.forEach((row, rowIndex) => {
      let x = xOffset + SIDE_BORDER;
      const rowY = yOffset + BLACK_BORDER + (rowIndex * cellHeight);
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidths[colIndex];
        
        // Draw cell background
        ctx.fillStyle = cell.color;
        ctx.fillRect(x, rowY, cellWidth, cellHeight);

        // Add black border around each cell
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 15;
        ctx.strokeRect(x, rowY, cellWidth, cellHeight);

        // Center text in cell
        ctx.fillStyle = cell.textColor;
        const textWidth = ctx.measureText(cell.text).width;
        const textX = x + (cellWidth - textWidth) / 2;
        const textY = rowY + cellHeight / 2 + textHeight / 2;
        ctx.fillText(cell.text, textX, textY);

        x += cellWidth;
      });
    });
  }

  private renderScore(ctx: CanvasRenderingContext2D, canvasHeight: number) {
    const CELL_PADDING = 12;
    const textSize = 20;
    ctx.font = `bold ${textSize}px Arial`;
  
    // Calculate column widths
    const colWidths = new Array(this.memoizedCurrentScoreTable[0].length).fill(0);
    this.memoizedCurrentScoreTable.forEach(row => {
      row.forEach((cell, colIndex) => {
        const textWidth = ctx.measureText(cell.text).width;
        colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
      });
    });
  
    const textHeight = textSize * 3 / 4;
    const cellHeight = textHeight + (CELL_PADDING * 2);
    const totalTableHeight = cellHeight * this.memoizedCurrentScoreTable.length;
    const xOffset = 10;
    const bottomMargin = 30;
    const yOffset = canvasHeight - totalTableHeight - bottomMargin;
  
    this.memoizedCurrentScoreTable.forEach((row, rowIndex) => {
      let x = xOffset;
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidths[colIndex];
        ctx.fillStyle = cell.color;
        ctx.fillRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
        ctx.fillStyle = cell.textColor;
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
  
  private computePreviewTable(): CellInfo[][] {
    const table = [];
    const stat = this.rallyContexts[this.rallyContexts.length - 1].matchStatBeforeRally;
    // Name
    table.push([
      new CellInfo(this.matchData.myName),
      new CellInfo(''),
      new CellInfo(this.matchData.oppoName),
    ]);

    // Errors
    function getMultiplier(me: any, him: any, reverse: boolean): number {
      const meNum = parseInt(me);
      const himNum = parseInt(him);
      const avg = Math.max((meNum + himNum) / 2, 0.01);
      let diff = (meNum - himNum) / avg;
      if (reverse) {
        diff = -diff;
      }
      if (diff < 0.1) {
        return 0;
      } else if (diff < 0.3) {
        return 1;
      } else if (diff < 0.7) {
        return 2;
      }
      return 3;
    }
    function getStr(me: any, him: any, reverse=false) {
      const mult = getMultiplier(me, him, reverse);
      if (mult === 0) {
        return '--';
      }
      return Array.from({length: mult}, () => easyWin).join(' ');
    }
    const p1Power1stServe = stat.p1Stats.numFirstServeForcingChances;
    const p2Power1stServe = stat.p2Stats.numFirstServeForcingChances;
    table.push([
      new CellInfo(getStr(p1Power1stServe, p2Power1stServe)),
      new CellInfo('Power (1st Serve)'),
      new CellInfo(getStr(p1Power1stServe, p2Power1stServe, true)),
    ]);
    const p1Consistency1stServe = stat.p1Stats.getFirstServePct();
    const p2Consistency1stServe = stat.p2Stats.getFirstServePct();
    table.push([
      new CellInfo(getStr(p1Consistency1stServe, p2Consistency1stServe)),
      new CellInfo('Consistency (1st)'),
      new CellInfo(getStr(p1Consistency1stServe, p2Consistency1stServe, true)),
    ]);

    const p1Power2ndServe = stat.p1Stats.numSecondServeForcingChances;
    const p2Power2ndServe = stat.p2Stats.numSecondServeForcingChances;
    table.push([
      new CellInfo(getStr(p1Power2ndServe, p2Power2ndServe)),
      new CellInfo('Power (2nd)'),
      new CellInfo(getStr(p1Power2ndServe, p2Power2ndServe, true)),
    ]);
    const p1Consistency2ndServe = stat.p1Stats.getSecondServePct();
    const p2Consistency2ndServe = stat.p2Stats.getSecondServePct();
    table.push([
      new CellInfo(getStr(p1Consistency2ndServe, p2Consistency2ndServe)),
      new CellInfo('Consistency (2nd)'),
      new CellInfo(getStr(p1Consistency2ndServe, p2Consistency2ndServe, true)),
    ]);

    const p1PowerRally = stat.getP1ForcingChancePct();
    const p2PowerRally = stat.getP2ForcingChancePct();
    table.push([
      new CellInfo(getStr(p1PowerRally, p2PowerRally)),
      new CellInfo('Power (Rally)'),
      new CellInfo(getStr(p1PowerRally, p2PowerRally, true)),
    ]);
    // TODO exclude double faults
    const p1ConsistencyRally = stat.getP2NumUnforcedErrorsExceptDoubleFaults();
    const p2ConsistencyRally = stat.getP1NumUnforcedErrorsExceptDoubleFaults();
    table.push([
      new CellInfo(getStr(p1ConsistencyRally, p2ConsistencyRally,)),
      new CellInfo('Consistency (Rally)'),
      new CellInfo(getStr(p1ConsistencyRally, p2ConsistencyRally, true)),
    ]);



    return table;
  }
  private computeFinalStatTable(): CellInfo[][] {
    const table = [];
    const stat = this.rallyContexts[this.rallyContexts.length - 1].matchStatBeforeRally;
    // Name
    table.push([
      new CellInfo(this.matchData.myName),
      new CellInfo(''),
      new CellInfo(this.matchData.oppoName),
    ]);

    // Errors
    function getColor(me: any, him: any): string {
      return parseInt(me) > parseInt(him) ? '#b01' : 'black';
    }
    const p1Errors = stat.getP2PointsWon();
    const p2Errors = stat.getP1PointsWon();
    table.push([
      new CellInfo(p1Errors.toString(), getColor(p1Errors, p2Errors)),
      new CellInfo('Points Lost'),
      new CellInfo(p2Errors.toString(), getColor(p2Errors, p1Errors)),
    ]);
    // Forced Errors
    const p1ForcedErrors = stat.getP2NumForcingWins();
    const p2ForcedErrors = stat.getP1NumForcingWins();
    table.push([
      new CellInfo(p1ForcedErrors.toString(), getColor(p1ForcedErrors, p2ForcedErrors)),
      new CellInfo('Forced Errors'),
      new CellInfo(p2ForcedErrors.toString(), getColor(p2ForcedErrors, p1ForcedErrors)),
    ]);
    // Unforced Errors
    const p1UnforcedErrors = stat.getP1NumUnforcedErrors();
    const p2UnforcedErrors = stat.getP2NumUnforcedErrors();
    table.push([
      new CellInfo(p1UnforcedErrors.toString(), getColor(p1UnforcedErrors, p2UnforcedErrors)),
      new CellInfo('Unforced Errors'),
      new CellInfo(p2UnforcedErrors.toString(), getColor(p2UnforcedErrors, p1UnforcedErrors)),
    ]);
    // Double Faults
    const p1DoubleFaults = stat.p1Stats.numSecondServes - stat.p1Stats.numSecondServesMade;
    const p2DoubleFaults = stat.p2Stats.numSecondServes - stat.p2Stats.numSecondServesMade;
    table.push([
      new CellInfo(p1DoubleFaults.toString(), getColor(p1DoubleFaults, p2DoubleFaults)),
      new CellInfo('Double Faults'),
      new CellInfo(p2DoubleFaults.toString(), getColor(p2DoubleFaults, p1DoubleFaults)),
    ]);
    // 1st Serve %
    const p1FirstServePct = stat.p1Stats.getFirstServePct();
    const p2FirstServePct = stat.p2Stats.getFirstServePct();
    table.push([
      new CellInfo(p1FirstServePct.toString(), getColor(p1FirstServePct, p2FirstServePct)),
      new CellInfo('1st Serve Miss'),
      new CellInfo(p2FirstServePct.toString(), getColor(p2FirstServePct, p1FirstServePct)),
    ]);
    return table;
  }
  private computeCurrentScoreTable(): CellInfo[][] {
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
    public color: string = 'black',
    public textColor: string = 'white',
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
