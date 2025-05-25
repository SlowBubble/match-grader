import { MatchData } from "../models/gradebook_models";
import { RallyContext } from "../models/rally_context";
import { easyWin, getEasinessByGame, getEasinessForGame, hardWin, Level, mediumWin } from "./stat";


// https://ethanschoonover.com/solarized/
const solarizedBase1 = '#ddd2c1';
const solarizedBase1a = '#e8e3cc';  // Solarized Light secondary
const solarizedBase2 = '#eee8d5';  // Solarized Light secondary
const solarizedBase3 = '#fdf6e3';  
const solarizedContent = '#657b83';  // Solarized Light content

export enum ScoreboardType {
  NONE,
  NAMES,
  PREVIEW,
  CURRENT_SCORE,
  CURRENT_SCORE_WITH_HISTORY,
  END_OF_GAME_STAT,
  END_OF_MATCH_STAT_1,
  END_OF_MATCH_STAT_2,
  END_OF_MATCH_STAT_3,
  END_OF_MATCH_STAT_4,
  END_OF_MATCH_STAT_5,
  END_OF_MATCH_STAT_6,
  END_OF_MATCH_STAT_7,
  END_OF_MATCH_STAT_8,
  END_OF_MATCH_STAT_9,
}

export class ScoreBoard {
  public matchData = new MatchData;
  public rallyContexts: RallyContext[] = [];

  public rallyCtxIdx = 0;
  private memoizedCurrentScoreTable: CellInfo[][] = [[]];
  private memoizedCurrentScoreTableWithHistory: CellInfo[][] = [[]];
  private memoizedMatchStat1: CellInfo[][] = [[]];
  private memoizedMatchStat2: CellInfo[][] = [[]];
  private memoizedMatchStat3: CellInfo[][] = [[]];
  private memoizedMatchStat4: CellInfo[][] = [[]];
  private memoizedMatchStat5: CellInfo[][] = [[]];
  private memoizedMatchStat6: CellInfo[][] = [[]];
  private memoizedMatchStat7: CellInfo[][] = [[]];
  private memoizedMatchStat8: CellInfo[][] = [[]];
  private memoizedP1MatchStat9: CellInfo[][] = [[]];
  private memoizedP2MatchStat9: CellInfo[][] = [[]];
  private memoizedPreviewTable: CellInfo[][] = [[]];
  private memoizedEndOfGameTable: CellInfo[][] = [[]];
  private memoizedSxSTextSize: number | null = null;

  private previousType: ScoreboardType = ScoreboardType.NONE;
  private transitionStartTime = 0;
  private readonly TRANSITION_DURATION = 500; // from paused video to blank screen
  private readonly TABLE_DELAY = 200;  // from blank screen to table transition
  private readonly TABLE_TRANSITION_DURATION = 300; // from table transition to full table

  // Must call this to set up things.
  setMatchData(matchData: MatchData) {
    this.matchData = matchData;
    this.rallyContexts = this.matchData.getRallyContexts();
    console.log(this.rallyContexts);
    this.memoizedPreviewTable = this.computePreviewTable();
    this.memoizedMatchStat1 = this.computeMatchStat();
    this.memoizedMatchStat2 = this.computeEasinessStat();
    // Serving
    this.memoizedMatchStat3 = this.computeEasinessStat(true, false);
    // Serving (1st)
    this.memoizedMatchStat4 = this.computeEasinessStat(true, false, true, false);
    // Serving (2nd)
    this.memoizedMatchStat5 = this.computeEasinessStat(true, false, false);
    // Returning
    this.memoizedMatchStat6 = this.computeEasinessStat(false, true);
    // Returning (1st)
    this.memoizedMatchStat7 = this.computeEasinessStat(false, true, true, false);
    // Returning (2nd)
    this.memoizedMatchStat8 = this.computeEasinessStat(false, true, false); 
    this.memoizedP1MatchStat9 = this.getMatchHistory(true, false);
    this.memoizedP2MatchStat9 = this.getMatchHistory(false, true);
  }
  setRallyCtxIdx(rallyCtxIdx: number) {
    this.rallyCtxIdx = rallyCtxIdx;
    this.memoizedCurrentScoreTable = this.computeCurrentScoreTable();
    this.memoizedCurrentScoreTableWithHistory = this.computeCurrentScoreTable(true);
    this.memoizedEndOfGameTable = this.computeMatchStat(true, true);
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
    } else if (scoreboardType === ScoreboardType.CURRENT_SCORE_WITH_HISTORY) {
      this.renderScore(ctx, canvasHeight, true);
    } else if (scoreboardType === ScoreboardType.END_OF_GAME_STAT) {
      this.renderGameStat(ctx, canvasWidth, canvasHeight);
      this.renderScore(ctx, canvasHeight, true);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_1) {
      this.renderMatchStat1(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_2) {
      this.renderMatchStat2(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_3) {
      this.renderMatchStat3(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_4) {
      this.renderMatchStat4(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_5) {
      this.renderMatchStat5(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_6) {
      this.renderMatchStat6(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_7) {
      this.renderMatchStat7(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_8) {
      this.renderMatchStat8(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.END_OF_MATCH_STAT_9) {
      this.renderMatchStat9(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.NAMES) {
      this.renderNames(ctx, canvasWidth, canvasHeight);
    } else if (scoreboardType === ScoreboardType.PREVIEW) {
      this.renderPreview(ctx, canvasWidth, canvasHeight);
    }

    // Restore context state
    ctx.restore();
  }

  // Show p1 name centering on the lower left quandrant and p2 name centering on the upper right quandrant
  private renderNames(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.matchData.p1IsOnFarSide;
    const textSize = Math.min(canvasWidth / 20 / 2, canvasHeight / 10 / 2);
    ctx.font = `bold ${textSize}px Arial`;
    ctx.fillStyle = 'white';

    const p1 = this.matchData.myName;
    const p2 = this.matchData.oppoName;
    // Player 1 name in lower left quadrant
    const nearSideNameText =  this.matchData.p1IsOnFarSide ? p2 : p1;
    const nearSideNameWidth = ctx.measureText(nearSideNameText).width;
    const nearSideNameX = (canvasWidth * 3/4) - (nearSideNameWidth/2);
    const nearSideNameY = (canvasHeight * 4/5);
    ctx.fillText(nearSideNameText, nearSideNameX, nearSideNameY);

    // Player 2 name in upper right quadrant
    const farSideNameText = this.matchData.p1IsOnFarSide ? p1 : p2;
    const farSideNameWidth = ctx.measureText(farSideNameText).width;
    const farSideNameX = (canvasWidth * 3/4) - (farSideNameWidth/2);
    const farSideNameY = (canvasHeight/2.5);
    ctx.fillText(farSideNameText, farSideNameX, farSideNameY);
  }

  private renderGameStat(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedEndOfGameTable, ctx, canvasWidth, canvasHeight);
  }
  private renderPreview(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedPreviewTable, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat1(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat1, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat2(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat2, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat3(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat3, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat4(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat4, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat5(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat5, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat6(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat6, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat7(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat7, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat8(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderComparison(this.memoizedMatchStat8, ctx, canvasWidth, canvasHeight);
  }
  private renderMatchStat9(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    this.renderSxsTables(ctx, canvasWidth, canvasHeight);
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

  private renderSxsTables(ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number) {
    ctx.fillStyle = solarizedBase2;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    const table = this.memoizedP1MatchStat9;
    const table2 = this.memoizedP2MatchStat9;

    if (!this.memoizedSxSTextSize) {
      // Find optimal text size
      let testSize = 31;
      while (testSize > 1) {
        const CELL_PADDING = testSize / 4;
        ctx.font = `bold ${testSize}px Arial`;

        // Calculate dimensions with this text size
        let numCols = 0;
        let totalRows = 0;
        [table, table2].forEach(tbl => {
          numCols = Math.max(numCols, ...tbl.map(row => row.length));
          totalRows = Math.max(totalRows, tbl.length);
        });

        const colWidths = new Array(numCols).fill(0);
        [table, table2].forEach(tbl => {
          tbl.forEach(row => {
            row.forEach((cell, colIndex) => {
              const textWidth = ctx.measureText(cell.text).width;
              colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
            });
          });
        });

        const totalWidth = (colWidths.reduce((sum, w) => sum + w, 0) * 2) + 20; // *2 for both tables + gap
        const textHeight = testSize * 3 / 4;
        const cellHeight = textHeight + (CELL_PADDING * 2);
        const totalHeight = cellHeight * totalRows + 30; // +30 for top margin

        if (totalWidth <= canvasWidth && totalHeight <= canvasHeight) {
          this.memoizedSxSTextSize = testSize;
          break;
        }
        testSize -= 2;
      }
    }
    if (!this.memoizedSxSTextSize) {
      this.memoizedSxSTextSize = 12; // Fallback to 12 if computation fails
    }
    const textSize = this.memoizedSxSTextSize;
    const CELL_PADDING = textSize / 4;
    ctx.font = `bold ${textSize}px Arial`;
  
    // Calculate column widths for both tables
    let numCols = 0;
    table.forEach(row => {
      numCols = Math.max(numCols, row.length);
    });
    table2.forEach(row => {
      numCols = Math.max(numCols, row.length);
    });
    const colWidths = new Array(numCols).fill(0);
    [table, table2].forEach(tbl => {
      tbl.forEach(row => {
        row.forEach((cell, colIndex) => {
          const textWidth = ctx.measureText(cell.text).width;
          colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
        });
      });
    });
  
    const textHeight = textSize * 3 / 4;
    const cellHeight = textHeight + (CELL_PADDING * 2);
    const topMargin = 30;
    const yOffset = topMargin;
    const centerX = canvasWidth / 2;

    // Calculate total width needed per cell
    let maxTableWidth = 0;
    [table, table2].forEach(tbl => {
      let tableWidth = 0;
      tbl.forEach(row => {
        let rowWidth = 0;
        row.forEach((_, colIndex) => rowWidth += colWidths[colIndex]);
        tableWidth = Math.max(tableWidth, rowWidth);
      });
      maxTableWidth = Math.max(maxTableWidth, tableWidth);
    });

    // Render left table (table1)
    table.forEach((row, rowIndex) => {
      let x = centerX - maxTableWidth - 10;
      const rowY = yOffset + rowIndex * cellHeight;
      const rowWidth = row.reduce((sum, _, i) => sum + colWidths[i], 0);
      
      // For non-score row
      if (rowIndex > 0 && !row.some(cell => cell.text.startsWith('-'))) {
        // Draw cells background first
        row.forEach((cell, colIndex) => {
          const cellWidth = colWidths[colIndex];
          ctx.fillStyle = cell.color || solarizedBase1;
          ctx.fillRect(x, rowY, cellWidth, cellHeight);
          x += cellWidth;
        });
        
        // Draw single border for whole row.
        x = centerX - maxTableWidth - 10;
        ctx.strokeStyle = solarizedContent;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, rowY, rowWidth, cellHeight);
      }

      // Draw text for each cell
      x = centerX - maxTableWidth - 10;
      let cellCount = 0;
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidths[colIndex];
        ctx.fillStyle = cell.textColor || solarizedContent;
        const textWidth = ctx.measureText(cell.text).width;
        const textX = x + (cellWidth - textWidth) / 2;
        const textY = rowY + (cellHeight + textHeight) / 2;
        ctx.fillText(cell.text, textX, textY);
        cellCount++;
        if (cell.drawRightBorder) {
          ctx.fillStyle = '#bbb';
          ctx.fillRect(x + cellWidth - 2, rowY, 4, cellHeight);
        }
        x += cellWidth;
      });
    });

    // Render right table (table2) - flipped horizontally
    table2.forEach((row, rowIndex) => {
      let x = centerX + 10;
      const rowY = yOffset + rowIndex * cellHeight;
      const rowWidth = row.reduce((sum, _, i) => sum + colWidths[i], 0);
      // For non-score row
      if (rowIndex > 0 && !row.some(cell => cell.text.startsWith('-'))) {

        // Draw cells background first
        row.forEach((cell, colIndex) => {
          const cellWidth = colWidths[colIndex];
          ctx.fillStyle = cell.color || solarizedBase1;
          ctx.fillRect(x, rowY, cellWidth, cellHeight);
          x += cellWidth;
        });

        // Draw single border for whole row for non-score row.
        x = centerX + 10;
        ctx.strokeStyle = solarizedContent;
        ctx.lineWidth = 3;
        ctx.strokeRect(x, rowY, rowWidth, cellHeight);
      }

      // Draw text for each cell
      x = centerX + 10;
      let cellCount = 0;
      row.forEach((cell, colIndex) => {
        const cellWidth = colWidths[colIndex];
        ctx.fillStyle = cell.textColor || solarizedContent;
        const textWidth = ctx.measureText(cell.text).width;
        const textX = x + (cellWidth - textWidth) / 2;
        const textY = rowY + (cellHeight + textHeight) / 2;
        ctx.fillText(cell.text, textX, textY);
        cellCount++;
        if (cell.drawRightBorder) {
          ctx.fillStyle = '#bbb';
          ctx.fillRect(x + cellWidth - 2, rowY, 4, cellHeight);
        }
        x += cellWidth;
      });
    });
  }

  private renderScore(ctx: CanvasRenderingContext2D, canvasHeight: number, withHistory = false) {
    const table = withHistory ? this.memoizedCurrentScoreTableWithHistory : this.memoizedCurrentScoreTable;
    const CELL_PADDING = 12;
    const textSize = 20;
    ctx.font = `bold ${textSize}px Arial`;
  
    // Calculate column widths
    const colWidths = new Array(table[0].length).fill(0);
    table.forEach(row => {
      row.forEach((cell, colIndex) => {
        const textWidth = ctx.measureText(cell.text).width;
        colWidths[colIndex] = Math.max(colWidths[colIndex], textWidth + (CELL_PADDING * 2));
      });
    });
  
    const textHeight = textSize * 3 / 4;
    const cellHeight = textHeight + (CELL_PADDING * 2);
    const totalTableHeight = cellHeight * table.length;
    const xOffset = 10;
    const bottomMargin = 30;
    const yOffset = canvasHeight - totalTableHeight - bottomMargin;
  
    table.forEach((row, rowIndex) => {
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

  private getGameHistory(): CellInfo[][] {
    const row1: CellInfo[] = [];
    const row2: CellInfo[] = [];

    getEasinessForGame(this.rallyContexts, this.rallyCtxIdx).forEach((easiness) => {
      row1.push(new CellInfo(easiness.getStr(true), solarizedBase3));
      row2.push(new CellInfo(easiness.getStr(false), solarizedBase3));
    });
    return [row1, row2]
  }
  private getMatchHistory(includeP1Serving = true, includeP2Serving = true): CellInfo[][] {
    const firstServerIsP1 = true;
    const rows: CellInfo[][] = [];
    if (firstServerIsP1 != includeP1Serving) {
      rows.push([new CellInfo(''), new CellInfo(''), new CellInfo('')]);
    }
    getEasinessByGame(this.rallyContexts)
    .filter(game => game.length > 0)
    .forEach((game, gameIdx) => {
      const p1IsServing = firstServerIsP1 && gameIdx % 2 == 0;
      if (!includeP1Serving && p1IsServing) {
        return;
      }
      if (!includeP2Serving && !p1IsServing) {
        return;
      }
      // Note that the color in this row is hard-coded in the rendering function.
      const numP1Wins = game.filter((easiness) => {
        return easiness.winnerIsMe;
      }).length;
      const numP2Wins = game.length - numP1Wins;
      const p1Won = numP1Wins > numP2Wins;
      let p1Games = game[0].scoreBeforeRally.p1.games;
      let p2Games = game[0].scoreBeforeRally.p2.games;
      if (p1Won) {
        p1Games += 1;
      } else {
        p2Games += 1;
      }
      function getColor(me: any, him: any): string {
        if (parseInt(me) < parseInt(him)) {
          return '#b01';
        }
        if (parseInt(me) > parseInt(him)) {
          return '#0b1';
        }
        return solarizedContent;
      }
      const color = p1IsServing ? getColor(numP1Wins, numP2Wins) : getColor(numP2Wins, numP1Wins);
      const row0 = [
        new CellInfo(p1Games.toString(), '', color),
        new CellInfo('-', '', color),
        new CellInfo(p2Games.toString(), '', color),
      ];
      rows.push(row0);
      let row1: CellInfo[] = [];
      let row2: CellInfo[] = [];
      rows.push(row1);
      rows.push(row2);
      let cellCount = 0;
      let ptDiff = 0;
      game.forEach((easiness, ptIdx) => {
        if (easiness.winnerIsMe) {
          ptDiff += 1;
        } else {
          ptDiff -= 1;
        }
        let drawRightBorder = false;
        if (ptIdx >= 3) {
          if (ptDiff === 0) {
            drawRightBorder = true;
          }
        }
        row1.push(new CellInfo(easiness.getStr(true), solarizedBase3, '', drawRightBorder));
        row2.push(new CellInfo(easiness.getStr(false), solarizedBase1a, '', drawRightBorder));
        cellCount++;
        if (cellCount === 12) {
          // Start new rows
          cellCount = 0;
          row1 = [];
          row2 = [];
          rows.push(row1);
          rows.push(row2);
        }
      });
    });
    return rows;
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
      return Array.from({length: mult}, () => '🟢').join(' ');
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
  private computeEasinessStat(includeServing = true, includeReturning = true, includeFirstServe = true, includeSecondServe = true): CellInfo[][] {
    const table: CellInfo[][] = [];
    const p1LevelToCount = new Map();
    const p2LevelToCount = new Map();
    getEasinessByGame(this.rallyContexts).flat().forEach((easiness) => {
      const isSecondServe = easiness.isSecondServe;
      
      // Skip if this serve type should not be included
      if ((isSecondServe && !includeSecondServe) || (!isSecondServe && !includeFirstServe)) {
        return;
      }

      const p1Level = easiness.getLevel(true);
      if (!p1LevelToCount.has(p1Level)) {
        p1LevelToCount.set(p1Level, 0);
      }
      const includeP1 = (includeServing && easiness.serverIsMe) || (includeReturning && !easiness.serverIsMe);
      if (includeP1) {
        p1LevelToCount.set(p1Level, p1LevelToCount.get(p1Level) + 1);
      }

      const p2Level = easiness.getLevel(false);
      if (!p2LevelToCount.has(p2Level)) {
        p2LevelToCount.set(p2Level, 0);
      }
      const includeP2 = (includeServing && !easiness.serverIsMe) || (includeReturning && easiness.serverIsMe);
      if (includeP2) {
        p2LevelToCount.set(p2Level, p2LevelToCount.get(p2Level) + 1);
      }
    });
    let title = '';
    if (!includeServing) {
      title = 'Returning';
    }
    if (!includeReturning) {
      title = 'Serving';
    }
    if (!includeFirstServe) {
      title += ' (2nd)';
    }
    if (!includeSecondServe) {
      title += ' (1st)';
    }
    table.push([
      new CellInfo(this.matchData.myName),
      new CellInfo(title, '', 'black'),
      new CellInfo(this.matchData.oppoName),
    ]);
    function getColor(me: any, him: any): string {
      return parseInt(me) > parseInt(him) ? '#3a3' : solarizedContent;
    }
    const p1EasyCount = p1LevelToCount.get(Level.Easy) || 0;
    const p2EasyCount = p2LevelToCount.get(Level.Easy) || 0;
    const p1MediumCount = p1LevelToCount.get(Level.Medium) || 0;
    const p2MediumCount = p2LevelToCount.get(Level.Medium) || 0;
    const p1HardCount = p1LevelToCount.get(Level.Hard) || 0;
    const p2HardCount = p2LevelToCount.get(Level.Hard) || 0;
    const p1NoneCount = p1LevelToCount.get(Level.None) || 0;
    const p2NoneCount = p2LevelToCount.get(Level.None) || 0;
    const p1Points = p1EasyCount + p1MediumCount + p1HardCount;
    const p2Points = p2EasyCount + p2MediumCount + p2HardCount;
    const p1Chances = p1Points + p1NoneCount;
    const p2Chances = p2Points + p2NoneCount;
    const p1Denom = Math.max(p1Chances, 1);
    const p2Denom = Math.max(p2Chances, 1);
    const p1EasyPct = Math.round((p1EasyCount / p1Denom) * 100);
    const p2EasyPct = Math.round((p2EasyCount / p2Denom) * 100);
    const p1MediumPct = Math.round((p1MediumCount / p1Denom) * 100);
    const p2MediumPct = Math.round((p2MediumCount / p2Denom) * 100);
    const p1HardPct = Math.round((p1HardCount / p1Denom) * 100);
    const p2HardPct = Math.round((p2HardCount / p2Denom) * 100);
    const p1PointsPct = Math.round((p1Points / p1Denom) * 100);
    const p2PointsPct = Math.round((p2Points / p2Denom) * 100);
    table.push([
      new CellInfo(p1Chances.toString()),
      new CellInfo('Chances'),
      new CellInfo(p2Chances.toString()),
    ]);
    table.push([
      new CellInfo(p1PointsPct.toString() + '%', '', getColor(p1PointsPct, p2PointsPct)),
      new CellInfo('Wins'),
      new CellInfo(p2PointsPct.toString() + '%', '', getColor(p2PointsPct, p1PointsPct)),
    ]);

    table.push([
      new CellInfo(p1EasyPct.toString() + '%', '', getColor(p1EasyPct, p2EasyPct)),
      new CellInfo(`${easyWin} Easy Wins`),
      new CellInfo(p2EasyPct.toString() + '%', '', getColor(p2EasyPct, p1EasyPct)),
    ]);
    table.push([
      new CellInfo(p1MediumPct.toString() + '%', '', getColor(p1MediumPct, p2MediumPct)), 
      new CellInfo(`${mediumWin} Medium Wins`),
      new CellInfo(p2MediumPct.toString() + '%', '', getColor(p2MediumPct, p1MediumPct)),
    ]);
    table.push([
      new CellInfo(p1HardPct.toString() + '%', '', getColor(p1HardPct, p2HardPct)),
      new CellInfo(`${hardWin} Hard Wins`),
      new CellInfo(p2HardPct.toString() + '%', '', getColor(p2HardPct, p1HardPct)),
    ]);
    
    return table;
  }
  private computeMatchStat(useCurrIdx = false, condensed = false): CellInfo[][] {
    const table = [];
    const idx = useCurrIdx ? this.rallyCtxIdx : this.rallyContexts.length - 1;
    const stat = this.rallyContexts[idx].matchStatBeforeRally;
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
    // Unforced Errors
    const p1UnforcedErrors = stat.getP1NumUnforcedErrors();
    const p2UnforcedErrors = stat.getP2NumUnforcedErrors();
    table.push([
      new CellInfo(p1UnforcedErrors.toString(), '', getColor(p1UnforcedErrors, p2UnforcedErrors)),
      new CellInfo('Unforced Errors'),
      new CellInfo(p2UnforcedErrors.toString(), '', getColor(p2UnforcedErrors, p1UnforcedErrors)),
    ]);
    if (condensed) {
      return table;
    }
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
  private computeCurrentScoreTable(withHistory = false): CellInfo[][] {
    const scoreTable = this.getScoreTable();
    if (!withHistory) {
      return scoreTable;
    }
    const tables = [];
    tables.push(scoreTable);
    tables.push(this.getGameHistory());
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

class CellInfo {
  constructor(
    public text: string = '',
    public color: string = '',
    public textColor: string = '',
    public drawRightBorder = false,
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
