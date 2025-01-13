import { Cell, makeOpts } from "./sheet_ui";
import { ColumnName, GradebookUiConfig } from "./gradebook_ui_config";
import { RallyContext } from "./models/rally_context";
import { Time } from "./models/Time";
import { formatSecondsToTimeString } from "./gradebook_util";
import { RallyResult } from "./models/rally";
import { getRiskLevelStr, getShotRatingStr } from "./models/risk_level";

export function genHeaderCol(colName: ColumnName): Cell {
  switch (colName) {
    case ColumnName.SERVER:
      return new Cell('Server');
    case ColumnName.SET_SCORE:
      return new Cell('Set');
    case ColumnName.GAME_SCORE:
      return new Cell('Game Score');
    case ColumnName.START_TIME:
      return new Cell('Start');
    case ColumnName.END_TIME:
      return new Cell('Duration');
    case ColumnName.RESULT:
      return new Cell('Result');
    case ColumnName.WINNER_LAST_SHOT:
      return new Cell(`Winner's`);
    case ColumnName.LOSER_PREVIOUS_SHOT:
      return new Cell(`Loser's`);
    case ColumnName.PLOT:
      return new Cell('Plot');
    case ColumnName.WINNER_RISK:
      return new Cell(`Winner's risk level`);
  }
}

export interface FirstRowData {
  latestRallyCtx: RallyContext;
  latestPlot?: {text: string, isMyPlot: boolean};
  inputStartTime: Time | null;
  setupInputStartTimeBtn: () => void;
  setupInputEndTimeBtn: () => void;
}

export function genFirstRow(data: FirstRowData, config: GradebookUiConfig): Cell[] {
  const score = data.latestRallyCtx.scoreBeforeRally;
  const startTime = data.inputStartTime !== null ?
  formatSecondsToTimeString(data.inputStartTime.ms) :
  `<button id='input-start-time'>(Enter)</button>`;
  const endTime = data.inputStartTime !== null ?
    `<button id='input-end-time'>(Enter)</button>` : '';

  const emptyCell = new Cell('');
  return config.visibleColumns.map(col => {
    switch (col) {
      case ColumnName.SERVER:
        return new Cell('');
      case ColumnName.SET_SCORE:
        return new Cell(data.latestRallyCtx.toGameScoreStr());
      case ColumnName.GAME_SCORE:
        return new Cell(score.toPointsStr(), makeOpts({
        }));
      case ColumnName.START_TIME:
        if (!config.enableMutation) {
          return emptyCell;
        }
        return new Cell(startTime, makeOpts({
        setupFunc: data.setupInputStartTimeBtn,
        }));
      case ColumnName.END_TIME:
        if (!config.enableMutation) {
          return emptyCell;
        }
        return new Cell(endTime, makeOpts({
          setupFunc: data.setupInputEndTimeBtn,
        }));
      case ColumnName.PLOT:
        return new Cell(data.latestPlot?.text, makeOpts({
          alignRight: !data.latestPlot?.isMyPlot}));
      default:
        return emptyCell;
    }
  });
}

export interface RallyRowData {
  prevRallyCtx: RallyContext | null;
  rallyCtx: RallyContext;
  myName: string;
  oppoName: string;
  plot?: {text: string, isMyPlot: boolean};
  revealSpoiler?: boolean;
}

export function genRallyRow(data: RallyRowData, config: GradebookUiConfig): Cell[] {
  const rally = data.rallyCtx.rally;
  const score = data.rallyCtx.scoreBeforeRally;
  let prevRallyIsPoint = true;
  if (data.prevRallyCtx) {
    const prevRallyIsDoubleFault = data.prevRallyCtx.isDoubleFault();
    prevRallyIsPoint = (
      prevRallyIsDoubleFault || data.prevRallyCtx.rally.result === RallyResult.PtServer
      || data.prevRallyCtx.rally.result === RallyResult.PtReturner);
  }
  const rallyIsDoubleFault = data.rallyCtx.isDoubleFault();
  const winnerIsMe = (rally.isMyServe && rally.result === RallyResult.PtServer) ||
    (!rally.isMyServe && (rally.result === RallyResult.PtReturner || rallyIsDoubleFault));

  const server = rally.isMyServe ? data.myName :
    `${"".padStart(data.myName.length, "_")}${data.oppoName}`;

  return config.visibleColumns.map((col) => {
    if (!data.revealSpoiler && config.spoilerColumns.includes(col)) {
      return new Cell('?');
    } 
    switch (col) {
      case ColumnName.SERVER:
        return new Cell(
          prevRallyIsPoint ? server : '', 
          makeOpts({ removeBottomBorder: !prevRallyIsPoint }));
      case ColumnName.SET_SCORE:
        return new Cell(data.rallyCtx.toGameScoreStr(), 
          makeOpts({ removeBottomBorder: !prevRallyIsPoint }));
      case ColumnName.GAME_SCORE:
        return new Cell(prevRallyIsPoint ? score.toPointsStr() : '', 
          makeOpts({ removeBottomBorder: !prevRallyIsPoint }));
      case ColumnName.START_TIME:
        return new Cell(formatSecondsToTimeString(rally.startTime.ms));
      case ColumnName.END_TIME:
        return new Cell(rally.getDurationStr());
      case ColumnName.RESULT:
        return new Cell(
          // !config.enableMutation || data.rallyIdx > 0 ? data.rallyCtx.getResultSymbolStr() : 
            data.rallyCtx.getResultStr(data.myName, data.oppoName),
          makeOpts({ alignCenter: true }));
      case ColumnName.WINNER_LAST_SHOT:
        return new Cell(getShotRatingStr(true, data.rallyCtx),
          makeOpts({ alignRight: !winnerIsMe, removeBottomBorder: !prevRallyIsPoint }));
      case ColumnName.LOSER_PREVIOUS_SHOT:
        return new Cell(getShotRatingStr(false, data.rallyCtx),
          makeOpts({ alignRight: winnerIsMe, removeBottomBorder: !prevRallyIsPoint }));
      case ColumnName.PLOT:
        return new Cell(data.plot?.text,
          makeOpts({ alignRight: !data.plot?.isMyPlot, removeBottomBorder: !prevRallyIsPoint }));
      case ColumnName.WINNER_RISK:
        return new Cell(getRiskLevelStr(data.rallyCtx),
          makeOpts({ alignRight: !winnerIsMe, removeBottomBorder: !prevRallyIsPoint }));
      default:
        return new Cell('');
    }
  }).map(cell => {
    cell.data = rally;
    return cell;
  });
}
