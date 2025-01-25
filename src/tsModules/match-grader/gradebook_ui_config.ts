
export class GradebookUiConfig {
  constructor(
    // TODO consider making these non-optional defaults.
    public upDownArrowJumpsToStartTime: boolean = true,
    public moveCursorUpBasedOnVideoTime: boolean = true,
    public useSmartReplayer: boolean = true,

    public leftRightArrowMovesVideo: boolean = false,
    public startFromBeginning = false,
    public hideFutureRallies = false,
    public enableMutation = true,
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
  SERVER = "SERVER",
  SET_SCORE = "SET_SCORE",
  GAME_SCORE = "GAME_SCORE",
  START_TIME = "START_TIME",
  END_TIME = "END_TIME",
  RESULT = "RESULT",
  WINNER_LAST_SHOT = "WINNER_LAST_SHOT",
  LOSER_PREVIOUS_SHOT = "LOSER_PREVIOUS_SHOT",
  PLOT = "PLOT",
  WINNER_RISK = "WINNER_RISK",
};

export const visibleColumnsForWatchMode = [
  ColumnName.SERVER,
  ColumnName.SET_SCORE,
  ColumnName.GAME_SCORE,
  ColumnName.PLOT,
  ColumnName.END_TIME,
  ColumnName.RESULT,
  ColumnName.WINNER_RISK,
];

export const spoilerColumnsForWatchMode = [
  ColumnName.END_TIME,
  ColumnName.RESULT,
  ColumnName.WINNER_RISK,
];
