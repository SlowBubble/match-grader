import { Cell, makeOpts } from "./match_sheet_ui";
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
  cursorAtTop: boolean;
  setupInputStartTimeBtn: () => void;
  setupInputEndTimeBtn: () => void;
}

export function genFirstRow(data: FirstRowData, config: GradebookUiConfig): Cell[] {
  const score = data.latestRallyCtx.scoreBeforeRally;
  const hasInputStartTime = data.inputStartTime !== null;
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
          selected: data.cursorAtTop && !config.enableMutation,
        }));
      case ColumnName.START_TIME:
        if (!config.enableMutation) {
          return emptyCell;
        }
        return new Cell(startTime, makeOpts({
        setupFunc: data.setupInputStartTimeBtn,
        selected: data.cursorAtTop && !hasInputStartTime,
        }));
      case ColumnName.END_TIME:
        if (!config.enableMutation) {
          return emptyCell;
        }
        return new Cell(endTime, makeOpts({
          setupFunc: data.setupInputEndTimeBtn,
          selected: data.cursorAtTop && hasInputStartTime,
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
  rallyIdx: number;
  cursor: {rallyIdx: number, colIdx: number};
  plot?: {text: string, isMyPlot: boolean};
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

  const isSpoilerRow = data.rallyIdx <= data.cursor.rallyIdx;
  return config.visibleColumns.map((col, colIdx) => {
    const selected = (data.rallyIdx === data.cursor.rallyIdx) && (colIdx === data.cursor.colIdx);
    if (isSpoilerRow && config.spoilerColumns.includes(col)) {
      return new Cell('???', makeOpts({ selected: selected }));
    } 
    switch (col) {
      case ColumnName.SERVER:
        return new Cell(
          prevRallyIsPoint ? server : '', 
          makeOpts({ removeBottomBorder: !prevRallyIsPoint, selected }));
      case ColumnName.SET_SCORE:
        return new Cell(data.rallyCtx.toGameScoreStr(), 
          makeOpts({ removeBottomBorder: !prevRallyIsPoint, selected }));
      case ColumnName.GAME_SCORE:
        return new Cell(prevRallyIsPoint ? score.toPointsStr() : '', 
          makeOpts({ removeBottomBorder: !prevRallyIsPoint, selected }));
      case ColumnName.START_TIME:
        return new Cell(formatSecondsToTimeString(rally.startTime.ms),
          makeOpts({ selected }));
      case ColumnName.END_TIME:
        return new Cell(rally.getDurationStr(),
          makeOpts({ alignRight: true, selected }));
      case ColumnName.RESULT:
        return new Cell(
          !config.enableMutation || data.rallyIdx > 0 ? data.rallyCtx.getResultSymbolStr() : 
            data.rallyCtx.getResultStr(data.myName, data.oppoName),
          makeOpts({ alignCenter: true, selected }));
      case ColumnName.WINNER_LAST_SHOT:
        return new Cell(getShotRatingStr(true, data.rallyCtx),
          makeOpts({ alignRight: !winnerIsMe, removeBottomBorder: !prevRallyIsPoint, selected }));
      case ColumnName.LOSER_PREVIOUS_SHOT:
        return new Cell(getShotRatingStr(false, data.rallyCtx),
          makeOpts({ alignRight: winnerIsMe, removeBottomBorder: !prevRallyIsPoint, selected }));
      case ColumnName.PLOT:
        return new Cell(data.plot?.text,
          makeOpts({ alignRight: !data.plot?.isMyPlot, removeBottomBorder: !prevRallyIsPoint, selected }));
      case ColumnName.WINNER_RISK:
        return new Cell(getRiskLevelStr(data.rallyCtx),
          makeOpts({ alignRight: !winnerIsMe, removeBottomBorder: !prevRallyIsPoint, selected }));
      default:
        return new Cell('', makeOpts({ selected }));
    }
  });
}
