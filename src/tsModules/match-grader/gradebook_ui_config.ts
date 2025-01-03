export class GradebookUiConfig {
  constructor(
    public leftRightArrowMovesVideo: boolean = false,
    public upDownArrowJumpsToStartTime: boolean = false,
    public visibleColumns: ColumnName[] = [
      ColumnName.SERVER,
      ColumnName.SET_SCORE,
      ColumnName.GAME_SCORE,
      ColumnName.START_TIME,
      ColumnName.END_TIME,
      ColumnName.RESULT,
      ColumnName.WINNER_LAST_SHOT,
      ColumnName.LOSER_PREVIOUS_SHOT,
      ColumnName.PLOT,
      ColumnName.WINNER_RISK
    ],
    public spoilerColumns: ColumnName[] = [],
  ) {}
}

export enum ColumnName {
  SERVER,
  SET_SCORE,
  GAME_SCORE,
  START_TIME,
  END_TIME,
  RESULT,
  WINNER_LAST_SHOT,
  LOSER_PREVIOUS_SHOT,
  PLOT,
  WINNER_RISK
};

export const visibleColumnsForWatchMode = [
  ColumnName.SERVER,
  ColumnName.SET_SCORE,
  ColumnName.GAME_SCORE,
  ColumnName.END_TIME,
  ColumnName.PLOT,
  ColumnName.WINNER_RISK,
];

export const spoilerColumnsForWatchMode = [
  ColumnName.END_TIME,
  ColumnName.WINNER_RISK,
];
