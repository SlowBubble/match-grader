export class GradebookUiConfig {
  constructor(
    public showOnlyStartTimeForCurrentRally: boolean = false,
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
