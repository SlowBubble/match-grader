import { MatchData } from "../models/gradebook_models";
import { RallyContext } from "../models/rally_context";
import { isForcingWin, isSafeForcingWin } from "../models/risk_level";


// https://ethanschoonover.com/solarized/
const solarizedBase1 = '#ddd2c1';
const solarizedBase2 = '#eee8d5';  // Solarized Light secondary
const solarizedBase3 = '#fdf6e3';  
const solarizedContent = '#657b83';  // Solarized Light content

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

  private previousType: ScoreboardType = ScoreboardType.NONE;
  private transitionStartTime = 0;
  private readonly TRANSITION_DURATION = 1000; // milliseconds
  private readonly TABLE_TRANSITION_DURATION = 500; // milliseconds
  private readonly TABLE_DELAY = 500;  // Wait 4s for first row

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
    if (scoreboardType !== this.previousType) {
      this.previousType = scoreboardType;
      this.transitionStartTime = Date.now();
    }

    const elapsed = Date.now() - this.transitionStartTime;
    const opacity = Math.min(elapsed / this.TRANSITION_DURATION, 1);
    
    // Save context state
    ctx.save();
    ctx.globalAlpha = opacity;

    // Render based on type
    if (scoreboardType === ScoreboardType.CURRENT_SCORE) {
      this.renderScore(ctx, canvasHeight);
    } else if (scoreboardType === ScoreboardType.ALL_POINTS) {
      // this.renderScore(ctx, canvasHeight);
    } else if (scoreboardType === ScoreboardType.FINAL_STAT) {
      this.renderFinalStat(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.PREVIEW) {
      this.renderPreview(ctx, canvasWidth, canvasHeight);
    }

    // Restore context state
    ctx.restore();
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
    const elapsed = Date.now() - this.transitionStartTime;
    const CELL_PADDING = 15;
    const Y_CELL_PADDING = 30;
    const BORDER_WIDTH = 2;
    const textSize = 32;
    ctx.font = `bold ${textSize}px Arial`;

    // Fill canvas with Solarized Light color
    ctx.fillStyle = solarizedBase2;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (elapsed < this.TRANSITION_DURATION + this.TABLE_DELAY) {
      return;  // Skip rendering if not enough time has passed
    }

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
    const totalTableWidth = colWidths.reduce((sum, width) => sum + width, 0);
    const totalTableHeight = cellHeight * table.length;

    // Center the table on canvas
    const xOffset = (canvasWidth - totalTableWidth) / 2;
    const yOffset = (canvasHeight - totalTableHeight) / 2;

    table.forEach((row, rowIndex) => {
      // Calculate opacity for fade-in effect
      const fadeProgress = Math.min((elapsed - this.TABLE_DELAY - this.TRANSITION_DURATION) / this.TABLE_TRANSITION_DURATION, 1);
      ctx.save();
      ctx.globalAlpha = fadeProgress;

      let x = xOffset;
      const rowY = yOffset + (rowIndex * cellHeight);
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidths[colIndex];
        
        // Draw cell background - use Solarized Light secondary if no color specified
        ctx.fillStyle = cell.color || solarizedBase2;
        ctx.fillRect(x, rowY, cellWidth, cellHeight);

        // Add bottom border for first row
        if (rowIndex === 0) {
          ctx.fillStyle = solarizedContent;
          ctx.fillRect(x, rowY + cellHeight - BORDER_WIDTH, cellWidth, BORDER_WIDTH);
        }

        // Add vertical border after each cell (except last column)
        if (colIndex < row.length - 1) {
          ctx.fillStyle = solarizedContent;
          ctx.fillRect(x + cellWidth - BORDER_WIDTH/2, rowY, BORDER_WIDTH, cellHeight);
        }

        // Center text in cell - use Solarized Light content color if no color specified
        ctx.fillStyle = cell.textColor || solarizedContent;
        const textWidth = ctx.measureText(cell.text).width;
        const textX = x + (cellWidth - textWidth) / 2;
        const textY = rowY + cellHeight / 2 + textHeight / 2;
        ctx.fillText(cell.text, textX, textY);

        x += cellWidth;
      });

      ctx.restore();
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
        ctx.fillStyle = cell.color || solarizedBase1;
        ctx.fillRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
        ctx.strokeStyle = solarizedContent;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, yOffset + rowIndex * cellHeight, cellWidth, cellHeight);
        ctx.fillStyle = cell.textColor || solarizedContent;
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
      row1.push(new CellInfo(games.toString(), getColorForGames(games - p2GamesBySet[idx])));
    });
    row1.push(new CellInfo(`${score.getP1PointsStr()} ${p1ServeStr}`, '', p1PointsColor));
  
    const row2 = [new CellInfo(this.matchData.oppoName)];
    p2GamesBySet.forEach((games, idx) => {
      row2.push(new CellInfo(games.toString(), getColorForGames(games - p1GamesBySet[idx])));
    });
    row2.push(new CellInfo(`${score.getP2PointsStr()} ${p2ServeStr}`, '', p2PointsColor));
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
        row1.push(new CellInfo(resSymbol, solarizedBase3));
        row2.push(new CellInfo('', solarizedBase3));
      } else {
        row1.push(new CellInfo('', solarizedBase3));
        row2.push(new CellInfo(resSymbol, solarizedBase3));
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
      return Array.from({length: mult}, () => mediumWin).join(' ');
    }
    const p1PowerRally = stat.getP1ForcingChancePct();
    const p2PowerRally = stat.getP2ForcingChancePct();
    table.push([
      new CellInfo(getStr(p1PowerRally, p2PowerRally)),
      new CellInfo('Power'),
      new CellInfo(getStr(p1PowerRally, p2PowerRally, true)),
    ]);
    const p1ConsistencyRally = stat.getP2NumUnforcedErrorsExceptDoubleFaults();
    const p2ConsistencyRally = stat.getP1NumUnforcedErrorsExceptDoubleFaults();
    table.push([
      new CellInfo(getStr(p1ConsistencyRally, p2ConsistencyRally,)),
      new CellInfo('Consistent'),
      new CellInfo(getStr(p1ConsistencyRally, p2ConsistencyRally, true)),
    ]);

    const p1Power1stServe = stat.p1Stats.numFirstServeForcingChances;
    const p2Power1stServe = stat.p2Stats.numFirstServeForcingChances;
    table.push([
      new CellInfo(getStr(p1Power1stServe, p2Power1stServe)),
      new CellInfo('Power (1st)'),
      new CellInfo(getStr(p1Power1stServe, p2Power1stServe, true)),
    ]);
    const p1Consistency1stServe = stat.p1Stats.getFirstServePct();
    const p2Consistency1stServe = stat.p2Stats.getFirstServePct();
    table.push([
      new CellInfo(getStr(p1Consistency1stServe, p2Consistency1stServe)),
      new CellInfo('Consistent (1st)'),
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
      new CellInfo('Consistent (2nd)'),
      new CellInfo(getStr(p1Consistency2ndServe, p2Consistency2ndServe, true)),
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
      return parseInt(me) > parseInt(him) ? '#b01' : solarizedContent;
    }
    const p1Errors = stat.getP2PointsWon();
    const p2Errors = stat.getP1PointsWon();
    table.push([
      new CellInfo(p1Errors.toString(), '', getColor(p1Errors, p2Errors)),
      new CellInfo('Points Lost'),
      new CellInfo(p2Errors.toString(), '', getColor(p2Errors, p1Errors)),
    ]);
    // Forced Errors
    const p1ForcedErrors = stat.getP2NumForcingWins();
    const p2ForcedErrors = stat.getP1NumForcingWins();
    table.push([
      new CellInfo(p1ForcedErrors.toString(), '', getColor(p1ForcedErrors, p2ForcedErrors)),
      new CellInfo('Forced Errors'),
      new CellInfo(p2ForcedErrors.toString(), '', getColor(p2ForcedErrors, p1ForcedErrors)),
    ]);
    // Unforced Errors
    const p1UnforcedErrors = stat.getP1NumUnforcedErrors();
    const p2UnforcedErrors = stat.getP2NumUnforcedErrors();
    table.push([
      new CellInfo(p1UnforcedErrors.toString(), '', getColor(p1UnforcedErrors, p2UnforcedErrors)),
      new CellInfo('Unforced Errors'),
      new CellInfo(p2UnforcedErrors.toString(), '', getColor(p2UnforcedErrors, p1UnforcedErrors)),
    ]);
    // Double Faults
    const p1DoubleFaults = stat.p1Stats.numSecondServes - stat.p1Stats.numSecondServesMade;
    const p2DoubleFaults = stat.p2Stats.numSecondServes - stat.p2Stats.numSecondServesMade;
    table.push([
      new CellInfo(p1DoubleFaults.toString(), '', getColor(p1DoubleFaults, p2DoubleFaults)),
      new CellInfo('Double Faults'),
      new CellInfo(p2DoubleFaults.toString(), '', getColor(p2DoubleFaults, p1DoubleFaults)),
    ]);
    // 1st Serve %
    const p1FirstServePct = stat.p1Stats.getFirstServeMissPct();
    const p2FirstServePct = stat.p2Stats.getFirstServeMissPct();
    table.push([
      new CellInfo(p1FirstServePct.toString(), '', getColor(p1FirstServePct, p2FirstServePct)),
      new CellInfo('1st Serve Miss'),
      new CellInfo(p2FirstServePct.toString(), '', getColor(p2FirstServePct, p1FirstServePct)),
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

const easyWin = '⚫';
const mediumWin = '🟢';
const hardWin = '🔴';
const easyWinSecondServe = '⬛';
const mediumWinSecondServe = '🟩';
const hardWinSecondServe = '🟥';
const doubleFault = '🖤';

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
  if (num <= 0) {
    return solarizedBase1;
  }
  return solarizedBase3;
}
